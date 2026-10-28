import { ensureSeeded } from "@/db/seed";
import { appendAudit, listAudit } from "@/lib/audit-server";
import { resolveActor, resolveSeverity } from "@/lib/actor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = Math.min(200, Math.max(1, Number(limitParam ?? 80) || 80));
    const payload = await listAudit(limit);
    return Response.json(payload);
  } catch (error) {
    console.error("[carematrix] audit GET failed", error);
    return Response.json({ error: "audit_unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      module?: string;
      severity?: string;
      meta?: Record<string, unknown>;
      role?: string;
      actor?: string;
    };

    const action = typeof body.action === "string" ? body.action.trim().slice(0, 400) : "";
    const moduleName = typeof body.module === "string" ? body.module.trim().slice(0, 120) : "";
    if (!action || !moduleName) {
      return Response.json({ error: "action_and_module_required" }, { status: 400 });
    }

    await ensureSeeded();
    const { actor, role } = resolveActor(body);
    const event = await appendAudit({
      action,
      module: moduleName,
      severity: resolveSeverity(body.severity),
      meta: body.meta && typeof body.meta === "object" ? body.meta : undefined,
      actor,
      role,
    });
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    console.error("[carematrix] audit POST failed", error);
    return Response.json({ error: "audit_write_failed" }, { status: 503 });
  }
}
