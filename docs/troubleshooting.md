# Troubleshooting

Start with the HTTP status and the layer that produced it.

| Symptom | Likely cause | Fix |
|---|---|---|
| `relation "activity_entries" does not exist` | Migration was not applied to this database | Run the packaged migration before starting the app. The production starter provides `npm run db:migrate`. |
| `DATABASE_URL is required` | The server or migration process cannot see the connection string | Add it to `.env.local` in the starter, or export it in the process environment. Never expose it through a `NEXT_PUBLIC_` variable. |
| `401 Unauthorized` | No valid application session reached the Activity endpoint | Verify the auth middleware, cookie domain and `fetch` credentials policy. |
| `403 Forbidden` | The session exists but the resource policy denied access | Log the user, tenant, resource type and resource ID on the server; do not weaken the policy in the browser. |
| `405 Method Not Allowed` on `POST /api/activity` | The production starter intentionally makes the browser endpoint read-only | Call `track()` from the trusted business route after validating the operation. |
| Panel has no styles | Package CSS was not imported | Import `@feedclip/activity/styles.css` once in the application root. |
| Panel stays empty | The query and tracked entry use different resource references | Compare `resource.type` and `resource.id` after tenant mapping. Both are exact identifiers. |
| Search finds nothing | The desired value is not part of the searchable fields | Search covers resource title, actor, change labels/values and comment content. Put domain identifiers in one of those supported fields. |
| Next.js reports a server/client boundary error | A browser-only adapter or component was imported into a Server Component | Put `ActivityPanel` and `httpAdapter` behind a `"use client"` boundary. Keep PostgreSQL on the server. |
| Cross-tenant records appear | Tenant scope is only checked in UI code | Enforce tenant scope in authorization and at the storage boundary; copy `createTenantAdapter` from the production starter. |

## Useful server diagnostics

Use `onError` on the HTTP handler to connect failures to your logger without
returning database details to the browser:

```ts
const handler = createActivityHttpHandler({
  adapter,
  authorize,
  onError(error, request) {
    logger.error({
      error,
      method: request.method,
      requestId: request.headers.get("x-request-id"),
    }, "Activity request failed");
  },
});
```

For tracking failures, attach a `trackFailed` lifecycle listener. Redact content,
attachment URLs and metadata before sending events to an external log service.

## Before opening an issue

Include the Activity version, Node/React/framework/database versions, relevant
HTTP status, sanitized error, and a minimal resource reference. Never include a
database URL, session cookie, API token or customer data.
