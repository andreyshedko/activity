# Activity

[![npm](https://img.shields.io/npm/v/@feedclip/activity)](https://www.npmjs.com/package/@feedclip/activity)
[![provenance](https://img.shields.io/badge/npm-provenance-verified-blue)](https://www.npmjs.com/package/@feedclip/activity)
[![license](https://img.shields.io/npm/l/@feedclip/activity)](https://github.com/andreyshedko/activity/blob/main/LICENSE)

[Live demo](https://andreyshedko.github.io/activity/) ·
[StackBlitz](https://stackblitz.com/github/andreyshedko/activity?file=examples%2Fstackblitz%2Fsrc%2FApp.tsx&startScript=stackblitz) ·
[npm](https://www.npmjs.com/package/@feedclip/activity)

Drop-in activity history for React applications, backed by a framework-independent
engine and your own storage. Ship searchable, accessible audit trails for invoices,
customers, tickets, orders, and other business resources without rebuilding the UI.

Activity History is the product; the framework-independent Activity Engine is the
architecture underneath it.

## Install

```bash
npm install @feedclip/activity
```

React 18 or 19 is required only when using the React entrypoint.

Try the package in a clean browser environment with the
[StackBlitz installation example](https://stackblitz.com/github/andreyshedko/activity?file=examples%2Fstackblitz%2Fsrc%2FApp.tsx&startScript=stackblitz).
The example installs the public npm release rather than importing SDK source
files from this repository.

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
[`examples/nextjs`](./examples/nextjs) browser → route handler → PostgreSQL flow.

### Pagination

`activity.query()` remains compatible and returns an array. Use `queryPage()`
when totals and continuation state are required:

```ts
const page = await activity.queryPage?.({ resource, limit: 20, offset: 0 });
// { entries, total, hasMore }
```

`ActivityPanel pageSize={20}` renders an accessible **Load more** action and
appends subsequent pages without replacing entries already on screen.

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
Review the public [migration guidance](https://github.com/andreyshedko/activity/blob/main/MIGRATIONS.md)
before applying database changes.

## Public entrypoints

- `@feedclip/activity` — engine, types, and memory adapter
- `@feedclip/activity/react` — `ActivityPanel`
- `@feedclip/activity/adapters/memory`
- `@feedclip/activity/adapters/postgres`
- `@feedclip/activity/adapters/http`
- `@feedclip/activity/http` — Fetch-compatible server handler
- `@feedclip/activity/styles.css`
- `@feedclip/activity/migration.sql`

## Status

Activity is still pre-1.0. The public contracts are usable, but the package has
not yet reached a stable `1.0` compatibility guarantee.

## License

MIT
