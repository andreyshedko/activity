# Server framework recipes

The core package is framework-independent. A server integration needs one
authenticated read endpoint and trusted calls to `track()` from business code.

## Express

Use the application session middleware first, then adapt the verified identity:

```ts
app.get("/api/activity", requireSession, async (req, res) => {
  const resource = {
    type: requiredString(req.query.resourceType),
    id: requiredString(req.query.resourceId),
  };
  if (!await canView(req.user, resource)) return res.sendStatus(403);

  const result = await tenantActivity(req.user.tenantId).queryPage({
    resource,
    search: optionalString(req.query.search),
    limit: optionalNumber(req.query.limit),
  });
  res.json(result);
});
```

Call `tenantActivity(...).track()` in the existing invoice/customer/ticket route,
after its validation and authorization succeed. Do not add a generic public
tracking endpoint merely to mirror the browser adapter.

## Fastify

```ts
fastify.get("/api/activity", { preHandler: [authenticate] }, async (request, reply) => {
  const resource = readResource(request.query);
  if (!await canView(request.user, resource)) return reply.code(403).send({ error: "Forbidden" });
  return tenantActivity(request.user.tenantId).queryPage({ resource, limit: 50 });
});
```

Keep identity decoration typed and scope the PostgreSQL pool to the server
process. Fastify's schema validation is a good place to reject malformed query
parameters before they reach Activity.

## Remix / React Router

```ts
export async function loader({ request, params }: LoaderFunctionArgs) {
  const identity = await requireIdentity(request);
  const resource = { type: "invoice", id: params.invoiceId! };
  await requireResourceAccess(identity, resource);
  return json(await tenantActivity(identity.tenantId).queryPage({ resource, limit: 50 }));
}
```

The component can render controlled `entries`, or call an application endpoint
through `httpAdapter` when client-side search and pagination are required.

## Serverless and edge functions

- Reuse a pooled database client where the runtime allows module-level state.
- Use a serverless-compatible PostgreSQL driver only if it implements the adapter
  contract documented by Activity.
- Do not import the PostgreSQL adapter into an edge runtime that lacks Node APIs.
- Keep the browser on `httpAdapter`; deploy the database route to a Node runtime.
- Set function timeouts above the database connection and query budgets.

## Shared pattern

```ts
await updateBusinessRecord(input);
await activity.track({
  resource,
  actor: identityToActor(identity),
  action: "update",
  changes,
  metadata: { tenantId: identity.tenantId },
});
```

When the business update and activity insert must be atomic across failures,
use your application's transaction/outbox strategy. Do not silently swallow a
tracking failure unless the product explicitly accepts missing history.
