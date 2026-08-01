import { Pool } from "pg";
import { postgresAdapter } from "@feedclip/activity/adapters/postgres";
import type { StorageAdapter } from "@feedclip/activity";

const globalPool = globalThis as typeof globalThis & { activityPool?: Pool };

export function getStorage(): StorageAdapter {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const pool = globalPool.activityPool ?? new Pool({ connectionString });
  if (process.env.NODE_ENV !== "production") globalPool.activityPool = pool;
  return postgresAdapter(pool);
}
