# Activity

[![npm](https://img.shields.io/npm/v/@feedclip/activity)](https://www.npmjs.com/package/@feedclip/activity)
[![provenance](https://img.shields.io/badge/provenance-verified-blue)](https://www.npmjs.com/package/@feedclip/activity)
[![license](https://img.shields.io/npm/l/@feedclip/activity)](https://github.com/andreyshedko/activity/blob/main/LICENSE)

[Live demo](https://andreyshedko.github.io/activity/) ·
[Documentation](https://github.com/andreyshedko/activity/tree/main/docs) ·
[Production starter](https://github.com/andreyshedko/activity/tree/main/examples/nextjs) ·
[StackBlitz](https://stackblitz.com/github/andreyshedko/activity?file=examples%2Fstackblitz%2Fsrc%2FApp.tsx&startScript=stackblitz) ·
[npm](https://www.npmjs.com/package/@feedclip/activity)

Drop-in activity history for React applications, backed by a framework-independent
engine and your own storage. Ship searchable, accessible audit trails for invoices,
customers, tickets, orders, and other business resources without rebuilding the UI.

Activity History is the product; the framework-independent Activity Engine is the
architecture underneath it.

Use the [documentation hub](docs/README.md) for authentication, tenant isolation,
framework recipes, troubleshooting, customization, performance and onboarding
feedback.

## Install

```bash
npm install @feedclip/activity
```

React 18 or 19 is required only when using the React entrypoint.

Try the package in a clean browser environment with the
[StackBlitz installation example](https://stackblitz.com/github/andreyshedko/activity?file=examples%2Fstackblitz%2Fsrc%2FApp.tsx&startScript=stackblitz).
The example installs the public npm release rather than importing SDK source
files from this repository.

## Five-minute quick start

Start with memory storage to add the UI without infrastructure. It is ideal for
prototyping and tests; switch to PostgreSQL before deploying data that must
survive a process restart.

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

Render the same Activity instance in React:

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

That is the complete in-memory integration. See the
[executable memory example](https://github.com/andreyshedko/activity/blob/main/examples/quickstart/memory.mjs),
or continue with [PostgreSQL](#postgresql) for persistence and the
[HTTP adapter](#browser-to-server-http-adapter) when the panel runs in a browser.

## Production starter

For a complete integration, use the
[Next.js + PostgreSQL production starter](https://github.com/andreyshedko/activity/tree/main/examples/nextjs).
It demonstrates signed sessions, resource authorization, tenant-isolated storage,
server-derived actors, schema migration, and a browser panel that cannot forge
activity records. It installs the public npm package and includes an executable
five-minute setup, not pseudocode.

```bash
git clone https://github.com/andreyshedko/activity.git
cd activity/examples/nextjs
createdb activity_starter
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

## SQLite

Use SQLite for desktop applications, local-first services, single-node
deployments, and development environments. The adapter has no runtime driver
dependency and accepts the synchronous `prepare/run/get/all` contract used by
Node's built-in SQLite database:

```ts
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createActivity } from "@feedclip/activity";
import { sqliteAdapter } from "@feedclip/activity/adapters/sqlite";

const database = new DatabaseSync("activity.db");
database.exec("pragma foreign_keys = on");
database.exec(
  readFileSync(new URL(import.meta.resolve("@feedclip/activity/sqlite-migration.sql")), "utf8"),
);

const activity = createActivity({ adapter: sqliteAdapter(database) });
```

The included schema stores timestamps as ISO 8601 text, JSON values as text,
and identifiers as text. Cursor and offset pagination, filters, search,
transactions, content, metadata, and changes have the same behavior as the
PostgreSQL adapter. See the
[executable SQLite quick start](https://github.com/andreyshedko/activity/blob/main/examples/quickstart/sqlite.mjs).

## MySQL

Use the MySQL adapter with a `mysql2/promise` pool. The database driver remains
an application dependency, so Activity does not add a runtime dependency:

```ts
import mysql from "mysql2/promise";
import { createActivity } from "@feedclip/activity";
import { mysqlAdapter } from "@feedclip/activity/adapters/mysql";

const pool = mysql.createPool(process.env.MYSQL_URL!);
const activity = createActivity({ adapter: mysqlAdapter(pool) });
```

Apply `@feedclip/activity/mysql-migration.sql` with multiple statements enabled
before tracking data. The adapter supports atomic inserts, search, filters,
offset pagination, and stable cursor pagination. See the
[executable MySQL quick start](https://github.com/andreyshedko/activity/blob/main/examples/quickstart/mysql.mjs).

## Middleware

Use middleware for application policies and server-side enrichment before an
activity record reaches storage:

```ts
import { ActivityError, createActivity } from "@feedclip/activity";

const activity = createActivity({
  adapter,
  middleware: [
    (entry) => ({
      ...entry,
      metadata: { ...entry.metadata, tenantId: currentTenant.id },
    }),
    (entry, context) => {
      if (!canTrack(entry.resource)) {
        throw new ActivityError("POLICY_DENIED", "Activity tracking is not allowed");
      }
      console.info(context.operation, entry.id);
      return entry;
    },
  ],
});
```

Middleware runs sequentially after validation and normalization but before the
storage adapter. Each handler receives an immutable `ActivityRecord` and must
return that record or a new valid record, synchronously or asynchronously. A
failure stops the pipeline, so the adapter does not persist a partial event.

### Lifecycle events

Attach observers for logging, metrics, or telemetry without coupling them to a
storage adapter:

```ts
const activity = createActivity({
  adapter,
  listeners: [
    async (event) => {
      if (event.type === "afterTrack") {
        await metrics.increment("activity.tracked", {
          action: event.record.action,
        });
      }
      if (event.type === "trackFailed") {
        logger.error(event.error, "Activity tracking failed");
      }
    },
  ],
});
```

`beforeTrack` receives the final record after middleware and before persistence.
`afterTrack` runs after a successful insert. `trackFailed` reports validation,
middleware, and storage failures and includes a record when one was constructed.
Events and listener arrays are immutable snapshots. Listener failures are
isolated: every listener still runs, tracking keeps its original outcome, and a
persisted record is never rolled back because an observer failed.

## React

The Activity instance is passed explicitly. No provider is required.

Use `messages` to replace UI copy and `locale` to format dates and time:

```tsx
<ActivityPanel
  activity={activity}
  locale="cs-CZ"
  messages={{ title: "Aktivita", searchPlaceholder: "Hledat..." }}
  resource={{ type: "invoice", id: "inv_123" }}
/>
```

### Custom entry actions

Add product-specific actions without teaching Activity about your domain. Each
callback receives the immutable `ActivityRecord` for that row:

```tsx
<ActivityPanel
  activity={activity}
  entryActions={[
    {
      id: "open-invoice",
      label: "Open invoice",
      onSelect: (entry) => openInvoice(entry.resource.id),
    },
    {
      id: "restore",
      label: "Restore",
      isVisible: (entry) => entry.action === "archive",
      isDisabled: (entry) => entry.actor.type === "system",
      onSelect: restoreFromEntry,
    },
  ]}
  resource={{ type: "invoice", id: "inv_123" }}
/>
```

Actions are keyboard-accessible. Supply `icon` with any React node when an icon
is preferred; `label` remains the accessible name and tooltip.

### Detail views and deep links

Use `expandedEntryId` when the selected event belongs in the URL. Activity keeps
the detail view accessible and inline; the host application remains in control of
routing:

```tsx
const [expandedEntryId, setExpandedEntryId] = useState<string | null>(
  new URLSearchParams(location.search).get("activity"),
);

<ActivityPanel
  activity={activity}
  expandedEntryId={expandedEntryId}
  onExpandedEntryChange={(entryId) => {
    setExpandedEntryId(entryId);
    const url = new URL(location.href);
    entryId ? url.searchParams.set("activity", entryId) : url.searchParams.delete("activity");
    history.replaceState(null, "", url);
  }}
  resource={{ type: "invoice", id: "inv_123" }}
/>
```

Every rendered record also receives a stable DOM target in the form
`activity-entry-{record.id}`. Without `expandedEntryId`, expansion remains local
and multiple records can be opened independently, preserving existing behavior.

### Browser-to-server HTTP adapter

Keep PostgreSQL credentials on the server. The browser uses the HTTP adapter:

```tsx
import { createActivity } from "@feedclip/activity";
import { httpAdapter } from "@feedclip/activity/adapters/http";

const activity = createActivity({
  adapter: httpAdapter({
    endpoint: "/api/activity",
    headers: () => ({ authorization: `Bearer ${getSessionToken()}` }),
  }),
});

<ActivityPanel activity={activity} pageSize={20} resource={resource} />;
```

On a server with the standard Fetch API, connect the same endpoint to storage:

```ts
import { postgresAdapter } from "@feedclip/activity/adapters/postgres";
import { createActivityHttpHandler } from "@feedclip/activity/http";

const handleActivity = createActivityHttpHandler({
  adapter: postgresAdapter(db),
  authorize: async ({ request, operation, resource }) => {
    const session = await requireSession(request);
    return canAccessResource(session, operation, resource);
  },
});

export const GET = handleActivity;
export const POST = handleActivity;
```

`authorize` is required and runs before every query or insert. The handler
revalidates incoming records rather than trusting browser payloads. See the
[`examples/nextjs`](https://github.com/andreyshedko/activity/tree/main/examples/nextjs)
browser → route handler → PostgreSQL flow and the smaller
[executable HTTP example](https://github.com/andreyshedko/activity/blob/main/examples/quickstart/http.mjs).

### Pagination

`activity.query()` remains compatible and returns an array. Use `queryPage()`
when totals and continuation state are required:

```ts
const page = await activity.queryPage?.({ resource, limit: 20, offset: 0 });
// { entries, total, hasMore }
```

`ActivityPanel pageSize={20}` renders an accessible **Load more** action and
appends subsequent pages without replacing entries already on screen.

For streams that can receive new events while a user is paging, opt into cursor
pagination so newly inserted rows cannot shift page boundaries:

```tsx
<ActivityPanel
  activity={activity}
  pageSize={20}
  paginationMode="cursor"
  resource={{ type: "invoice", id: "inv_123" }}
/>
```

The same opaque cursor can be used without React:

```ts
const first = await activity.queryPage?.({ resource, limit: 20 });
const second = await activity.queryPage?.({
  resource,
  limit: 20,
  cursor: first?.nextCursor,
});
```

`cursor` and `offset` are mutually exclusive. Cursors are transport-safe and
opaque to consumers; pass `nextCursor` back unchanged.

### Attachments

Activity records attachment metadata; file upload, malware scanning, access
control, and download delivery stay in the host application. Configure validation
when creating the engine:

```ts
const activity = createActivity({
  adapter,
  attachmentPolicy: {
    maxSizeBytes: 25 * 1024 * 1024,
    allowedMimeTypes: ["image/*", "application/pdf"],
    allowedUrlProtocols: ["https:"],
  },
});
```

`ActivityPanel` does not navigate to stored URLs. Handle attachment access in the
application, reauthorize the user, and generate a fresh short-lived URL:

```tsx
<ActivityPanel
  activity={activity}
  onAttachmentOpen={(attachment, entry) => {
    openAuthorizedDownload(entry.resource, attachment);
  }}
  resource={{ type: "invoice", id: "inv_123" }}
/>
```

See the public [security guidance](https://github.com/andreyshedko/activity/blob/main/SECURITY.md),
[runtime compatibility](https://github.com/andreyshedko/activity/blob/main/COMPATIBILITY.md),
and [API stability policy](https://github.com/andreyshedko/activity/blob/main/API_STABILITY.md)
on GitHub. Release history is maintained in the bundled
[changelog](https://github.com/andreyshedko/activity/blob/main/CHANGELOG.md).

### Themes

Use the `theme` prop to select the built-in light or dark theme, or follow the
operating-system preference:

```tsx
<ActivityPanel
  activity={activity}
  resource={{ type: "invoice", id: "inv_123" }}
  theme="system"
/>
```

Accepted values are `"light"` (the default), `"dark"`, and `"system"`. Themes
are implemented entirely with CSS custom properties. Override them after the
package stylesheet to match your product:

```css
.activity-panel[data-activity-theme="dark"] {
  --activity-color-surface: #09090b;
  --activity-color-text: #e4e4e7;
  --activity-color-accent: #34d399;
  --activity-color-border: #3f3f46;
}
```

### Loading, empty, and error states

The panel keeps existing entries visible while a changed search or filter is
refreshing. Initial loading uses a skeleton sized for the selected `variant`.
The default error state includes a retry button.

Applications can replace empty and error content while retaining the panel's
query lifecycle:

```tsx
<ActivityPanel
  activity={activity}
  renderEmpty={({ hasQuery }) => (
    <MyEmptyState filtered={hasQuery} />
  )}
  renderError={({ error, retry }) => (
    <MyErrorState error={error} onRetry={retry} />
  )}
  resource={{ type: "invoice", id: "inv_123" }}
/>
```

## PostgreSQL

Install a PostgreSQL client in the server application:

```bash
npm install pg
```

Apply the bundled `@feedclip/activity/migration.sql` with your migration tool,
then create an adapter around the pool. Database credentials must remain on the
server:

```ts
import pg from "pg";
import { createActivity } from "@feedclip/activity";
import { postgresAdapter } from "@feedclip/activity/adapters/postgres";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const activity = createActivity({
  adapter: postgresAdapter(pool),
});
```

The migration is exported as `@feedclip/activity/migration.sql` and also lives
at [`migrations/001_activity_schema.sql`](https://github.com/andreyshedko/activity/blob/main/migrations/001_activity_schema.sql).
The [executable PostgreSQL quick start](https://github.com/andreyshedko/activity/blob/main/examples/quickstart/postgres.mjs)
shows migration loading, writing, and paginated reading end to end.
Review the public [migration guidance](https://github.com/andreyshedko/activity/blob/main/MIGRATIONS.md)
before applying database changes.

## Public entrypoints

- `@feedclip/activity` — engine, types, and memory adapter
- `@feedclip/activity/react` — `ActivityPanel`
- `@feedclip/activity/adapters/memory`
- `@feedclip/activity/adapters/postgres`
- `@feedclip/activity/adapters/sqlite`
- `@feedclip/activity/adapters/mysql`
- `@feedclip/activity/adapters/http`
- `@feedclip/activity/http` — Fetch-compatible server handler
- `@feedclip/activity/styles.css`
- `@feedclip/activity/migration.sql`
- `@feedclip/activity/sqlite-migration.sql`
- `@feedclip/activity/mysql-migration.sql`

## Status

Activity is still pre-1.0. The public contracts are usable, but the package has
not yet reached a stable `1.0` compatibility guarantee.

## License

MIT
