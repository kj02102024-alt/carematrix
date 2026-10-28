import { desc } from "drizzle-orm";
import { db, isDatabaseAvailable, markDatabaseUnavailable } from "@/db";
import { auditEvents } from "@/db/schema";
import type { AuditEvent, AuditLogInput, AuditSeverity } from "@/lib/audit-types";
import type { Role } from "@/lib/nav";
import {
  appendMockAudit,
  hashEvent,
  listMockAudit,
  GENESIS_HASH,
} from "@/lib/mock-store";

export { hashEvent, GENESIS_HASH };

function toDto(row: typeof auditEvents.$inferSelect): AuditEvent {
  return {
    seq: row.seq,
    hash: row.hash,
    prevHash: row.prevHash,
    actor: row.actor,
    role: row.role as Role,
    action: row.action,
    module: row.module,
    severity: row.severity as AuditSeverity,
    createdAt: row.createdAt.toISOString(),
    meta: row.meta ?? null,
  };
}

export async function appendAudit(
  input: AuditLogInput & { actor: string; role: Role },
): Promise<AuditEvent> {
  if (!isDatabaseAvailable()) {
    return appendMockAudit(input);
  }

  try {
    const latest = await db.select().from(auditEvents).orderBy(desc(auditEvents.seq)).limit(1);
    const prevHash = latest[0]?.hash ?? GENESIS_HASH;
    const severity: AuditSeverity = input.severity ?? "info";
    const createdAt = new Date();
    const hash = hashEvent({
      prevHash,
      actor: input.actor,
      role: input.role,
      action: input.action,
      module: input.module,
      severity,
      createdAt: createdAt.toISOString(),
    });

    const [row] = await db
      .insert(auditEvents)
      .values({
        hash,
        prevHash,
        actor: input.actor,
        role: input.role,
        action: input.action,
        module: input.module,
        severity,
        meta: input.meta ?? null,
        createdAt,
      })
      .returning();

    return toDto(row);
  } catch (err) {
    markDatabaseUnavailable((err as Error).message);
    return appendMockAudit(input);
  }
}

export async function listAudit(limit = 80): Promise<{ events: AuditEvent[]; chainOk: boolean }> {
  if (!isDatabaseAvailable()) {
    return listMockAudit(limit);
  }

  try {
    const rows = await db.select().from(auditEvents).orderBy(desc(auditEvents.seq)).limit(limit);
    const events = rows.map(toDto);
    let chainOk = true;
    const ascending = [...events].reverse();
    for (let i = 0; i < ascending.length; i += 1) {
      const current = ascending[i];
      const expectedPrev = i === 0 ? GENESIS_HASH : ascending[i - 1].hash;
      if (current.prevHash !== expectedPrev) {
        chainOk = false;
        break;
      }
      const recomputed = hashEvent({
        prevHash: current.prevHash,
        actor: current.actor,
        role: current.role,
        action: current.action,
        module: current.module,
        severity: current.severity,
        createdAt: current.createdAt,
      });
      if (recomputed !== current.hash) {
        chainOk = false;
        break;
      }
    }
    return { events, chainOk };
  } catch (err) {
    markDatabaseUnavailable((err as Error).message);
    return listMockAudit(limit);
  }
}
