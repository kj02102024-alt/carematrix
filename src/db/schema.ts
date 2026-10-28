import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * CareMatrix OS — persistence layer
 * ---------------------------------
 * The shell + simulation modules use deterministic mock data, while the
 * clinical safety-critical state (labs, ward occupancy, audit chain) is
 * persisted so every acknowledgement / adjustment survives a refresh.
 */

export const wards = pgTable("wards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  kind: text("kind").notNull(), // icu | general | emergency
  capacity: integer("capacity").notNull(),
  occupied: integer("occupied").notNull(),
  blocked: integer("blocked").notNull().default(0),
  admissionsToday: integer("admissions_today").notNull().default(0),
  pendingDischarge: integer("pending_discharge").notNull().default(0),
  avgLosDays: text("avg_los_days").notNull().default("4.2"),
  nursesOnShift: integer("nurses_on_shift").notNull().default(12),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const labResults = pgTable("lab_results", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  patientName: text("patient_name").notNull(),
  location: text("location").notNull(),
  testName: text("test_name").notNull(),
  value: text("value").notNull(),
  unit: text("unit").notNull(),
  normalRange: text("normal_range").notNull(),
  severity: text("severity").notNull(), // critical | high | abnormal
  slaMinutes: integer("sla_minutes").notNull().default(15),
  collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"), // pending | acknowledged
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  orderCode: text("order_code").notNull().default("LAB-000"),
});

export const auditEvents = pgTable("audit_events", {
  seq: serial("seq").primaryKey(),
  hash: text("hash").notNull().unique(),
  prevHash: text("prev_hash").notNull(),
  actor: text("actor").notNull(),
  role: text("role").notNull(),
  action: text("action").notNull(),
  module: text("module").notNull(),
  severity: text("severity").notNull().default("info"), // info | success | warning | critical
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WardRow = typeof wards.$inferSelect;
export type LabResultRow = typeof labResults.$inferSelect;
export type AuditEventRow = typeof auditEvents.$inferSelect;
