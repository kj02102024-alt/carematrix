import { sql } from "drizzle-orm";
import { db, isDatabaseAvailable, markDatabaseUnavailable } from "@/db";
import { auditEvents, labResults, wards } from "@/db/schema";
import { appendAudit } from "@/lib/audit-server";
import { LAB_MOCK, WARD_MOCK } from "@/lib/mock-core";

let seedPromise: Promise<void> | null = null;

async function seed(): Promise<void> {
  if (!isDatabaseAvailable()) return;

  try {
    await db
      .insert(wards)
      .values(WARD_MOCK.map((ward) => ({ ...ward, updatedAt: new Date() })))
      .onConflictDoNothing();

    const labCount = await db.select({ count: sql<number>`count(*)::int` }).from(labResults);
    if ((labCount[0]?.count ?? 0) === 0) {
      await db.insert(labResults).values(
        LAB_MOCK.map((lab) => ({
          ...lab,
          collectedAt: new Date(lab.collectedAt),
          acknowledgedAt: lab.acknowledgedAt ? new Date(lab.acknowledgedAt) : null,
        })),
      );
    }

    const auditCount = await db.select({ count: sql<number>`count(*)::int` }).from(auditEvents);
    if ((auditCount[0]?.count ?? 0) === 0) {
      const signers: Array<{ actor: string; role: "admin" | "clinician" | "patient" }> = [
        { actor: "Meera Kapoor", role: "admin" },
        { actor: "Dr. Arjun Sharma", role: "clinician" },
        { actor: "CareMatrix AI", role: "clinician" },
        { actor: "Lina Alvarez", role: "patient" },
      ];
      const seedEvents = [
        {
          action: "ADT feed connected · 4 wards streaming occupancy telemetry",
          module: "BedFlow",
          severity: "info" as const,
        },
        {
          action: "Critical potassium 6.8 mmol/L acknowledged (PX-4471)",
          module: "LabLoop",
          severity: "success" as const,
        },
        {
          action: "What-if simulation run: +20% trauma load predicts ICU saturation",
          module: "BedFlow · Simulation",
          severity: "warning" as const,
        },
        {
          action: "Anticoagulant discrepancy detected between intake and MAR",
          module: "MedMismatch",
          severity: "critical" as const,
        },
        {
          action: "Duplicate acetaminophen flagged across 3 active prescriptions",
          module: "DoseGuard",
          severity: "critical" as const,
        },
        {
          action: "Discharge packet parsed · unified risk score 62 (moderate)",
          module: "FollowUpShield",
          severity: "info" as const,
        },
      ];
      for (let i = 0; i < seedEvents.length; i += 1) {
        const signer = signers[i % signers.length];
        await appendAudit({ ...seedEvents[i], ...signer });
      }
    }
  } catch (err) {
    markDatabaseUnavailable((err as Error).message);
    throw err;
  }
}

/** Idempotent, race-safe seeding used by server pages and route handlers. */
export async function ensureSeeded(): Promise<boolean> {
  if (!isDatabaseAvailable()) {
    return false;
  }
  if (!seedPromise) {
    seedPromise = seed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  try {
    await seedPromise;
    return true;
  } catch (error) {
    console.warn("[carematrix] database seed skipped (mock mode active):", (error as Error).message);
    return false;
  }
}
