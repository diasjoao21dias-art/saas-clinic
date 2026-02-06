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
    res.status(401).json({ message: "Unauthorized" });
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
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
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
    const patient = await storage.getPatient(Number(req.params.id));
    if (!patient) return res.status(404).json({ message: "Patient not found" });
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
    const updated = await storage.updatePatient(Number(req.params.id), req.body);
    res.json(updated);
  });

  // Appointments
  app.get(api.appointments.list.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const clinicId = req.user!.clinicId;
    const appointments = await storage.getAppointments(clinicId, {
      date: req.query.date as string,
      doctorId: req.query.doctorId ? Number(req.query.doctorId) : undefined,
      status: req.query.status as string,
    });
    res.json(appointments);
  });

  app.post(api.appointments.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.appointments.create.input.parse(req.body);
      const appointment = await storage.createAppointment({
        ...input,
        // @ts-ignore
        clinicId: req.user!.clinicId,
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
    const updated = await storage.updateAppointment(Number(req.params.id), req.body);
    res.json(updated);
  });

  app.patch(api.appointments.updateStatus.path, requireAuth, async (req, res) => {
    const { status } = req.body;
    const updated = await storage.updateAppointmentStatus(Number(req.params.id), status);
    res.json(updated);
  });

  // Medical Records
  app.get(api.medicalRecords.listByPatient.path, requireAuth, async (req, res) => {
    const records = await storage.getMedicalRecords(Number(req.params.patientId));
    res.json(records);
  });

  app.get(api.medicalRecords.get.path, requireAuth, async (req, res) => {
    const record = await storage.getMedicalRecord(Number(req.params.id));
    if (!record) return res.status(404).json({ message: "Record not found" });
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
        await storage.updateAppointmentStatus(input.appointmentId, 'completed');
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
    const updated = await storage.updateMedicalRecord(Number(req.params.id), req.body);
    res.json(updated);
  });

  // SEED DATA
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingUser = await storage.getUserByUsername("admin");
  if (!existingUser) {
    console.log("Seeding database...");
    
    // Create Clinic
    const [clinic] = await db.insert(clinics).values({
      name: "HealthOne Clinic",
      address: "123 Medical Blvd",
      phone: "555-0123",
      subscriptionStatus: "active"
    }).returning();

    // Create Users
    await storage.createUser({
      username: "admin",
      password: "password123", // In real app, hash this
      name: "System Administrator",
      role: "admin",
      clinicId: clinic.id
    });

    const doctor = await storage.createUser({
      username: "doctor",
      password: "password123",
      name: "Dr. Gregory House",
      role: "doctor",
      specialty: "Diagnostician",
      clinicId: clinic.id
    });

    await storage.createUser({
      username: "operator",
      password: "password123",
      name: "Pam Beesly",
      role: "operator",
      clinicId: clinic.id
    });

    // Create Patients
    const patient1 = await storage.createPatient({
      name: "John Doe",
      birthDate: "1980-05-15",
      phone: "555-5555",
      email: "john@example.com",
      gender: "Male",
      address: "456 Lane",
      clinicId: clinic.id,
      cpf: "123.456.789-00"
    });

    // Create Appointments
    await storage.createAppointment({
      patientId: patient1.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      date: new Date().toISOString().split('T')[0], // Today
      startTime: "09:00",
      duration: 30,
      status: "scheduled",
      notes: "Routine checkup"
    });

    console.log("Seeding complete!");
  }
}
