import { createActivityHttpHandler } from "@feedclip/activity/http";
import { getSessionFromRequest } from "../../../lib/auth";
import { canAccessInvoice } from "../../../lib/demo-data";
import { createTenantAdapter } from "../../../lib/tenant-storage";
import { getStorage } from "../../../lib/storage";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const handler = createActivityHttpHandler({
    adapter: createTenantAdapter(getStorage(), session.tenantId),
    authorize: ({ operation, resource }) =>
      operation === "query" && canAccessInvoice(session, resource),
  });

  return handler(request);
}

export function POST() {
  return Response.json(
    { error: "Track activity from trusted server code, not the browser" },
    { status: 405, headers: { allow: "GET" } },
  );
}
