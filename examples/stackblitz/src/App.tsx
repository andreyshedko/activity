import { useEffect, useMemo, useState } from "react";
import { createActivity, createMemoryStorageAdapter } from "@feedclip/activity";
import { ActivityPanel } from "@feedclip/activity/react";

const resource = { type: "invoice", id: "inv_stackblitz", title: "Invoice INV-1042" } as const;

export function App() {
  const activity = useMemo(
    () => createActivity({ adapter: createMemoryStorageAdapter() }),
    [],
  );
  const [ready, setReady] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  useEffect(() => {
    void activity.track({
      resource,
      actor: { type: "user", id: "user_1", name: "StackBlitz User" },
      action: "update",
      changes: [{
        field: "status",
        label: "Status",
        before: "Draft",
        after: "Approved",
        valueType: "enum",
      }],
    }).then(() => setReady(true));
  }, [activity]);

  return (
    <main>
      <header>
        <p>Installed from npm</p>
        <h1>@feedclip/activity</h1>
        <code>npm install @feedclip/activity</code>
      </header>
      {ready ? (
        <ActivityPanel
          activity={activity}
          expandedEntryId={expandedEntryId}
          onExpandedEntryChange={(entryId) => {
            setExpandedEntryId(entryId);
            const url = new URL(window.location.href);
            entryId ? url.searchParams.set("activity", entryId) : url.searchParams.delete("activity");
            window.history.replaceState(null, "", url);
          }}
          resource={resource}
        />
      ) : (
        <p role="status">Creating example activity…</p>
      )}
    </main>
  );
}
