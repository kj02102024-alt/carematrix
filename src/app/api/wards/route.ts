import { eq } from "drizzle-orm";
import { db, isDatabaseAvailable, markDatabaseUnavailable } from "@/db";
import { wards } from "@/db/schema";
import { appendAudit } from "@/lib/audit-server";
import { resolveActor } from "@/lib/actor";
import { clamp } from "@/lib/format";
import { loadWards, toWardDto } from "@/lib/wards-server";
import { appendMockAudit, updateMockWard } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await loadWards());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      delta?: number;
      reason?: string;
      role?: string;
      actor?: string;
    };
    if (!body.id || typeof body.delta !== "number" || !Number.isFinite(body.delta)) {
      return Response.json({ error: "id_and_delta_required" }, { status: 400 });
    }

    const { actor, role } = resolveActor(body);

    if (!isDatabaseAvailable()) {
      const result = updateMockWard(body.id, body.delta);
      if (!result) return Response.json({ error: "ward_not_found" }, { status: 404 });

      const event = appendMockAudit({
        action:
          result.applied >= 0
            ? `${result.applied} admission${result.applied === 1 ? "" : "s"} added to ${result.ward.code} (${result.ward.occupied}/${result.ward.capacity} beds)`
            : `${Math.abs(result.applied)} discharge${Math.abs(result.applied) === 1 ? "" : "s"} processed in ${result.ward.code} (${result.ward.occupied}/${result.ward.capacity} beds)`,
        module: "BedFlow",
        severity: result.applied > 0 ? "warning" : "success",
        actor,
        role,
        meta: {
          ward: result.ward.code,
          reason: typeof body.reason === "string" ? body.reason.slice(0, 160) : "Manual capacity update",
        },
      });

      return Response.json({ ward: result.ward, event });
    }

    try {
      const [current] = await db.select().from(wards).where(eq(wards.id, body.id)).limit(1);
      if (!current) return Response.json({ error: "ward_not_found" }, { status: 404 });

      const maxOccupied = current.capacity - current.blocked;
      const nextOccupied = clamp(current.occupied + Math.trunc(body.delta), 0, maxOccupied);
      const applied = nextOccupied - current.occupied;

      const [row] = await db
        .update(wards)
        .set({
          occupied: nextOccupied,
          pendingDischarge: clamp(
            current.pendingDischarge + (applied > 0 ? 0 : Math.abs(applied)),
            0,
            nextOccupied,
          ),
          updatedAt: new Date(),
        })
        .where(eq(wards.id, current.id))
        .returning();

      const event = await appendAudit({
        action:
          applied >= 0
            ? `${applied} admission${applied === 1 ? "" : "s"} added to ${current.code} (${nextOccupied}/${current.capacity} beds)`
            : `${Math.abs(applied)} discharge${Math.abs(applied) === 1 ? "" : "s"} processed in ${current.code} (${nextOccupied}/${current.capacity} beds)`,
        module: "BedFlow",
        severity: applied > 0 ? "warning" : "success",
        actor,
        role,
        meta: {
          ward: current.code,
          reason: typeof body.reason === "string" ? body.reason.slice(0, 160) : "Manual capacity update",
        },
      });

      return Response.json({ ward: toWardDto(row), event });
    } catch (dbErr) {
      markDatabaseUnavailable((dbErr as Error).message);
      const result = updateMockWard(body.id, body.delta);
      if (!result) return Response.json({ error: "ward_not_found" }, { status: 404 });

      const event = appendMockAudit({
        action:
          result.applied >= 0
            ? `${result.applied} admission${result.applied === 1 ? "" : "s"} added to ${result.ward.code} (${result.ward.occupied}/${result.ward.capacity} beds)`
            : `${Math.abs(result.applied)} discharge${Math.abs(result.applied) === 1 ? "" : "s"} processed in ${result.ward.code} (${result.ward.occupied}/${result.ward.capacity} beds)`,
        module: "BedFlow",
        severity: result.applied > 0 ? "warning" : "success",
        actor,
        role,
        meta: {
          ward: result.ward.code,
          reason: typeof body.reason === "string" ? body.reason.slice(0, 160) : "Manual capacity update",
        },
      });

      return Response.json({ ward: result.ward, event });
    }
  } catch (error) {
    console.error("[carematrix] ward adjust failed", error);
    return Response.json({ error: "ward_adjust_failed" }, { status: 500 });
  }
}
