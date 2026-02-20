import { 
  db 
} from "./db";
import { 
  users, patients, appointments, medicalRecords, clinics, availabilityExceptions,
  inventory, inventoryTransactions, tissBills, digitalSignatures, medicalRecordLogs,
  type User, type InsertUser, type Patient, type InsertPatient,
  type Appointment, type InsertAppointment, type MedicalRecord, type InsertMedicalRecord,
  type Clinic, type InsertClinic, type AvailabilityException, type InsertAvailabilityException,
  type Inventory, type InsertInventory, type InventoryTransaction, type InsertInventoryTransaction,
  type TissBill, type InsertTissBill, type DigitalSignature, type InsertDigitalSignature,
  type MedicalRecordLog, type InsertMedicalRecordLog,
  type MedicalRecordWithDetails
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByClinic(clinicId: number, role?: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Patients
  getPatients(clinicId: number, search?: string): Promise<Patient[]>;
  getPatient(id: number, clinicId: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;

  // Appointments
  getAppointments(clinicId: number, filters?: { date?: string; startDate?: string; endDate?: string; doctorId?: number; status?: string; patientId?: number }): Promise<(Appointment & { patient: Patient; doctor: User })[]>;
  getAppointment(id: number, clinicId: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, clinicId: number, appointment: Partial<Appointment>): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string, paymentDetails?: { method?: string, status?: string, price?: number, type?: string, examType?: string }): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;

  // Availability
  getAvailabilityExceptions(clinicId: number, doctorId?: number, date?: string): Promise<AvailabilityException[]>;
  createAvailabilityException(exception: InsertAvailabilityException): Promise<AvailabilityException>;
  deleteAvailabilityException(id: number): Promise<void>;
  checkAvailability(clinicId: number, doctorId: number, date: string): Promise<boolean>;

  // Medical Records
  getMedicalRecords(patientId: number, clinicId: number): Promise<MedicalRecordWithDetails[]>;
  getMedicalRecord(id: number, clinicId: number): Promise<MedicalRecordWithDetails | undefined>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: number, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord>;
  
  // Inventory
  getInventory(clinicId: number): Promise<Inventory[]>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory>;
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;

  // TISS
  getTissBills(clinicId: number): Promise<TissBill[]>;
  createTissBill(bill: InsertTissBill): Promise<TissBill>;

  // Digital Signature
  createDigitalSignature(signature: InsertDigitalSignature): Promise<DigitalSignature>;
  getSignaturesByRecord(recordId: number): Promise<DigitalSignature[]>;

  // Triage
  updateTriage(appointmentId: number, triageData: any): Promise<Appointment>;
  updateAppointmentAI(id: number, data: { aiSummary?: string, followUpTasks?: string[] }): Promise<Appointment>;
  // Audit Logs
  createMedicalRecordLog(log: InsertMedicalRecordLog): Promise<MedicalRecordLog>;
  getMedicalRecordLogs(medicalRecordId: number): Promise<MedicalRecordLog[]>;

  // Clinics
  getClinics(): Promise<Clinic[]>;
  getClinic(id: number): Promise<Clinic | undefined>;
  createClinic(clinic: InsertClinic): Promise<Clinic>;
  updateClinic(id: number, clinic: Partial<InsertClinic>): Promise<Clinic>;
  deleteClinic(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUsersByClinic(clinicId: number, role?: string): Promise<User[]> {
    if (role) {
      return await db.select().from(users).where(and(eq(users.clinicId, clinicId), eq(users.role, role)));
    }
    return await db.select().from(users).where(eq(users.clinicId, clinicId));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getPatients(clinicId: number, search?: string): Promise<Patient[]> {
    if (search) {
      return await db.select().from(patients).where(and(eq(patients.clinicId, clinicId), sql`name LIKE ${'%' + search + '%'}`));
    }
    return await db.select().from(patients).where(eq(patients.clinicId, clinicId));
  }

  async getPatient(id: number, clinicId: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(and(eq(patients.id, id), eq(patients.clinicId, clinicId)));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient> {
    const [updated] = await db.update(patients).set(patient).where(eq(patients.id, id)).returning();
    return updated;
  }

  async getAppointments(clinicId: number, filters?: { date?: string; startDate?: string; endDate?: string; doctorId?: number; status?: string; patientId?: number }): Promise<(Appointment & { patient: Patient; doctor: User })[]> {
    let conditions = [eq(appointments.clinicId, clinicId)];
    
    if (filters?.date) {
      conditions.push(eq(appointments.date, filters.date));
    } else if (filters?.startDate && filters?.endDate) {
      conditions.push(sql`date >= ${filters.startDate} AND date <= ${filters.endDate}`);
    }

    if (filters?.doctorId) {
      conditions.push(eq(appointments.doctorId, filters.doctorId));
    }

    if (filters?.patientId) {
      conditions.push(eq(appointments.patientId, filters.patientId));
    }

    if (filters?.status) {
      conditions.push(eq(appointments.status, filters.status));
    }

    const results = await db.select().from(appointments).where(and(...conditions));
    const enriched = await Promise.all(results.map(async (apt) => {
      const [patient] = await db.select().from(patients).where(eq(patients.id, apt.patientId));
      const [doctor] = await db.select().from(users).where(eq(users.id, apt.doctorId));
      return { ...apt, patient, doctor } as (Appointment & { patient: Patient; doctor: User });
    }));

    return enriched;
  }

  async getAppointment(id: number, clinicId: number): Promise<Appointment | undefined> {
    const [apt] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.clinicId, clinicId)));
    return apt;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newApt] = await db.insert(appointments).values(appointment as any).returning();
    return newApt;
  }

  async updateAppointment(id: number, clinicId: number, appointment: Partial<Appointment>): Promise<Appointment> {
    const [updated] = await db.update(appointments)
      .set(appointment)
      .where(and(eq(appointments.id, id), eq(appointments.clinicId, clinicId)))
      .returning();
    return updated;
  }

  async updateAppointmentAI(id: number, data: { aiSummary?: string, followUpTasks?: string[], notificationSent?: boolean }): Promise<Appointment> {
    const [updated] = await db.update(appointments)
      .set(data as any)
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  async getPriorityAppointments(clinicId: number, date: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.date, date),
        sql`status != 'cancelado'`
      ))
      .orderBy(desc(appointments.priority));
  }

  async updateAppointmentStatus(id: number, status: string, paymentDetails?: { method?: string, status?: string, price?: number }): Promise<Appointment> {
    const updateData: any = { status };
    if (paymentDetails?.method) updateData.paymentMethod = paymentDetails.method;
    if (paymentDetails?.status) updateData.paymentStatus = paymentDetails.status;
    if (paymentDetails?.price) updateData.price = paymentDetails.price;

    const [updated] = await db.update(appointments).set(updateData).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async deleteAppointment(id: number): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  async getAvailabilityExceptions(clinicId: number, doctorId?: number, date?: string): Promise<AvailabilityException[]> {
    let conditions = [eq(availabilityExceptions.clinicId, clinicId)];
    if (doctorId) conditions.push(eq(availabilityExceptions.doctorId, doctorId));
    if (date) conditions.push(eq(availabilityExceptions.date, date));
    
    return await db.select().from(availabilityExceptions).where(and(...conditions));
  }

  async createAvailabilityException(exception: InsertAvailabilityException): Promise<AvailabilityException> {
    const [newEx] = await db.insert(availabilityExceptions).values(exception).returning();
    return newEx;
  }

  async deleteAvailabilityException(id: number): Promise<void> {
    await db.delete(availabilityExceptions).where(eq(availabilityExceptions.id, id));
  }

  async checkAvailability(clinicId: number, doctorId: number, date: string): Promise<boolean> {
    const exceptions = await this.getAvailabilityExceptions(clinicId, doctorId, date);
    const blocked = exceptions.some(ex => !ex.isAvailable);
    return !blocked;
  }

  async getMedicalRecords(patientId: number, clinicId: number): Promise<MedicalRecordWithDetails[]> {
    const records = await db.select().from(medicalRecords).where(and(eq(medicalRecords.patientId, patientId), eq(medicalRecords.clinicId, clinicId))).orderBy(desc(medicalRecords.createdAt));
    return await Promise.all(records.map(async (r) => {
      const [patient] = await db.select().from(patients).where(eq(patients.id, r.patientId));
      const [doctor] = await db.select().from(users).where(eq(users.id, r.doctorId));
      return { ...r, patient, doctor } as MedicalRecordWithDetails;
    }));
  }

  async getMedicalRecord(id: number, clinicId: number): Promise<MedicalRecordWithDetails | undefined> {
    const [record] = await db.select().from(medicalRecords).where(and(eq(medicalRecords.id, id), eq(medicalRecords.clinicId, clinicId)));
    if (!record) return undefined;
    const [patient] = await db.select().from(patients).where(eq(patients.id, record.patientId));
    const [doctor] = await db.select().from(users).where(eq(users.id, record.doctorId));
    return { ...record, patient, doctor } as MedicalRecordWithDetails;
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const [newRecord] = await db.insert(medicalRecords).values(record as any).returning();
    await this.createMedicalRecordLog({
      medicalRecordId: newRecord.id,
      userId: record.doctorId,
      action: record.status === 'rascunho' ? 'draft' : 'create',
      changes: record
    });
    return newRecord;
  }

  async updateMedicalRecord(id: number, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord> {
    const [updated] = await db.update(medicalRecords).set(record as any).where(eq(medicalRecords.id, id)).returning();
    await this.createMedicalRecordLog({
      medicalRecordId: id,
      userId: updated.doctorId,
      action: 'update',
      changes: record
    });
    return updated;
  }

  async getInventory(clinicId: number): Promise<Inventory[]> {
    return await db.select().from(inventory).where(eq(inventory.clinicId, clinicId));
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const [newItem] = await db.insert(inventory).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory> {
    const [updated] = await db.update(inventory).set(item).where(eq(inventory.id, id)).returning();
    return updated;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const [newTx] = await db.insert(inventoryTransactions).values(transaction).returning();
    const [item] = await db.select().from(inventory).where(eq(inventory.id, transaction.inventoryId));
    if (item) {
      const newQty = transaction.type === 'entrada' ? item.quantity + transaction.quantity : item.quantity - transaction.quantity;
      await db.update(inventory).set({ quantity: newQty }).where(eq(inventory.id, item.id));
    }
    return newTx;
  }

  async getTissBills(clinicId: number): Promise<TissBill[]> {
    return await db.select().from(tissBills).where(eq(tissBills.clinicId, clinicId));
  }

  async createTissBill(bill: InsertTissBill): Promise<TissBill> {
    const [newBill] = await db.insert(tissBills).values(bill).returning();
    return newBill;
  }

  async createDigitalSignature(signature: InsertDigitalSignature): Promise<DigitalSignature> {
    const [newSig] = await db.insert(digitalSignatures).values(signature).returning();
    return newSig;
  }

  async getSignaturesByRecord(recordId: number): Promise<DigitalSignature[]> {
    return await db.select().from(digitalSignatures).where(eq(digitalSignatures.medicalRecordId, recordId));
  }

  async updateTriage(appointmentId: number, triageData: any): Promise<Appointment> {
    const [updated] = await db.update(appointments)
      .set({ triageData: triageData as any, triageDone: true, status: 'presente' })
      .where(eq(appointments.id, appointmentId))
      .returning();
    return updated;
  }

  async createMedicalRecordLog(log: InsertMedicalRecordLog): Promise<MedicalRecordLog> {
    const [newLog] = await db.insert(medicalRecordLogs).values(log).returning();
    return newLog;
  }

  async getMedicalRecordLogs(medicalRecordId: number): Promise<MedicalRecordLog[]> {
    return await db.select().from(medicalRecordLogs)
      .where(eq(medicalRecordLogs.medicalRecordId, medicalRecordId))
      .orderBy(desc(medicalRecordLogs.createdAt));
  }

  async getClinics(): Promise<Clinic[]> {
    return await db.select().from(clinics).orderBy(desc(clinics.createdAt));
  }

  async getClinic(id: number): Promise<Clinic | undefined> {
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id));
    return clinic;
  }

  async createClinic(clinic: InsertClinic): Promise<Clinic> {
    const [newClinic] = await db.insert(clinics).values(clinic).returning();
    return newClinic;
  }

  async updateClinic(id: number, clinic: Partial<InsertClinic>): Promise<Clinic> {
    const [updated] = await db.update(clinics).set(clinic).where(eq(clinics.id, id)).returning();
    return updated;
  }

  async deleteClinic(id: number): Promise<void> {
    await db.delete(clinics).where(eq(clinics.id, id));
  }
}

export const storage = new DatabaseStorage();
