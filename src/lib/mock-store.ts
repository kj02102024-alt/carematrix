import type { Ward } from "./data-types";
import type { LabResult } from "./data-types";
import type { AuditEvent, AuditSeverity } from "./audit-types";
import type { Role } from "./nav";
import { WARD_MOCK, LAB_MOCK } from "./mock-core";
import { clamp } from "./format";
import { createHash } from "node:crypto";

export const GENESIS_HASH = "0".repeat(64);

export function hashEvent(payload: {
  prevHash: string;
  actor: string;
  role: string;
  action: string;
  module: string;
  severity: string;
  createdAt: string;
}): string {
  const canonical = [
    payload.prevHash,
    payload.actor,
    payload.role,
    payload.action,
    payload.module,
    payload.severity,
    payload.createdAt,
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

function createInitialAuditEvents(): AuditEvent[] {
  const signers: Array<{ actor: string; role: Role }> = [
    { actor: "Meera Kapoor", role: "admin" },
    { actor: "Dr. Arjun Sharma", role: "clinician" },
    { actor: "CareMatrix AI", role: "clinician" },
    { actor: "Lina Alvarez", role: "patient" },
  ];

  const seedEvents: Array<{ action: string; module: string; severity: AuditSeverity; minsAgo: number }> = [
    { action: "Discharge packet parsed · unified risk score 62 (moderate)", module: "FollowUpShield", severity: "info", minsAgo: 55 },
    { action: "Duplicate acetaminophen flagged across 3 active prescriptions", module: "DoseGuard", severity: "critical", minsAgo: 38 },
    { action: "Anticoagulant discrepancy detected between intake and MAR", module: "MedMismatch", severity: "critical", minsAgo: 22 },
    { action: "What-if simulation run: +20% trauma load predicts ICU saturation", module: "BedFlow · Simulation", severity: "warning", minsAgo: 14 },
    { action: "Critical potassium 6.8 mmol/L acknowledged (PX-4471)", module: "LabLoop", severity: "success", minsAgo: 6 },
    { action: "ADT feed connected · 4 wards streaming occupancy telemetry", module: "BedFlow", severity: "info", minsAgo: 1 },
  ];

  const events: AuditEvent[] = [];
  let prev = GENESIS_HASH;

  for (let i = 0; i < seedEvents.length; i++) {
    const s = seedEvents[i];
    const signer = signers[i % signers.length];
    const createdAt = new Date(Date.now() - s.minsAgo * 60_000).toISOString();
    const hash = hashEvent({
      prevHash: prev,
      actor: signer.actor,
      role: signer.role,
      action: s.action,
      module: s.module,
      severity: s.severity,
      createdAt,
    });
    events.push({
      seq: i + 1,
      hash,
      prevHash: prev,
      actor: signer.actor,
      role: signer.role,
      action: s.action,
      module: s.module,
      severity: s.severity,
      createdAt,
      meta: null,
    });
    prev = hash;
  }

  // Descending (newest first)
  return events.reverse();
}

type MockStore = {
  wards: Ward[];
  labs: LabResult[];
  auditEvents: AuditEvent[];
};

const globalForMock = globalThis as typeof globalThis & {
  __carematrixMockStore?: MockStore;
};

export function getMockStore(): MockStore {
  if (!globalForMock.__carematrixMockStore) {
    globalForMock.__carematrixMockStore = {
      wards: WARD_MOCK.map((w) => ({ ...w, updatedAt: new Date().toISOString() })),
      labs: LAB_MOCK.map((l) => ({ ...l })),
      auditEvents: createInitialAuditEvents(),
    };
  }
  return globalForMock.__carematrixMockStore;
}

export function getMockWards(): Ward[] {
  return getMockStore().wards.map((w) => ({ ...w }));
}

export function updateMockWard(
  id: string,
  delta: number,
): { ward: Ward; applied: number } | null {
  const store = getMockStore();
  const ward = store.wards.find((w) => w.id === id);
  if (!ward) return null;

  const maxOccupied = ward.capacity - ward.blocked;
  const nextOccupied = clamp(ward.occupied + Math.trunc(delta), 0, maxOccupied);
  const applied = nextOccupied - ward.occupied;

  ward.occupied = nextOccupied;
  ward.pendingDischarge = clamp(
    ward.pendingDischarge + (applied > 0 ? 0 : Math.abs(applied)),
    0,
    nextOccupied,
  );
  ward.updatedAt = new Date().toISOString();

  return { ward: { ...ward }, applied };
}

export function getMockLabs(): LabResult[] {
  return getMockStore().labs.map((l) => ({ ...l }));
}

export function acknowledgeMockLab(
  id: string,
  actor: string,
): { lab: LabResult; alreadyAcknowledged: boolean } | null {
  const store = getMockStore();
  const lab = store.labs.find((l) => l.id === id);
  if (!lab) return null;

  if (lab.status === "acknowledged") {
    return { lab: { ...lab }, alreadyAcknowledged: true };
  }

  lab.status = "acknowledged";
  lab.acknowledgedBy = actor;
  lab.acknowledgedAt = new Date().toISOString();

  return { lab: { ...lab }, alreadyAcknowledged: false };
}

export function getMockAuditEvents(): AuditEvent[] {
  return getMockStore().auditEvents.map((e) => ({ ...e }));
}

export function appendMockAudit(input: {
  action: string;
  module: string;
  severity?: AuditSeverity;
  actor: string;
  role: Role;
  meta?: Record<string, unknown> | null;
}): AuditEvent {
  const store = getMockStore();
  const prevHash = store.auditEvents[0]?.hash ?? GENESIS_HASH;
  const createdAt = new Date().toISOString();
  const severity: AuditSeverity = input.severity ?? "info";
  const hash = hashEvent({
    prevHash,
    actor: input.actor,
    role: input.role,
    action: input.action,
    module: input.module,
    severity,
    createdAt,
  });

  const event: AuditEvent = {
    seq: (store.auditEvents[0]?.seq ?? 0) + 1,
    hash,
    prevHash,
    actor: input.actor,
    role: input.role,
    action: input.action,
    module: input.module,
    severity,
    createdAt,
    meta: input.meta ?? null,
  };

  store.auditEvents.unshift(event);
  if (store.auditEvents.length > 200) {
    store.auditEvents.pop();
  }
  return event;
}

export function listMockAudit(limit = 80): { events: AuditEvent[]; chainOk: boolean } {
  const store = getMockStore();
  const events = store.auditEvents.slice(0, limit).map((e) => ({ ...e }));
  let chainOk = true;
  const ascending = [...events].reverse();
  for (let i = 0; i < ascending.length; i++) {
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
}
