import { 
  db 
} from "./db";
import { 
  users, patients, appointments, medicalRecords, clinics, availabilityExceptions,
  inventory, inventoryTransactions, tissBills, digitalSignatures,
  type User, type InsertUser, type Patient, type InsertPatient,
  type Appointment, type InsertAppointment, type MedicalRecord, type InsertMedicalRecord,
  type Clinic, type InsertClinic, type AvailabilityException, type InsertAvailabilityException,
  type Inventory, type InsertInventory, type InventoryTransaction, type InsertInventoryTransaction,
  type TissBill, type InsertTissBill, type DigitalSignature, type InsertDigitalSignature
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByClinic(clinicId: number, role?: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Patients
  getPatients(clinicId: number, search?: string): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;

  // Appointments
  getAppointments(clinicId: number, filters?: { date?: string; startDate?: string; endDate?: string; doctorId?: number; status?: string }): Promise<(Appointment & { patient: Patient; doctor: User })[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string, paymentDetails?: { method?: string, status?: string, price?: number, type?: string, examType?: string }): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;

  // Availability
  getAvailabilityExceptions(clinicId: number, doctorId?: number, date?: string): Promise<AvailabilityException[]>;
  createAvailabilityException(exception: InsertAvailabilityException): Promise<AvailabilityException>;
  deleteAvailabilityException(id: number): Promise<void>;
  checkAvailability(clinicId: number, doctorId: number, date: string): Promise<boolean>;

  // Medical Records
  getMedicalRecords(patientId: number): Promise<(MedicalRecord & { doctor: User })[]>;
  getMedicalRecord(id: number): Promise<MedicalRecord | undefined>;
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

  // Clinics
  getClinics(): Promise<Clinic[]>;
  getClinic(id: number): Promise<Clinic | undefined>;
  createClinic(clinic: InsertClinic): Promise<Clinic>;
  updateClinic(id: number, clinic: Partial<InsertClinic>): Promise<Clinic>;
  deleteClinic(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUsersByClinic(clinicId: number, role?: string): Promise<User[]> {
    let query = db.select().from(users).where(eq(users.clinicId, clinicId));
    if (role) {
      query = db.select().from(users).where(and(eq(users.clinicId, clinicId), eq(users.role, role)));
    }
    return await query;
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
      return await db.select().from(patients).where(
        and(
          eq(patients.clinicId, clinicId),
          sql`LOWER(${patients.name}) LIKE ${`%${search.toLowerCase()}%`}`
        )
      );
    }
    return await db.select().from(patients).where(eq(patients.clinicId, clinicId));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
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

  async getAppointments(clinicId: number, filters?: { date?: string; startDate?: string; endDate?: string; doctorId?: number; patientId?: number; status?: string }): Promise<(Appointment & { patient: Patient; doctor: User })[]> {
    const conditions = [eq(appointments.clinicId, clinicId), sql`${appointments.status} != 'cancelado'`];
    
    if (filters?.date) {
      conditions.push(eq(appointments.date, filters.date));
    } else if (filters?.startDate && filters?.endDate) {
      conditions.push(sql`${appointments.date} >= ${filters.startDate}`);
      conditions.push(sql`${appointments.date} <= ${filters.endDate}`);
    }
    
    if (filters?.doctorId) conditions.push(eq(appointments.doctorId, filters.doctorId));
    if (filters?.patientId) conditions.push(eq(appointments.patientId, filters.patientId));
    if (filters?.status) conditions.push(eq(appointments.status, filters.status));

    const result = await db.select({
      appointment: appointments,
      patient: patients,
      doctor: users,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(users, eq(appointments.doctorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(appointments.date), desc(appointments.startTime));

    return result.map(row => ({
      ...row.appointment,
      patient: row.patient,
      doctor: row.doctor
    }));
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async deleteAppointment(id: number): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    const [updated] = await db.update(appointments).set(appointment).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async updateAppointmentStatus(id: number, status: string, paymentDetails?: { method?: string, status?: string, price?: number, type?: string, examType?: string }): Promise<Appointment> {
    const updateData: any = { status };
    if (paymentDetails) {
      if (paymentDetails.method) updateData.paymentMethod = paymentDetails.method;
      if (paymentDetails.status) updateData.paymentStatus = paymentDetails.status;
      if (paymentDetails.price !== undefined) updateData.price = Math.round(paymentDetails.price * 100);
      if (paymentDetails.type) updateData.type = paymentDetails.type;
      if (paymentDetails.examType) updateData.examType = paymentDetails.examType;
    }
    
    const [updated] = await db.update(appointments).set(updateData).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async getAvailabilityExceptions(clinicId: number, doctorId?: number, date?: string): Promise<AvailabilityException[]> {
    const conditions = [eq(availabilityExceptions.clinicId, clinicId)];
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
    if (exceptions.length > 0) {
      return exceptions[0].isAvailable;
    }
    return true;
  }

  async getMedicalRecords(patientId: number): Promise<(MedicalRecord & { doctor: User })[]> {
    const result = await db.select({
      record: medicalRecords,
      doctor: users,
    })
    .from(medicalRecords)
    .innerJoin(users, eq(medicalRecords.doctorId, users.id))
    .where(eq(medicalRecords.patientId, patientId))
    .orderBy(desc(medicalRecords.createdAt));

    return result.map(row => ({
      ...row.record,
      doctor: row.doctor
    }));
  }

  async getMedicalRecord(id: number): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id));
    return record;
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const [newRecord] = await db.insert(medicalRecords).values(record as any).returning();
    return newRecord;
  }

  async updateMedicalRecord(id: number, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord> {
    const [updated] = await db.update(medicalRecords).set(record as any).where(eq(medicalRecords.id, id)).returning();
    return updated;
  }

  // Inventory
  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
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

  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const [newTx] = await db.insert(inventoryTransactions).values(transaction).returning();
    // Update quantity
    const [item] = await db.select().from(inventory).where(eq(inventory.id, transaction.inventoryId));
    if (item) {
      const newQty = transaction.type === 'entrada' ? item.quantity + transaction.quantity : item.quantity - transaction.quantity;
      await db.update(inventory).set({ quantity: newQty }).where(eq(inventory.id, item.id));
    }
    return newTx;
  }

  // TISS
  async getTissBills(clinicId: number): Promise<TissBill[]> {
    return await db.select().from(tissBills).where(eq(tissBills.clinicId, clinicId));
  }

  async createTissBill(bill: InsertTissBill): Promise<TissBill> {
    const [newBill] = await db.insert(tissBills).values(bill).returning();
    return newBill;
  }

  // Digital Signature
  async createDigitalSignature(signature: InsertDigitalSignature): Promise<DigitalSignature> {
    const [newSig] = await db.insert(digitalSignatures).values(signature).returning();
    return newSig;
  }

  async getSignaturesByRecord(recordId: number): Promise<DigitalSignature[]> {
    return await db.select().from(digitalSignatures).where(eq(digitalSignatures.medicalRecordId, recordId));
  }

  async getClinic(id: number): Promise<Clinic | undefined> {
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id));
    return clinic;
  }

  async getClinics(): Promise<Clinic[]> {
    return await db.select().from(clinics).orderBy(desc(clinics.createdAt));
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
