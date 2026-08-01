# Activity production starter: Next.js + PostgreSQL

This starter demonstrates the complete production boundary, not only component
rendering:

```text
signed session
      ↓
ActivityPanel → GET /api/activity → resource authorization → tenant adapter → PostgreSQL
business route → trusted actor + track() ────────────────────┘
```

The browser can query authorized history but cannot write arbitrary activity.
`POST /api/activity` is deliberately disabled. The invoice route performs the
business operation on the server, derives the actor and tenant from a signed
`HttpOnly` session, then calls `track()`.

## Run in five minutes

Requirements: Node.js 20+, PostgreSQL, and the repository checked out locally.

```bash
cd examples/nextjs
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), choose Acme, and record a
status change. Switch to Globex: it uses the same public invoice ID but sees a
different history.

Create the database first if it does not exist, or replace `DATABASE_URL` in
`.env.local` with an existing PostgreSQL connection. Generate the session secret
with `openssl rand -base64 32`.

## Security model

- `activity_session` is signed with HMAC-SHA256 and stored in an `HttpOnly`,
  `SameSite=Lax` cookie (`Secure` in production).
- State-changing routes reject requests whose `Origin` does not match the app.
- Every query verifies both the authenticated session and resource access.
- Every storage call passes through `createTenantAdapter`, which namespaces the
  resource ID before it reaches PostgreSQL and removes the namespace on return.
- The business route ignores client-supplied actor or tenant values. The server
  constructs both from the verified session.
- Identical public IDs such as `inv_1001` cannot collide or leak across tenants.

The two hard-coded demo identities make the boundary executable and testable.
Replace `sessionForTenant` and the demo session endpoint with your authentication
provider. Keep the resource authorization, server-side actor derivation, and
tenant-scoped storage boundary.

## Important files

- `app/api/activity/route.ts` — authorized read-only Activity HTTP endpoint.
- `app/api/invoices/[id]/status/route.ts` — trusted server-side business event.
- `lib/auth.ts` — minimal signed-session seam to replace with your auth provider.
- `lib/tenant-storage.ts` — defense-in-depth tenant isolation wrapper.
- `scripts/migrate.mjs` — applies the migration shipped in the npm package.
- `tests/` — proves signed-session integrity and cross-tenant isolation.

## Verify

```bash
npm test
npm run build
```

For a real application, integrate the origin check with any stronger CSRF policy
required by your authentication model, then add rate limiting, observability, and
a database role with only the permissions the activity service needs.
