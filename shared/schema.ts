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

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'material', 'medicamento', 'equipamento', 'outro'
  unit: text("unit").notNull(), // 'unidade', 'ml', 'mg', 'caixa', 'frasco', 'pacote'
  quantity: integer("quantity").default(0).notNull(),
  minQuantity: integer("min_quantity").default(5).notNull(),
  pricePerUnit: integer("price_per_unit").default(0).notNull(),
  supplier: text("supplier"),
  location: text("location"),
  batchNumber: text("batch_number"),
  expiryDate: date("expiry_date"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").references(() => inventory.id).notNull(),
  type: text("type").notNull(), // 'entrada', 'saida', 'baixa_automatica'
  quantity: integer("quantity").notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tissBills = pgTable("tiss_bills", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  insuranceId: text("insurance_id").notNull(),
  status: text("status").default("pendente").notNull(), // pendente, gerada, enviada, paga
  xmlData: text("xml_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const digitalSignatures = pgTable("digital_signatures", {
  id: serial("id").primaryKey(),
  medicalRecordId: integer("medical_record_id").references(() => medicalRecords.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  signatureHash: text("signature_hash").notNull(),
  certificateInfo: text("certificate_info"),
  signedAt: timestamp("signed_at").defaultNow(),
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
  price: integer("price").default(15000).notNull(), // Valor em centavos (R$ 150,00)
  type: text("type").default("consulta").notNull(), // consulta, retorno, exame
  examType: text("exam_type"), // Ex: Sangue, Raio-X, etc.
  status: text("status").default("agendado").notNull(), // agendado, confirmado, presente, em_atendimento, finalizado, cancelado, remarcado, ausente
  paymentMethod: text("payment_method"), // dinheiro, cartao_credito, cartao_debito, pix, convenio
  paymentStatus: text("payment_status").default("pendente").notNull(), // pendente, pago
  procedure: text("procedure"),
  insurance: text("insurance"),
  isPrivate: boolean("is_private").default(false).notNull(),
  notes: text("notes"),
  triageDone: boolean("triage_done").default(false).notNull(),
  triageData: jsonb("triage_data").$type<{
    weight?: string;
    height?: string;
    bloodPressure?: string;
    temperature?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    notes?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicalRecordLogs = pgTable("medical_record_logs", {
  id: serial("id").primaryKey(),
  medicalRecordId: integer("medical_record_id").references(() => medicalRecords.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'sign'
  changes: jsonb("changes"),
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
  inventory: many(inventory),
  tissBills: many(tissBills),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [inventory.clinicId],
    references: [clinics.id],
  }),
  transactions: many(inventoryTransactions),
}));

export const tissBillsRelations = relations(tissBills, ({ one }) => ({
  appointment: one(appointments, {
    fields: [tissBills.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [tissBills.patientId],
    references: [patients.id],
  }),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one, many }) => ({
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
  signatures: many(digitalSignatures),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [users.clinicId],
    references: [clinics.id],
  }),
  doctorAppointments: many(appointments, { relationName: "doctorAppointments" }),
  recordsAuthored: many(medicalRecords, { relationName: "doctorRecords" }),
}));

// === SCHEMAS ===

export const insertClinicSchema = createInsertSchema(clinics).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true });
export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({ id: true, createdAt: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, createdAt: true });
export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({ id: true, createdAt: true });
export const insertTissBillSchema = createInsertSchema(tissBills).omit({ id: true, createdAt: true });
export const insertDigitalSignatureSchema = createInsertSchema(digitalSignatures).omit({ id: true, signedAt: true });
export const insertAvailabilityExceptionSchema = createInsertSchema(availabilityExceptions).omit({ id: true, createdAt: true });

// === EXPLICIT TYPES ===

export type Clinic = typeof clinics.$inferSelect;
export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export const insertMedicalRecordLogSchema = createInsertSchema(medicalRecordLogs).omit({ id: true, createdAt: true });

export type MedicalRecordLog = typeof medicalRecordLogs.$inferSelect;
export type InsertMedicalRecordLog = z.infer<typeof insertMedicalRecordLogSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type TissBill = typeof tissBills.$inferSelect;
export type DigitalSignature = typeof digitalSignatures.$inferSelect;
export type AvailabilityException = typeof availabilityExceptions.$inferSelect;

export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;
export type InsertTissBill = z.infer<typeof insertTissBillSchema>;
export type InsertDigitalSignature = z.infer<typeof insertDigitalSignatureSchema>;
export type InsertAvailabilityException = z.infer<typeof insertAvailabilityExceptionSchema>;

export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type CreateAppointmentRequest = InsertAppointment;
export type UpdateAppointmentStatusRequest = {
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  price?: number;
};

// Augmented types for frontend display
export type AppointmentWithDetails = Appointment & {
  patient: Patient;
  doctor: User;
};

export type MedicalRecordWithDetails = MedicalRecord & {
  patient: Patient;
  doctor: User;
};
