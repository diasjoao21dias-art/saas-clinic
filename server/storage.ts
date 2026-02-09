import { db } from "./db";
import { 
  users, patients, appointments, medicalRecords, clinics,
  type User, type InsertUser, type Patient, type InsertPatient,
  type Appointment, type InsertAppointment, type MedicalRecord, type InsertMedicalRecord,
  type Clinic
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByClinic(clinicId: number, role?: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;

  // Patients
  getPatients(clinicId: number, search?: string): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;

  // Appointments
  getAppointments(clinicId: number, filters?: { date?: string; doctorId?: number; status?: string }): Promise<(Appointment & { patient: Patient; doctor: User })[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;

  // Medical Records
  getMedicalRecords(patientId: number): Promise<(MedicalRecord & { doctor: User })[]>;
  getMedicalRecord(id: number): Promise<MedicalRecord | undefined>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: number, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord>;
  
  // Clinics
  getClinic(id: number): Promise<Clinic | undefined>;
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

  async getAppointments(clinicId: number, filters?: { date?: string; doctorId?: number; status?: string }): Promise<(Appointment & { patient: Patient; doctor: User })[]> {
    const conditions = [eq(appointments.clinicId, clinicId), sql`${appointments.status} != 'cancelado'`];
    
    if (filters?.date) conditions.push(eq(appointments.date, filters.date));
    if (filters?.doctorId) conditions.push(eq(appointments.doctorId, filters.doctorId));
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

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment> {
    const [updated] = await db.update(appointments).set({ status }).where(eq(appointments.id, id)).returning();
    return updated;
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
    const [newRecord] = await db.insert(medicalRecords).values(record).returning();
    return newRecord;
  }

  async updateMedicalRecord(id: number, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord> {
    // @ts-ignore - vitals type mismatch in drizzle-zod vs drizzle-orm
    const [updated] = await db.update(medicalRecords).set(record).where(eq(medicalRecords.id, id)).returning();
    return updated;
  }

  async getClinic(id: number): Promise<Clinic | undefined> {
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id));
    return clinic;
  }
}

export const storage = new DatabaseStorage();
