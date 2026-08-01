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

Requirements: Node.js 20+ and PostgreSQL. The starter installs the public npm
package, so it does not require building the Activity repository.

```bash
git clone https://github.com/andreyshedko/activity.git
cd activity/examples/nextjs
createdb activity_starter
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

Generate a session secret and paste it into `.env.local` before migration:

```bash
openssl rand -base64 32
```

The final `.env.local` should contain:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/activity_starter
ACTIVITY_SESSION_SECRET=replace-with-the-generated-secret
```

There is no root build step and no manual environment export. `db:migrate`
loads `.env.local` itself and applies the migration shipped in
`@feedclip/activity@0.8.0`.

If the repository is already cloned, start here:

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

Replace `DATABASE_URL` with an existing PostgreSQL connection when you do not
want to create a local database.

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
