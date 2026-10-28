import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Resilient Database Layer with Seamless Mock Mode Fallback
// ---------------------------------------------------------------------------
// If DATABASE_URL is missing, invalid, or PostgreSQL connection fails during
// local development, this module defers initialization and falls back to
// in-memory mock datasets instead of throwing a hard blocking runtime Error.
// ---------------------------------------------------------------------------

const globalForDb = globalThis as typeof globalThis & {
  __carematrixPool?: Pool;
  __carematrixDb?: NodePgDatabase;
  __carematrixDbUnavailable?: boolean;
  __carematrixDbUnavailableReason?: string;
  __carematrixLastFailureTime?: number;
};

const RETRY_INTERVAL_MS = 30_000;

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  if (url === "none" || url === "disabled" || url === "mock") return false;
  return true;
}

export function isDatabaseAvailable(): boolean {
  if (!isDatabaseConfigured()) return false;
  if (globalForDb.__carematrixDbUnavailable) {
    if (Date.now() - (globalForDb.__carematrixLastFailureTime ?? 0) < RETRY_INTERVAL_MS) {
      return false;
    }
    // Allow a retry attempt after cooling down
    globalForDb.__carematrixDbUnavailable = false;
  }
  return true;
}

export function markDatabaseUnavailable(reason: string): void {
  globalForDb.__carematrixDbUnavailable = true;
  globalForDb.__carematrixDbUnavailableReason = reason;
  globalForDb.__carematrixLastFailureTime = Date.now();
  console.warn(`[CareMatrix DB] Operating in mock data mode (${reason})`);
}

export function getDb(): NodePgDatabase | null {
  if (!isDatabaseAvailable()) {
    return null;
  }

  if (globalForDb.__carematrixDb) {
    return globalForDb.__carematrixDb;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    markDatabaseUnavailable("DATABASE_URL is not set");
    return null;
  }

  try {
    if (!globalForDb.__carematrixPool) {
      globalForDb.__carematrixPool = new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 1500, // Fast timeout for responsive local dev fallback
      });

      globalForDb.__carematrixPool.on("error", (err) => {
        markDatabaseUnavailable(err.message);
      });
    }

    globalForDb.__carematrixDb = drizzle(globalForDb.__carematrixPool);
    return globalForDb.__carematrixDb;
  } catch (error) {
    markDatabaseUnavailable((error as Error).message);
    return null;
  }
}

// Proxied db instance for backward-compatibility with Drizzle call sites.
// If the database is not available, invoking queries on db throws a handled error
// so callers' try/catch fallback blocks are triggered without crashing the app.
export const db = new Proxy({} as NodePgDatabase, {
  get(_t, prop) {
    const realDb = getDb();
    if (!realDb) {
      return () => {
        throw new Error(
          `[CareMatrix DB] Database is unavailable: ${
            globalForDb.__carematrixDbUnavailableReason || "mock mode active"
          }`
        );
      };
    }
    return Reflect.get(realDb, prop as string);
  },
});
