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

See [`SECURITY.md`](./SECURITY.md) for data and attachment security guidance and
[`COMPATIBILITY.md`](./COMPATIBILITY.md) for the supported runtime matrix.
Public API compatibility and deprecation rules are documented in
[`API_STABILITY.md`](./API_STABILITY.md). Release history is maintained in
[`CHANGELOG.md`](./CHANGELOG.md).

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
Deployment and upgrade rules are documented in [`MIGRATIONS.md`](./MIGRATIONS.md).

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
npm run test:e2e
npm run benchmark:postgres
npm run api:check
npm run build
npm run dev
```

`npm test` enforces 100% line, branch, and function coverage for the published
engine, adapters, entrypoints, and React component. `npm run test:e2e` builds the
production demo and runs the Chromium user-journey suite with Playwright.

The PostgreSQL integration suite runs when `DATABASE_URL` is set. The
GitHub Actions workflow provides PostgreSQL automatically; without a database the
integration test is reported as skipped while unit and React tests still run.

Architecture and product decisions are documented in [`spec/README.md`](./spec/README.md).
The [`examples/nextjs`](./examples/nextjs) app verifies the package in a Next.js
App Router production build.

Release preparation and publishing requirements are tracked in
[`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md). Publishing is performed by the
GitHub Release workflow with npm provenance after the `npm` environment and
`NPM_TOKEN` secret are configured.

## Status

Version `0.1.1` is an MVP. The public contracts are usable, but the package has not
yet reached a stable `1.0` compatibility guarantee.

## License

MIT
