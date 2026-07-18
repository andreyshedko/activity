import { useEffect, useMemo, useState } from "react";
import {
  ActivityPanel,
  type ActivityPanelQuery,
  type ActivityPanelTheme,
} from "./ActivityPanel";
import { createActivity, createMemoryStorageAdapter, type Action } from "./activity";
import { activityEntries, demoResources } from "./mockData";

type DemoState = "default" | "loading" | "empty" | "error";
type ComposerMode = "update" | "comment";
type AdapterMode = "memory" | "postgres";

export function App() {
  const [state, setState] = useState<DemoState>("default");
  const [theme, setTheme] = useState<ActivityPanelTheme>("light");
  const [selectedResourceId, setSelectedResourceId] = useState(
    demoResources[0].resource.id,
  );
  const [refreshToken, setRefreshToken] = useState(0);
  const [composerMode, setComposerMode] = useState<ComposerMode>("update");
  const [changeLabel, setChangeLabel] = useState("Status");
  const [beforeValue, setBeforeValue] = useState("Pending");
  const [afterValue, setAfterValue] = useState("Reviewed");
  const [commentText, setCommentText] = useState("Captured from the demo composer.");
  const [isTracking, setIsTracking] = useState(false);
  const [lastQuery, setLastQuery] = useState<ActivityPanelQuery>({
    resource: demoResources[0].resource,
  });
  const [adapterMode, setAdapterMode] = useState<AdapterMode>("memory");
  const [openedAttachment, setOpenedAttachment] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const selectedResource =
    demoResources.find((item) => item.resource.id === selectedResourceId) ??
    demoResources[0];
  const activity = useMemo(() => {
    const entries = state === "empty" ? [] : activityEntries;
    const latency = state === "loading" ? 1200 : 260;

    const adapter = createMemoryStorageAdapter(entries, latency);
    if (state === "error") {
      let failNextQuery = true;
      return createActivity({
        adapter: {
          ...adapter,
          async query(options) {
            if (failNextQuery) {
              failNextQuery = false;
              throw new Error("Demo query failed");
            }
            return adapter.query(options);
          },
        },
      });
    }

    return createActivity({ adapter });
  }, [state]);

  useEffect(() => {
    const readHash = () => {
      const prefix = "#activity-entry-";
      setExpandedEntryId(
        window.location.hash.startsWith(prefix)
          ? decodeURIComponent(window.location.hash.slice(prefix.length))
          : null,
      );
    };

    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  const selectEntry = (entryId: string | null) => {
    setExpandedEntryId(entryId);
    const hash = entryId
      ? `#activity-entry-${encodeURIComponent(entryId)}`
      : `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", hash);
  };
  const trackExample = async () => {
    setIsTracking(true);
    try {
      const action: Action = composerMode;
      await activity.track({
        resource: selectedResource.resource,
        action,
        actor: {
          type: "user",
          id: "usr_demo",
          name: "Demo User",
        },
        changes:
          composerMode === "update"
            ? [
                {
                  field: slugify(changeLabel || "field"),
                  label: changeLabel || "Field",
                  before: beforeValue || "None",
                  after: afterValue || "Updated",
                  valueType: "string",
                },
              ]
            : undefined,
        content:
          composerMode === "comment"
            ? {
                type: "comment",
                text: commentText || "New comment from the demo composer.",
              }
            : undefined,
        metadata: {
          source: "Demo Composer",
          version: "local",
        },
      });
      setRefreshToken((value) => value + 1);
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="workspace-topbar">
        <div>
          <strong>Activity History</strong>
          <span>Drop-in audit trails for React applications</span>
        </div>
        <div className="demo-controls" aria-label="Demo state">
          {(["default", "loading", "empty", "error"] as DemoState[]).map((item) => (
            <button
              aria-pressed={state === item}
              className={state === item ? "is-active" : ""}
              key={item}
              onClick={() => setState(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="demo-controls" aria-label="Activity theme">
          {(["light", "dark", "system"] as ActivityPanelTheme[]).map((item) => (
            <button
              aria-pressed={theme === item}
              className={theme === item ? "is-active" : ""}
              key={item}
              onClick={() => setTheme(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <section className="object-header" aria-label="Selected resource summary">
        <div>
          <p className="eyebrow">{selectedResource.productArea}</p>
          <h1>{selectedResource.resource.title}</h1>
          <p>{selectedResource.description}</p>
        </div>
        <div className="object-actions">
          <button type="button">{selectedResource.secondaryAction}</button>
          <button className="primary-action" type="button">
            {selectedResource.primaryAction}
          </button>
        </div>
      </section>

      <nav className="resource-switcher" aria-label="Resource examples">
        {demoResources.map((item) => (
          <button
            aria-pressed={item.resource.id === selectedResource.resource.id}
            className={item.resource.id === selectedResource.resource.id ? "is-active" : ""}
            key={item.resource.id}
            onClick={() => setSelectedResourceId(item.resource.id)}
            type="button"
          >
            <span>{item.resource.type}</span>
            <strong>{item.resource.title}</strong>
          </button>
        ))}
      </nav>

      <section className="workspace-grid">
        <section className="resource-panel" aria-label="Resource details">
          <div className="resource-panel__header">
            <h2>Resource contract</h2>
            <span>Updated {selectedResource.updatedAt}</span>
          </div>
          <dl className="field-grid">
            {selectedResource.fields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="developer-snippet">
            <div>
              <h2>Developer handoff</h2>
              <p>
                Activity stores a resource reference, not invoice/customer/payment code.
              </p>
            </div>
            <pre>
              <code>{`const activity = createActivity({
  adapter: postgresAdapter(db)
});

await activity.track({
  resource: {
    type: "${selectedResource.resource.type}",
    id: "${selectedResource.resource.id}"
  },
  action: "update",
  actor,
  changes
});

<ActivityPanel
  activity={activity}
  resource={{
    type: "${selectedResource.resource.type}",
    id: "${selectedResource.resource.id}"
  }}
/>`}</code>
            </pre>
          </div>
          <AdapterInspector
            mode={adapterMode}
            onModeChange={setAdapterMode}
            state={state}
          />
          <form
            className="track-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void trackExample();
            }}
          >
            <div className="track-composer__header">
              <div>
                <h2>Track event</h2>
                <p>Submit writes to the same Activity instance this panel queries.</p>
              </div>
              <select
                aria-label="Event action"
                onChange={(event) => setComposerMode(event.currentTarget.value as ComposerMode)}
                value={composerMode}
              >
                <option value="update">Update</option>
                <option value="comment">Comment</option>
              </select>
            </div>

            {composerMode === "update" ? (
              <div className="composer-grid">
                <label>
                  Change label
                  <input
                    onChange={(event) => setChangeLabel(event.currentTarget.value)}
                    value={changeLabel}
                  />
                </label>
                <label>
                  Before
                  <input
                    onChange={(event) => setBeforeValue(event.currentTarget.value)}
                    value={beforeValue}
                  />
                </label>
                <label>
                  After
                  <input
                    onChange={(event) => setAfterValue(event.currentTarget.value)}
                    value={afterValue}
                  />
                </label>
              </div>
            ) : (
              <label className="composer-comment">
                Comment
                <textarea
                  onChange={(event) => setCommentText(event.currentTarget.value)}
                  rows={3}
                  value={commentText}
                />
              </label>
            )}

            <button className="primary-action" disabled={isTracking} type="submit">
              {isTracking ? "Tracking..." : `Track ${composerMode}`}
            </button>
          </form>
        </section>

        <div className="activity-column">
          <ActivityPanel
            activity={activity}
            expandedEntryId={expandedEntryId}
            key={`${selectedResource.resource.type}:${selectedResource.resource.id}:${refreshToken}`}
            onAttachmentOpen={(attachment) => setOpenedAttachment(attachment.fileName)}
            onExpandedEntryChange={selectEntry}
            onQueryChange={setLastQuery}
            resource={selectedResource.resource}
            theme={theme}
          />
          {openedAttachment ? (
            <p className="attachment-demo-status" role="status">
              Application received attachment: {openedAttachment}
            </p>
          ) : null}
          <QueryInspector query={lastQuery} />
        </div>
      </section>
    </main>
  );
}

function AdapterInspector({
  mode,
  onModeChange,
  state,
}: {
  mode: AdapterMode;
  onModeChange: (mode: AdapterMode) => void;
  state: DemoState;
}) {
  const adapterCode =
    mode === "memory"
      ? `const activity = createActivity({
  adapter: createMemoryStorageAdapter(seedEntries, ${state === "loading" ? 1200 : state === "empty" ? 0 : 260})
});`
      : `const activity = createActivity({
  adapter: postgresAdapter(db)
});`;

  const boundary =
    mode === "memory"
      ? "Live demo adapter: insert() mutates local memory, query() filters by resource/action/search."
      : "Production adapter contract: insert() writes activity_entries/activity_changes, query() reads by resource indexes.";

  return (
    <section className="adapter-inspector" aria-label="Storage adapter boundary">
      <div className="adapter-inspector__header">
        <div>
          <h2>Storage adapter</h2>
          <p>{boundary}</p>
        </div>
        <div className="adapter-toggle" aria-label="Storage adapter mode">
          {(["memory", "postgres"] as AdapterMode[]).map((item) => (
            <button
              aria-pressed={mode === item}
              className={mode === item ? "is-active" : ""}
              key={item}
              onClick={() => onModeChange(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <pre>
        <code>{adapterCode}</code>
      </pre>
      <dl className="adapter-contract">
        <div>
          <dt>Core depends on</dt>
          <dd>StorageAdapter.insert / StorageAdapter.query</dd>
        </div>
        <div>
          <dt>UI depends on</dt>
          <dd>Activity.track / Activity.query</dd>
        </div>
        <div>
          <dt>Postgres schema</dt>
          <dd>migrations/001_activity_schema.sql</dd>
        </div>
      </dl>
    </section>
  );
}

function QueryInspector({ query }: { query: ActivityPanelQuery }) {
  return (
    <section className="query-inspector" aria-label="Query inspector">
      <div>
        <p className="eyebrow">Query inspector</p>
        <h2>ActivityPanel calls the same SDK contract</h2>
      </div>
      <pre>
        <code>{`await activity.query(${JSON.stringify(toSerializableQuery(query), null, 2)})`}</code>
      </pre>
    </section>
  );
}

function toSerializableQuery(query: ActivityPanelQuery) {
  return {
    resource: {
      type: query.resource.type,
      id: query.resource.id,
    },
    ...(query.search ? { search: query.search } : {}),
    ...(query.actions?.length ? { actions: query.actions } : {}),
    ...(query.actor ? { actor: query.actor } : {}),
    ...(query.from ? { from: query.from.toISOString() } : {}),
    ...(query.to ? { to: query.to.toISOString() } : {}),
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
