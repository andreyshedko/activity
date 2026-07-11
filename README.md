# Activity

Local-first activity history engine and React UI for business resources such as
invoices, customers, tickets, and orders.

Activity History is the product; the framework-independent Activity Engine is the
architecture underneath it.

## Install

```bash
npm install @andreyshedko/activity
```

React 18 or 19 is required only when using the React entrypoint.

## Quick start

```ts
import {
  createActivity,
  createMemoryStorageAdapter,
} from "@andreyshedko/activity";

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
import { ActivityPanel } from "@andreyshedko/activity/react";
import "@andreyshedko/activity/styles.css";

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
import { createActivity } from "@andreyshedko/activity";
import { postgresAdapter } from "@andreyshedko/activity/adapters/postgres";

const activity = createActivity({
  adapter: postgresAdapter(pool),
});
```

The migration is exported as `@andreyshedko/activity/migration.sql` and also lives
at [`migrations/001_activity_schema.sql`](./migrations/001_activity_schema.sql).

## Public entrypoints

- `@andreyshedko/activity` — engine, types, and memory adapter
- `@andreyshedko/activity/react` — `ActivityPanel`
- `@andreyshedko/activity/adapters/memory`
- `@andreyshedko/activity/adapters/postgres`
- `@andreyshedko/activity/styles.css`
- `@andreyshedko/activity/migration.sql`

## Development

```bash
npm install
npm test
npm run build
npm run dev
```

Architecture and product decisions are documented in [`spec/README.md`](./spec/README.md).

## Status

Version `0.1.0` is an MVP. The public contracts are usable, but the package has not
yet reached a stable `1.0` compatibility guarantee.

## License

MIT
