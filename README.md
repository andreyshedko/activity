# Activity

Local-first activity history engine and React UI for business resources such as
invoices, customers, tickets, and orders.

Activity History is the product; the framework-independent Activity Engine is the
architecture underneath it.

## Install

```bash
npm install @feedclip/activity
```

React 18 or 19 is required only when using the React entrypoint.

## Quick start

```ts
import {
  createActivity,
  createMemoryStorageAdapter,
} from "@feedclip/activity";

const activity = createActivity({
  adapter: createMemoryStorageAdapter(),
});

await activity.track({
  resource: {
    type: "invoice",
    id: "inv_123",
    title: "Invoice INV-123",
  },
  actor: {
    type: "user",
    id: "user_1",
    name: "John Smith",
  },
  action: "update",
  changes: [
    {
      field: "status",
      label: "Status",
      before: "Draft",
      after: "Approved",
      valueType: "enum",
    },
  ],
});

const entries = await activity.query({
  resource: { type: "invoice", id: "inv_123" },
});
```

## React

The Activity instance is passed explicitly. No provider is required.

```tsx
import { ActivityPanel } from "@feedclip/activity/react";
import "@feedclip/activity/styles.css";

export function InvoiceActivity() {
  return (
    <ActivityPanel
      activity={activity}
      resource={{ type: "invoice", id: "inv_123" }}
    />
  );
}
```

Use `messages` to replace UI copy and `locale` to format dates and time:

```tsx
<ActivityPanel
  activity={activity}
  locale="cs-CZ"
  messages={{ title: "Aktivita", searchPlaceholder: "Hledat..." }}
  resource={{ type: "invoice", id: "inv_123" }}
/>
```

## PostgreSQL

Apply the bundled migration, then create an adapter around any client exposing a
Promise-based `query(sql, params)` method:

```ts
import { createActivity } from "@feedclip/activity";
import { postgresAdapter } from "@feedclip/activity/adapters/postgres";

const activity = createActivity({
  adapter: postgresAdapter(pool),
});
```

The migration is exported as `@feedclip/activity/migration.sql` and also lives
at [`migrations/001_activity_schema.sql`](./migrations/001_activity_schema.sql).

## Public entrypoints

- `@feedclip/activity` — engine, types, and memory adapter
- `@feedclip/activity/react` — `ActivityPanel`
- `@feedclip/activity/adapters/memory`
- `@feedclip/activity/adapters/postgres`
- `@feedclip/activity/styles.css`
- `@feedclip/activity/migration.sql`

## Development

```bash
npm install
npm test
npm run build
npm run dev
```

`npm test` runs the PostgreSQL integration suite when `DATABASE_URL` is set. The
GitHub Actions workflow provides PostgreSQL automatically; without a database the
integration test is reported as skipped while unit and React tests still run.

Architecture and product decisions are documented in [`spec/README.md`](./spec/README.md).

## Status

Version `0.1.0` is an MVP. The public contracts are usable, but the package has not
yet reached a stable `1.0` compatibility guarantee.

## License

MIT
