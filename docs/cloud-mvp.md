# Activity Cloud MVP

Activity Cloud is a future managed adapter for the open-source Activity SDK. It
is a separate product from FeedClip, even when both products reuse the same
private platform services.

## Product boundary

| Public product | User promise | Public surface |
|---|---|---|
| FeedClip | capture and manage product feedback | `feedclip.dev`, FeedClip dashboard and SDK |
| Activity | add resource history to an application | Activity repository, demo, documentation and SDK |
| Activity Cloud | operate Activity storage and delivery | separate Activity onboarding, API and dashboard |

FeedClip pages must not market Activity as a FeedClip feature. Shared identity,
billing, databases and deployment are implementation details, not navigation or
brand architecture.

## Reusable platform capabilities

The existing FeedClip Cloud implementation already demonstrates capabilities
that can become product-neutral internal services:

- project ownership and authenticated customer sessions;
- hashed, rotatable project API keys;
- Stripe subscription state and entitlement checks;
- PostgreSQL access and migrations;
- rate limiting, request security and operational health checks;
- background jobs and usage-oriented administration.

Reuse concepts and hardened primitives. Do not reuse FeedClip submission models,
FeedClip URL terminology, browser credentials or feedback-specific UI.

## First vertical slice

```text
trusted application server
  POST /v1/events with write key
          ↓
project + environment + tenant boundary
          ↓
Activity StorageAdapter contract → PostgreSQL
          ↓
host backend creates short-lived read session
          ↓
ActivityPanel → cloud adapter → GET /v1/events
```

The first release needs only:

1. Activity project and environment provisioning.
2. Hashed server write keys with rotation and explicit scopes.
3. `POST /v1/events` using the public `TrackInput` contract.
4. `GET /v1/events` with resource filters and cursor pagination.
5. A server-only endpoint that issues short-lived, resource-scoped read sessions.
6. Tenant isolation derived by the server, never accepted from browser input.
7. Usage counters, plan limits and deterministic error codes.
8. Retention enforcement for 7, 90 and 365-day plan hypotheses.
9. JSON/CSV export and deletion support.
10. Health, latency, failure and rejected-authorization telemetry.

Attachments, real-time delivery, SSO, legal hold and multiple regions are later
iterations. They must not delay validation of the storage/query vertical slice.

## Public adapter contract

Cloud must remain optional and replaceable:

```ts
const activity = createActivity({
  adapter: activityCloudAdapter({
    endpoint: process.env.ACTIVITY_CLOUD_URL,
    apiKey: process.env.ACTIVITY_CLOUD_API_KEY,
  }),
});
```

The permanent write key is server-only. Browser reads use a short-lived token
containing project, environment, tenant, resource type, resource ID, expiry and
`read` scope. Export must preserve the open `ActivityRecord` data model so a
customer can migrate to PostgreSQL, MySQL or SQLite.

## Security acceptance criteria

- Cross-project, cross-tenant and cross-resource tests fail closed.
- Keys are shown once, stored only as hashes and can be revoked or rotated.
- Browser tokens cannot insert records or broaden their resource scope.
- The authoritative actor comes from trusted server context.
- Idempotency survives multiple application and Cloud instances.
- Rate-limit and quota failures are machine-readable and retry-safe.
- Deletion and retention jobs are observable and auditable.
- Logs and telemetry never contain API keys or unredacted sensitive changes.

## Pricing hypotheses to validate

Do not publish pricing as a promise before measuring storage and support costs.
Start research with these hypotheses:

| Plan | Hypothesis |
|---|---|
| Open source | self-hosted, unlimited by license |
| Cloud Free | 10,000 events/month, 7-day retention |
| Cloud Pro | €29/month, 100,000 events/month, 90-day retention |
| Cloud Scale | €99/month, 1 million events/month, 365-day retention |
| Enterprise | negotiated retention, regions, SLA and support |

Meter accepted writes and retained storage. Avoid per-seat pricing because the
value and infrastructure cost follow event volume, not dashboard users.

## Build gates

1. Connect one local test application through the complete server-write and
   browser-read flow.
2. Prove tenant isolation and key rotation with automated adversarial tests.
3. Measure p95 read/write latency and cost at 10k, 100k and 1m retained events.
4. Run three design-partner integrations before building a polished dashboard.
5. Charge at least one design partner before adding enterprise-only scope.
