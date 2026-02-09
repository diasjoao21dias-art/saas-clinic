import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  subscriptionStatus: text("subscription_status").default("active").notNull(), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'admin', 'operator', 'doctor'
  specialty: text("specialty"), // For doctors
  clinicId: integer("clinic_id").references(() => clinics.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cpf: text("cpf"),
  birthDate: date("birth_date").notNull(),
  phone: text("phone"),
  email: text("email"),
  gender: text("gender"),
  address: text("address"),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(), // HH:mm
  duration: integer("duration").default(30).notNull(), // minutes
  status: text("status").default("agendado").notNull(), // agendado, confirmado, presente, em_atendimento, finalizado, cancelado
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  
  // Anamnesis
  chiefComplaint: text("chief_complaint"),
  history: text("history"),
  medications: text("medications"),
  allergies: text("allergies"),
  vitals: jsonb("vitals").$type<{
    bloodPressure?: string;
    heartRate?: string;
    temperature?: string;
    weight?: string;
    height?: string;
  }>(),

  // Clinical Evolution
  diagnosis: text("diagnosis"),
  prescription: text("prescription"),
  notes: text("notes"), // Evolution notes
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const availabilityExceptions = pgTable("availability_exceptions", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  date: text("date").notNull(),
  isAvailable: boolean("is_available").default(false).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const clinicsRelations = relations(clinics, ({ many }) => ({
  users: many(users),
  patients: many(patients),
  appointments: many(appointments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [users.clinicId],
    references: [clinics.id],
  }),
  doctorAppointments: many(appointments, { relationName: "doctorAppointments" }),
  recordsAuthored: many(medicalRecords, { relationName: "doctorRecords" }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [patients.clinicId],
    references: [clinics.id],
  }),
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [appointments.doctorId],
    references: [users.id],
    relationName: "doctorAppointments",
  }),
  clinic: one(clinics, {
    fields: [appointments.clinicId],
    references: [clinics.id],
  }),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  appointment: one(appointments, {
    fields: [medicalRecords.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [medicalRecords.doctorId],
    references: [users.id],
    relationName: "doctorRecords",
  }),
}));

// === SCHEMAS ===

export const insertClinicSchema = createInsertSchema(clinics).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true });
export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({ id: true, createdAt: true });
export const insertAvailabilityExceptionSchema = createInsertSchema(availabilityExceptions).omit({ id: true, createdAt: true });

// === EXPLICIT TYPES ===

export type Clinic = typeof clinics.$inferSelect;
export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type AvailabilityException = typeof availabilityExceptions.$inferSelect;
export type InsertAvailabilityException = z.infer<typeof insertAvailabilityExceptionSchema>;

export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type CreateAppointmentRequest = InsertAppointment;
export type UpdateAppointmentRequest = Partial<InsertAppointment>;

// Augmented types for frontend display
export type AppointmentWithDetails = Appointment & {
  patient: Patient;
  doctor: User;
};

export type MedicalRecordWithDetails = MedicalRecord & {
  patient: Patient;
  doctor: User;
};
