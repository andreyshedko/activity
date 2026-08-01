# Authentication and tenant recipes

Activity does not own authentication. Adapt the identity already verified by
your server into this minimal application context:

```ts
type ActivityIdentity = {
  userId: string;
  userName: string;
  tenantId: string;
};
```

Use that context twice: authorize access to the requested resource and construct
the authoritative `actor`/tenant when trusted server code calls `track()`.

## Auth.js

```ts
import { auth } from "@/auth";

const session = await auth();
if (!session?.user?.id || !session.user.tenantId) {
  return new Response("Unauthorized", { status: 401 });
}

const identity = {
  userId: session.user.id,
  userName: session.user.name ?? "User",
  tenantId: session.user.tenantId,
};
```

Add `tenantId` to your Auth.js session callback from your own membership data;
do not accept it from a query parameter. See the official
[Auth.js session guide](https://authjs.dev/getting-started/session-management/get-session).

## Clerk organizations

```ts
import { auth, currentUser } from "@clerk/nextjs/server";

const { userId, orgId } = await auth();
if (!userId || !orgId) return new Response("Unauthorized", { status: 401 });
const user = await currentUser();

const identity = {
  userId,
  userName: user?.fullName ?? "User",
  tenantId: orgId,
};
```

Use `orgId` only after the route is protected and verify resource membership in
your application database. `currentUser()` performs a backend request; cache or
avoid it when the actor name is already present in trusted session claims. See
Clerk's [`auth()` and Auth object documentation](https://clerk.com/docs/reference/backend/types/auth-object).

## Supabase Auth

```ts
const supabase = await createServerClient();
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) return new Response("Unauthorized", { status: 401 });

const membership = await loadMembership(user.id, requestedTenantId);
if (!membership) return new Response("Forbidden", { status: 403 });

const identity = {
  userId: user.id,
  userName: user.email ?? "User",
  tenantId: membership.tenantId,
};
```

Use `getUser()` on the server when authorization depends on an authentic user;
Supabase documents that it validates against the Auth server. Tenant membership
still belongs in your application data or RLS policy. See the official
[`getUser()` reference](https://supabase.com/docs/reference/javascript/auth-getuser).

## Custom JWT or session

```ts
const claims = await verifyJwt(request.headers.get("authorization"));
if (!claims?.sub || !claims.tenantId) {
  return new Response("Unauthorized", { status: 401 });
}

const membership = await loadMembership(claims.sub, claims.tenantId);
if (!membership) return new Response("Forbidden", { status: 403 });
```

Verification must check signature, issuer, audience and expiry. Treat a tenant
claim as a selector, not sufficient authorization: confirm current membership
and resource ownership on the server.

## Invariants for every provider

1. Never accept actor or tenant authority from the browser payload.
2. Authorize the exact resource before querying its activity.
3. Apply tenant scope again inside the storage boundary.
4. Record impersonation and machine actors explicitly in metadata.
5. Return `401` for no identity, `403` for an authenticated identity without access.
