import { desc } from "drizzle-orm";
import { db, isDatabaseAvailable, markDatabaseUnavailable } from "@/db";
import { labResults } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import type { LabResult, LabSeverity, LabStatus } from "@/lib/data-types";
import { getMockLabs } from "@/lib/mock-store";

export function toLabDto(row: typeof labResults.$inferSelect): LabResult {
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patientName,
    location: row.location,
    testName: row.testName,
    value: row.value,
    unit: row.unit,
    normalRange: row.normalRange,
    severity: row.severity as LabSeverity,
    slaMinutes: row.slaMinutes,
    collectedAt: row.collectedAt.toISOString(),
    status: row.status as LabStatus,
    acknowledgedBy: row.acknowledgedBy,
    acknowledgedAt: row.acknowledgedAt ? row.acknowledgedAt.toISOString() : null,
    orderCode: row.orderCode,
  };
}

export async function loadLabs(): Promise<{ labs: LabResult[]; source: "database" | "mock" }> {
  if (!isDatabaseAvailable()) {
    return { labs: getMockLabs(), source: "mock" };
  }
  try {
    await ensureSeeded();
    const rows = await db.select().from(labResults).orderBy(desc(labResults.collectedAt));
    return { labs: rows.map(toLabDto), source: "database" };
  } catch (error) {
    markDatabaseUnavailable((error as Error).message);
    console.warn("[carematrix] lab load fell back to mock mode:", (error as Error).message);
    return { labs: getMockLabs(), source: "mock" };
  }
}
