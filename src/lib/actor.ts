import { ROLE_PROFILES, type Role } from "@/lib/nav";
import type { AuditSeverity } from "@/lib/audit-types";

export const SEVERITIES: AuditSeverity[] = ["info", "success", "warning", "critical"];

export function resolveActor(body: unknown): { actor: string; role: Role } {
  const raw = (body ?? {}) as { role?: unknown; actor?: unknown };
  const role: Role =
    raw.role === "admin" || raw.role === "clinician" || raw.role === "patient"
      ? raw.role
      : "clinician";
  const actor =
    typeof raw.actor === "string" && raw.actor.trim().length > 0
      ? raw.actor.trim().slice(0, 120)
      : ROLE_PROFILES[role].name;
  return { actor, role };
}

export function resolveSeverity(value: unknown): AuditSeverity {
  return typeof value === "string" && SEVERITIES.includes(value as AuditSeverity)
    ? (value as AuditSeverity)
    : "info";
}
