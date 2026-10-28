import { and, eq } from "drizzle-orm";
import { db, isDatabaseAvailable, markDatabaseUnavailable } from "@/db";
import { labResults } from "@/db/schema";
import { appendAudit } from "@/lib/audit-server";
import { resolveActor } from "@/lib/actor";
import { toLabDto } from "@/lib/labs-server";
import { acknowledgeMockLab, appendMockAudit } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      role?: string;
      actor?: string;
      note?: string;
    };
    const { actor, role } = resolveActor(body);

    if (!isDatabaseAvailable()) {
      const mockResult = acknowledgeMockLab(id, actor);
      if (!mockResult) return Response.json({ error: "lab_not_found" }, { status: 404 });
      if (mockResult.alreadyAcknowledged) {
        return Response.json({ lab: mockResult.lab, event: null, alreadyAcknowledged: true });
      }

      const event = appendMockAudit({
        action: `Critical ${mockResult.lab.testName} ${mockResult.lab.value} ${mockResult.lab.unit} acknowledged for ${mockResult.lab.patientId}`,
        module: "LabLoop",
        severity: "success",
        actor,
        role,
        meta: {
          patient: mockResult.lab.patientId,
          order: mockResult.lab.orderCode,
          result: `${mockResult.lab.value} ${mockResult.lab.unit}`,
          note: typeof body.note === "string" ? body.note.slice(0, 240) : undefined,
        },
      });

      return Response.json({ lab: mockResult.lab, event });
    }

    try {
      const [row] = await db
        .update(labResults)
        .set({ status: "acknowledged", acknowledgedBy: actor, acknowledgedAt: new Date() })
        .where(and(eq(labResults.id, id), eq(labResults.status, "pending")))
        .returning();

      if (!row) {
        const [existing] = await db.select().from(labResults).where(eq(labResults.id, id)).limit(1);
        if (!existing) return Response.json({ error: "lab_not_found" }, { status: 404 });
        return Response.json({ lab: toLabDto(existing), event: null, alreadyAcknowledged: true });
      }

      const event = await appendAudit({
        action: `Critical ${row.testName} ${row.value} ${row.unit} acknowledged for ${row.patientId}`,
        module: "LabLoop",
        severity: "success",
        actor,
        role,
        meta: {
          patient: row.patientId,
          order: row.orderCode,
          result: `${row.value} ${row.unit}`,
          note: typeof body.note === "string" ? body.note.slice(0, 240) : undefined,
        },
      });

      return Response.json({ lab: toLabDto(row), event });
    } catch (dbErr) {
      markDatabaseUnavailable((dbErr as Error).message);
      const mockResult = acknowledgeMockLab(id, actor);
      if (!mockResult) return Response.json({ error: "lab_not_found" }, { status: 404 });
      if (mockResult.alreadyAcknowledged) {
        return Response.json({ lab: mockResult.lab, event: null, alreadyAcknowledged: true });
      }

      const event = appendMockAudit({
        action: `Critical ${mockResult.lab.testName} ${mockResult.lab.value} ${mockResult.lab.unit} acknowledged for ${mockResult.lab.patientId}`,
        module: "LabLoop",
        severity: "success",
        actor,
        role,
        meta: {
          patient: mockResult.lab.patientId,
          order: mockResult.lab.orderCode,
          result: `${mockResult.lab.value} ${mockResult.lab.unit}`,
          note: typeof body.note === "string" ? body.note.slice(0, 240) : undefined,
        },
      });

      return Response.json({ lab: mockResult.lab, event });
    }
  } catch (error) {
    console.error("[carematrix] lab acknowledge failed", error);
    return Response.json({ error: "acknowledge_failed" }, { status: 500 });
  }
}
