import { asc } from "drizzle-orm";
import { db, isDatabaseAvailable, markDatabaseUnavailable } from "@/db";
import { wards } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import type { Ward, WardKind } from "@/lib/data-types";
import { getMockWards } from "@/lib/mock-store";

export function toWardDto(row: typeof wards.$inferSelect): Ward {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    kind: row.kind as WardKind,
    capacity: row.capacity,
    occupied: row.occupied,
    blocked: row.blocked,
    admissionsToday: row.admissionsToday,
    pendingDischarge: row.pendingDischarge,
    avgLosDays: row.avgLosDays,
    nursesOnShift: row.nursesOnShift,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadWards(): Promise<{ wards: Ward[]; source: "database" | "mock" }> {
  if (!isDatabaseAvailable()) {
    return { wards: getMockWards(), source: "mock" };
  }
  try {
    await ensureSeeded();
    const rows = await db.select().from(wards).orderBy(asc(wards.id));
    return { wards: rows.map(toWardDto), source: "database" };
  } catch (error) {
    markDatabaseUnavailable((error as Error).message);
    console.warn("[carematrix] ward load fell back to mock mode:", (error as Error).message);
    return { wards: getMockWards(), source: "mock" };
  }
}
