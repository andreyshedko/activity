# Reliability and operations

Import optional production helpers from `@feedclip/activity/reliability`.

- `createTelemetryListener` forwards stable lifecycle names to OpenTelemetry,
  Sentry or an internal logger;
- `createRedactionMiddleware` replaces selected change values before persistence;
- `trackBatch` records bounded concurrent input while preserving result order;
- `withIdempotency` suppresses repeated keys within one process.

```ts
const activity = createActivity({
  adapter: withIdempotency(postgresAdapter(pool)),
  middleware: [createRedactionMiddleware(["password", "token"])],
  listeners: [createTelemetryListener((event) => span.addEvent(event.name))],
});
```

Set `metadata.idempotencyKey` from a trusted request or job identifier. The bundled
wrapper is process-local and bounded; horizontally scaled systems should enforce a
unique idempotency key in their database or queue as well.

Retention remains host-controlled. Use `retainActivityEntries` for exports and UI
windows, and schedule database deletion according to backup, legal-hold and tenant
policy. Activity does not silently delete durable records.
