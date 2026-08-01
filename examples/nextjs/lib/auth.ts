import { createHmac, timingSafeEqual } from "node:crypto";

export type DemoSession = Readonly<{
  tenantId: string;
  userId: string;
  userName: string;
}>;

const COOKIE_NAME = "activity_session";
const sessions: Record<string, DemoSession> = {
  acme: { tenantId: "acme", userId: "user_alice", userName: "Alice at Acme" },
  globex: { tenantId: "globex", userId: "user_grace", userName: "Grace at Globex" },
};

export function sessionForTenant(tenantId: string): DemoSession | undefined {
  return sessions[tenantId];
}

export function serializeSessionCookie(session: DemoSession): string {
  const token = signSession(session);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`;
}

export function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export function getSessionFromRequest(request: Request): DemoSession | null {
  const cookies = request.headers.get("cookie") ?? "";
  const value = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return value ? verifySession(value.slice(COOKIE_NAME.length + 1)) : null;
}

export function verifySession(token: string | undefined): DemoSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DemoSession;
    const known = sessions[session.tenantId];
    return known?.userId === session.userId ? known : null;
  } catch {
    return null;
  }
}

function signSession(session: DemoSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function sign(payload: string): string {
  const secret = process.env.ACTIVITY_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ACTIVITY_SESSION_SECRET must contain at least 32 characters");
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
