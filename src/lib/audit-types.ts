import type { Role } from "./nav";

export type AuditSeverity = "info" | "success" | "warning" | "critical";

export type AuditEvent = {
  seq?: number;
  hash: string;
  prevHash: string;
  actor: string;
  role: Role;
  action: string;
  module: string;
  severity: AuditSeverity;
  createdAt: string;
  meta?: Record<string, unknown> | null;
};

export type AuditLogInput = {
  action: string;
  module: string;
  severity?: AuditSeverity;
  meta?: Record<string, unknown>;
};

const hex = (seed: string) => seed.repeat(16).slice(0, 64);

const GENESIS = hex("0000");

const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

/** Offline-safe chain shown if the audit API is unavailable. */
export const FALLBACK_AUDIT: AuditEvent[] = [
  {
    hash: hex("8f9b"),
    prevHash: GENESIS,
    actor: "System · Sentinel",
    role: "admin",
    action: "BedFlow occupancy stream synced from ADT feed (42 wards)",
    module: "BedFlow",
    severity: "info",
    createdAt: minutesAgo(1),
  },
  {
    hash: hex("3ac7"),
    prevHash: hex("8f9b"),
    actor: "Dr. Arjun Sharma",
    role: "clinician",
    action: "Critical potassium result acknowledged for PX-4471",
    module: "LabLoop",
    severity: "success",
    createdAt: minutesAgo(6),
  },
  {
    hash: hex("c41e"),
    prevHash: hex("3ac7"),
    actor: "Meera Kapoor",
    role: "admin",
    action: "What-if scenario executed: +20% trauma load, ICU bottleneck predicted",
    module: "BedFlow · Simulation",
    severity: "warning",
    createdAt: minutesAgo(14),
  },
  {
    hash: hex("71df"),
    prevHash: hex("c41e"),
    actor: "CareMatrix AI",
    role: "clinician",
    action: "MedMismatch flagged anticoagulant discrepancy (source: intake note L42)",
    module: "MedMismatch",
    severity: "critical",
    createdAt: minutesAgo(22),
  },
  {
    hash: hex("9b02"),
    prevHash: hex("71df"),
    actor: "CareMatrix AI",
    role: "clinician",
    action: "DoseGuard detected duplicate acetaminophen across 3 active prescriptions",
    module: "DoseGuard",
    severity: "critical",
    createdAt: minutesAgo(38),
  },
  {
    hash: hex("5e83"),
    prevHash: hex("9b02"),
    actor: "Lina Alvarez",
    role: "patient",
    action: "FollowUpShield discharge packet parsed · risk score 62 (moderate)",
    module: "FollowUpShield",
    severity: "info",
    createdAt: minutesAgo(55),
  },
];


