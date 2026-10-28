import { db, isDatabaseAvailable, markDatabaseUnavailable } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseAvailable()) {
    return Response.json({
      ok: true,
      status: "healthy",
      database: "mock",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    markDatabaseUnavailable((error as Error).message);
    return Response.json({
      ok: true,
      status: "healthy",
      database: "mock",
      note: "Database unreachable, operating in mock mode",
      timestamp: new Date().toISOString(),
    });
  }
}
