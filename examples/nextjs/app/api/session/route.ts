import { hasTrustedOrigin, serializeSessionCookie, sessionForTenant } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return Response.json({ error: "Untrusted origin" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { tenantId?: unknown } | null;
  if (typeof body?.tenantId !== "string") {
    return Response.json({ error: "tenantId is required" }, { status: 400 });
  }

  const session = sessionForTenant(body.tenantId);
  if (!session) return Response.json({ error: "Unknown demo tenant" }, { status: 400 });

  return Response.json({ session }, {
    headers: { "set-cookie": serializeSessionCookie(session) },
  });
}

export function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return Response.json({ error: "Untrusted origin" }, { status: 403 });
  }
  return Response.json({ ok: true }, {
    headers: {
      "set-cookie": "activity_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}
