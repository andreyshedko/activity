import assert from "node:assert/strict";
import test from "node:test";
import {
  getSessionFromRequest,
  hasTrustedOrigin,
  serializeSessionCookie,
  sessionForTenant,
  verifySession,
} from "../lib/auth";

process.env.ACTIVITY_SESSION_SECRET = "test-secret-with-at-least-thirty-two-characters";

test("signed sessions authenticate known tenants and reject tampering", () => {
  const session = sessionForTenant("acme");
  assert(session);
  const cookie = serializeSessionCookie(session);
  const request = new Request("https://example.test", { headers: { cookie } });
  assert.deepEqual(getSessionFromRequest(request), session);

  const token = cookie.match(/activity_session=([^;]+)/)?.[1];
  assert(token);
  assert.equal(verifySession(`${token}tampered`), null);
  assert.equal(sessionForTenant("unknown"), undefined);
  assert.equal(hasTrustedOrigin(new Request("https://example.test", {
    headers: { origin: "https://example.test" },
  })), true);
  assert.equal(hasTrustedOrigin(new Request("https://example.test", {
    headers: { origin: "https://evil.test" },
  })), false);
});
