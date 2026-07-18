import { Pool } from "pg";
import { postgresAdapter } from "@feedclip/activity/adapters/postgres";
import { createActivityHttpHandler } from "@feedclip/activity/http";

const connectionString = process.env.DATABASE_URL;
const pool = connectionString ? new Pool({ connectionString }) : null;

function handler() {
  if (!pool) {
    return async () => Response.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  return createActivityHttpHandler({
    adapter: postgresAdapter(pool),
    authorize: ({ request }) => {
      // Replace this demo check with the application's session and tenant policy.
      return request.headers.get("x-activity-demo-user") === "demo";
    },
  });
}

export async function GET(request: Request) {
  return handler()(request);
}

export async function POST(request: Request) {
  return handler()(request);
}
