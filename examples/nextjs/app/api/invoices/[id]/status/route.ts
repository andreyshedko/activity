import { createActivity } from "@feedclip/activity";
import { getSessionFromRequest, hasTrustedOrigin } from "../../../../../lib/auth";
import { invoiceForSession } from "../../../../../lib/demo-data";
import { createTenantAdapter } from "../../../../../lib/tenant-storage";
import { getStorage } from "../../../../../lib/storage";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasTrustedOrigin(request)) {
    return Response.json({ error: "Untrusted origin" }, { status: 403 });
  }
  const session = getSessionFromRequest(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = invoiceForSession(session, (await context.params).id);
  if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });

  const body = await request.json().catch(() => null) as { after?: unknown } | null;
  if (body?.after !== "Draft" && body?.after !== "Approved") {
    return Response.json({ error: "after must be Draft or Approved" }, { status: 400 });
  }
  const before = body.after === "Draft" ? "Approved" : "Draft";

  const activity = createActivity({
    adapter: createTenantAdapter(getStorage(), session.tenantId),
  });
  const record = await activity.track({
    resource: invoice,
    actor: { type: "user", id: session.userId, name: session.userName },
    action: "update",
    changes: [{
      field: "status",
      label: "Status",
      before,
      after: body.after,
      valueType: "enum",
    }],
    metadata: { tenantId: session.tenantId },
  });

  return Response.json({ id: record.id }, { status: 201 });
}
