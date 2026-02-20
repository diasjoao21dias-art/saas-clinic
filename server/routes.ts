import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { clinics, users, patients } from "@shared/schema";
import { db } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth (Passport)
  setupAuth(app);

  // Middleware to enforce auth
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Não autorizado" });
  };

  // === API IMPLEMENTATION ===

  // Users
  app.get(api.users.list.path, requireAuth, async (req, res) => {
    const role = req.query.role as string | undefined;
    // @ts-ignore
    const clinicId = req.user!.clinicId;
    const users = await storage.getUsersByClinic(clinicId, role);
    res.json(users);
  });

  app.get(api.users.get.path, requireAuth, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json(user);
  });

  app.post(api.users.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      // @ts-ignore
      const user = await storage.createUser({
        ...input,
        clinicId: (req.user as any)!.clinicId,
      });
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.users.update.path, requireAuth, async (req, res) => {
    try {
      // @ts-ignore
      const clinicId = req.user!.clinicId;
      const user = await storage.getUser(Number(req.params.id));
      if (!user || user.clinicId !== clinicId) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      const updated = await storage.updateUser(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  app.delete(api.users.delete.path, requireAuth, async (req, res) => {
    try {
      // @ts-ignore
      const clinicId = req.user!.clinicId;
      const user = await storage.getUser(Number(req.params.id));
      if (!user || user.clinicId !== clinicId) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      await storage.deleteUser(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  // Patients
  app.get(api.patients.list.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const clinicId = req.user!.clinicId;
    const search = req.query.search as string | undefined;
    const patients = await storage.getPatients(clinicId, search);
    res.json(patients);
  });

  app.get(api.patients.get.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const clinicId = req.user!.clinicId;
    const patient = await storage.getPatient(Number(req.params.id), clinicId);
    if (!patient) return res.status(404).json({ message: "Paciente não encontrado" });
    res.json(patient);
  });

  app.post(api.patients.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.patients.create.input.parse(req.body);
      const patient = await storage.createPatient({
        ...input,
        // @ts-ignore
        clinicId: req.user!.clinicId,
      });
      res.status(201).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.patients.update.path, requireAuth, async (req, res) => {
    try {
      // @ts-ignore
      const clinicId = req.user!.clinicId;
      const patient = await storage.getPatient(Number(req.params.id), clinicId);
      if (!patient) return res.status(404).json({ message: "Paciente não encontrado" });

      const input = api.patients.update.input.parse(req.body);
      const updated = await storage.updatePatient(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erro ao atualizar paciente" });
    }
  });

  // Appointments
  app.get(api.appointments.list.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const clinicId = req.user!.clinicId;
    const appointments = await storage.getAppointments(clinicId, {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      date: req.query.date as string,
      doctorId: req.query.doctorId ? Number(req.query.doctorId) : undefined,
      patientId: req.query.patientId ? Number(req.query.patientId) : undefined,
      status: req.query.status as string,
    });
    res.json(appointments);
  });

  app.post(api.appointments.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.appointments.create.input.parse(req.body);
      // @ts-ignore
      const clinicId = req.user!.clinicId;

      // Check doctor availability for the date
      const isAvailable = await storage.checkAvailability(clinicId, input.doctorId, input.date);
      if (!isAvailable) {
        return res.status(400).json({ message: "A agenda deste médico está fechada para esta data." });
      }

      const duration = input.duration || 30;
      const startTime = input.startTime;
      const [startHour, startMin] = startTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = startMinutes + duration;

      // Check for overlapping appointments
      const existing = await storage.getAppointments(clinicId, {
        date: input.date,
        doctorId: input.doctorId
      });

      const hasConflict = existing.some(apt => {
        const [aptHour, aptMin] = apt.startTime.split(':').map(Number);
        const aptStartMinutes = aptHour * 60 + aptMin;
        const aptEndMinutes = aptStartMinutes + apt.duration;

        return (startMinutes < aptEndMinutes && endMinutes > aptStartMinutes);
      });

      if (hasConflict) {
        return res.status(400).json({ message: "Este horário já está ocupado para este médico." });
      }

      const appointment = await storage.createAppointment({
        ...input,
        clinicId,
      });
      res.status(201).json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.appointments.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = req.body;
      // @ts-ignore
      const clinicId = req.user!.clinicId;

      const currentApt = await storage.getAppointment(id, clinicId);
      if (!currentApt) return res.status(404).json({ message: "Agendamento não encontrado" });

      // Se estiver alterando horário, data ou médico, validar conflitos
      if (input.startTime || input.date || input.doctorId) {
        const appointmentDate = input.date || currentApt.date;
        const doctorId = input.doctorId || currentApt.doctorId;
        const startTime = input.startTime || currentApt.startTime;
        const duration = input.duration || currentApt.duration || 30;

        if (appointmentDate && doctorId && startTime) {
          const existing = await storage.getAppointments(clinicId, {
            date: appointmentDate,
            doctorId: doctorId
          });

          const [startHour, startMin] = startTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = startMinutes + duration;

          const hasConflict = existing.some(apt => {
            if (apt.id === id || apt.status === 'cancelado') return false;
            const [aptHour, aptMin] = apt.startTime.split(':').map(Number);
            const aptStartMinutes = aptHour * 60 + aptMin;
            const aptEndMinutes = aptStartMinutes + apt.duration;

            return (startMinutes < aptEndMinutes && endMinutes > aptStartMinutes);
          });

          if (hasConflict) {
            return res.status(400).json({ message: "Este horário já está ocupado para este médico." });
          }
        }
      }

      const updated = await storage.updateAppointment(id, clinicId, input);
      res.json(updated);
    } catch (err) {
      console.error("Erro ao atualizar agendamento:", err);
      res.status(500).json({ message: "Erro ao atualizar agendamento" });
    }
  });

  app.delete("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      // @ts-ignore
      const clinicId = req.user!.clinicId;
      const apt = await storage.getAppointment(Number(req.params.id), clinicId);
      if (!apt) return res.status(404).json({ message: "Agendamento não encontrado" });

      await storage.deleteAppointment(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir agendamento" });
    }
  });

  app.patch(api.appointments.updateStatus.path, requireAuth, async (req, res) => {
    const { status, paymentMethod, paymentStatus, price, triageData } = req.body;
    // @ts-ignore
    const clinicId = req.user!.clinicId;
    const apt = await storage.getAppointment(Number(req.params.id), clinicId);
    if (!apt) return res.status(404).json({ message: "Agendamento não encontrado" });
    
    if (triageData) {
      const updated = await storage.updateTriage(Number(req.params.id), triageData);
      return res.json(updated);
    }

    const updated = await storage.updateAppointmentStatus(
      Number(req.params.id), 
      status, 
      { method: paymentMethod, status: paymentStatus, price: price ? Math.round(price * 100) : undefined }
    );
    res.json(updated);
  });

  // AI & Automation Endpoints
  app.post("/api/appointments/:id/ai-process", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      // @ts-ignore
      const clinicId = req.user!.clinicId;
      const apt = await storage.getAppointment(id, clinicId);
      if (!apt) return res.status(404).json({ message: "Agendamento não encontrado" });

      const records = await storage.getMedicalRecords(apt.patientId, clinicId);
      const latestRecord = records[0];

      // Simulated AI Processing
      const aiSummary = latestRecord 
        ? `Resumo da última consulta (${latestRecord.createdAt}): ${latestRecord.diagnosis}. Conduta: ${latestRecord.prescription}.`
        : "Nenhum histórico anterior relevante encontrado.";
      
      const followUpTasks = [
        "Verificar exames laboratoriais",
        "Retorno em 30 dias",
        "Monitorar pressão arterial"
      ];

      const updated = await storage.updateAppointmentAI(id, { aiSummary, followUpTasks });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Erro ao processar IA" });
    }
  });

  // Availability Exceptions
  app.get("/api/availability-exceptions", requireAuth, async (req, res) => {
    try {
      // @ts-ignore
      const clinicId = req.user!.clinicId;
      const doctorId = req.query.doctorId ? Number(req.query.doctorId) : undefined;
      const date = req.query.date as string | undefined;
      const exceptions = await storage.getAvailabilityExceptions(clinicId, doctorId, date);
      res.json(exceptions);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar disponibilidade" });
    }
  });

  app.post("/api/availability-exceptions", requireAuth, async (req, res) => {
    try {
      // @ts-ignore
      const clinicId = req.user!.clinicId;
      const { doctorId, date, dates, isAvailable } = req.body;

      if (dates && Array.isArray(dates)) {
        // Bulk creation
        const results = [];
        for (const d of dates) {
          const exception = await storage.createAvailabilityException({
            doctorId,
            date: d,
            isAvailable,
            clinicId,
          });
          results.push(exception);
        }
        return res.status(201).json(results);
      }

      const exception = await storage.createAvailabilityException({
        ...req.body,
        clinicId,
      });
      res.status(201).json(exception);
    } catch (err) {
      res.status(500).json({ message: "Erro ao criar exceção de disponibilidade" });
    }
  });

  app.post("/api/availability-exceptions/bulk-delete", requireAuth, async (req, res) => {
    try {
      // @ts-ignore
      const clinicId = req.user!.clinicId;
      const { doctorId, dates } = req.body;

      if (!dates || !Array.isArray(dates)) {
        return res.status(400).json({ message: "Datas inválidas" });
      }

      for (const d of dates) {
        const exceptions = await storage.getAvailabilityExceptions(clinicId, doctorId, d);
        for (const ex of exceptions) {
          await storage.deleteAvailabilityException(ex.id);
        }
      }
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir exceções de disponibilidade" });
    }
  });

  app.delete("/api/availability-exceptions/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAvailabilityException(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir exceção de disponibilidade" });
    }
  });

  // Medical Records
  app.get(api.medicalRecords.listByPatient.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const clinicId = req.user!.clinicId;
    const records = await storage.getMedicalRecords(Number(req.params.patientId), clinicId);
    res.json(records);
  });

  app.get(api.medicalRecords.get.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const clinicId = req.user!.clinicId;
    const record = await storage.getMedicalRecord(Number(req.params.id), clinicId);
    if (!record) return res.status(404).json({ message: "Registro não encontrado" });
    res.json(record);
  });

  app.post(api.medicalRecords.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.medicalRecords.create.input.parse(req.body);
      // Ensure doctorId matches logged in user if doctor
      // @ts-ignore
      const record = await storage.createMedicalRecord({
        ...input,
        // @ts-ignore
        clinicId: req.user!.clinicId,
      });
      
      // Auto-update appointment status to completed if record is created
      if (input.appointmentId) {
        await storage.updateAppointmentStatus(input.appointmentId, 'finalizado');
      }

      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.medicalRecords.update.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const clinicId = req.user!.clinicId;
    const record = await storage.getMedicalRecord(Number(req.params.id), clinicId);
    if (!record) return res.status(404).json({ message: "Registro não encontrado" });

    const updated = await storage.updateMedicalRecord(Number(req.params.id), req.body);
    res.json(updated);
  });

  // Inventory
  app.get("/api/inventory", requireAuth, async (req, res) => {
    const clinicId = (req.user as any).clinicId;
    const items = await storage.getInventory(clinicId);
    res.json(items);
  });

  app.post("/api/inventory", requireAuth, async (req, res) => {
    const clinicId = (req.user as any).clinicId;
    const item = await storage.createInventoryItem({ ...req.body, clinicId });
    res.status(201).json(item);
  });

  app.delete("/api/inventory/:id", requireAuth, async (req, res) => {
    await storage.deleteInventoryItem(Number(req.params.id));
    res.sendStatus(204);
  });

  app.post("/api/inventory/transaction", requireAuth, async (req, res) => {
    const tx = await storage.createInventoryTransaction(req.body);
    res.status(201).json(tx);
  });

  // TISS
  app.get("/api/tiss", requireAuth, async (req, res) => {
    const clinicId = (req.user as any).clinicId;
    const bills = await storage.getTissBills(clinicId);
    res.json(bills);
  });

  app.post("/api/tiss", requireAuth, async (req, res) => {
    const clinicId = (req.user as any).clinicId;
    const bill = await storage.createTissBill({ ...req.body, clinicId });
    res.status(201).json(bill);
  });

  // Digital Signature
  app.post("/api/medical-records/:id/sign", requireAuth, async (req, res) => {
    const doctorId = (req.user as any).id;
    const recordId = Number(req.params.id);
    const signature = await storage.createDigitalSignature({
      medicalRecordId: recordId,
      doctorId,
      signatureHash: req.body.hash,
      certificateInfo: req.body.certificate,
    });
    res.status(201).json(signature);
  });

  // Clinics
  app.get(api.clinics.list.path, requireAuth, async (req, res) => {
    const clinics = await storage.getClinics();
    res.json(clinics);
  });

  app.get(api.clinics.get.path, requireAuth, async (req, res) => {
    const clinic = await storage.getClinic(Number(req.params.id));
    if (!clinic) return res.status(404).json({ message: "Clínica não encontrada" });
    res.json(clinic);
  });

  app.post(api.clinics.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.clinics.create.input.parse(req.body);
      const clinic = await storage.createClinic(input);
      res.status(201).json(clinic);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.clinics.update.path, requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateClinic(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar clínica" });
    }
  });

  app.delete(api.clinics.delete.path, requireAuth, async (req, res) => {
    try {
      await storage.deleteClinic(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir clínica" });
    }
  });

  // SEED DATA
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingUser = await storage.getUserByUsername("admin");
  if (!existingUser) {
    console.log("Semeando banco de dados...");
    
    // Create Clinic
    const [clinic] = await db.insert(clinics).values({
      name: "Clínica Saúde Total",
      address: "Av. Paulista, 1000",
      phone: "(11) 5555-0123",
      subscriptionStatus: "active"
    }).returning();

    // Create Users
    await storage.createUser({
      username: "superadmin",
      password: "adminpassword",
      name: "Dono do Sistema",
      role: "super_admin",
      clinicId: clinic.id
    });

    await storage.createUser({
      username: "admin",
      password: "password123", // In real app, hash this
      name: "Administrador do Sistema",
      role: "admin",
      clinicId: clinic.id
    });

    const doctor = await storage.createUser({
      username: "doctor",
      password: "password123",
      name: "Dr. Gregory House",
      role: "doctor",
      specialty: "Infectologista",
      clinicId: clinic.id
    });

    await storage.createUser({
      username: "operator",
      password: "password123",
      name: "Ana Oliveira",
      role: "operator",
      clinicId: clinic.id
    });

    // Create Patients
    const patient1 = await storage.createPatient({
      name: "João Silva",
      birthDate: "1980-05-15",
      phone: "(11) 98888-7777",
      email: "joao@exemplo.com",
      gender: "Masculino",
      address: "Rua das Flores, 123",
      clinicId: clinic.id,
      cpf: "123.456.789-00"
    });

    const patient2 = await storage.createPatient({
      name: "Maria Oliveira",
      birthDate: "1992-08-20",
      phone: "(11) 97777-6666",
      email: "maria@exemplo.com",
      gender: "Feminino",
      address: "Av. Brasil, 456",
      clinicId: clinic.id,
      cpf: "987.654.321-99"
    });

    // Create Appointments
    await storage.createAppointment({
      patientId: patient1.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      date: new Date().toISOString().split('T')[0], // Today
      startTime: "09:00",
      duration: 30,
      status: "presente",
      notes: "Consulta de rotina - Hipertensão"
    });

    await storage.createAppointment({
      patientId: patient2.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      date: new Date().toISOString().split('T')[0], // Today
      startTime: "10:30",
      duration: 30,
      status: "presente",
      notes: "Avaliação pré-operatória"
    });

    // Seed Inventory
    await storage.createInventoryItem({
      clinicId: clinic.id,
      name: "Seringa 5ml",
      category: "material",
      unit: "unidade",
      quantity: 50,
      minQuantity: 10,
      pricePerUnit: 50,
    });

    await storage.createInventoryItem({
      clinicId: clinic.id,
      name: "Dipirona 500mg",
      category: "medicamento",
      unit: "caixa",
      quantity: 5,
      minQuantity: 8,
      pricePerUnit: 1200,
    });

    await storage.createUser({
      username: "nurse",
      password: "password123",
      name: "Enf. Clara Santos",
      role: "nurse",
      clinicId: clinic.id
    });

    console.log("Semeio concluído!");
  }
}
