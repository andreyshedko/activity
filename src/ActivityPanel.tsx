import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  type Action,
  type Activity,
  type ActivityRecord,
  ActivityError,
  type BuiltInAction,
  type Change,
  type ResourceReference,
} from "./activity";

export type ActivityPanelMessages = {
  [Key in keyof typeof defaultMessages]: string;
};

export type ActivityPanelTheme = "light" | "dark" | "system";
export type ActivityPanelVariant = "default" | "compact" | "comfortable";

export type ActivityPanelEmptyState = {
  hasQuery: boolean;
};

export type ActivityPanelErrorState = {
  error: Error;
  retry: () => void;
};

export type ActivityEntryAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: (entry: ActivityRecord) => void;
  isVisible?: (entry: ActivityRecord) => boolean;
  isDisabled?: (entry: ActivityRecord) => boolean;
};

export type ActivityPanelProps = {
  activity: Activity;
  resource: ResourceReference;
  entries?: ActivityRecord[];
  search?: string;
  filters?: ActivityFilters;
  variant?: ActivityPanelVariant;
  theme?: ActivityPanelTheme;
  onEntryClick?: (entry: ActivityRecord) => void;
  onError?: (error: Error) => void;
  onQueryChange?: (query: ActivityPanelQuery) => void;
  messages?: Partial<ActivityPanelMessages>;
  locale?: string;
  renderEmpty?: (state: ActivityPanelEmptyState) => ReactNode;
  renderError?: (state: ActivityPanelErrorState) => ReactNode;
  entryActions?: readonly ActivityEntryAction[];
};

type ActivityFilters = {
  actions?: readonly Action[];
  actor?: string;
  from?: Date;
  to?: Date;
};

export type ActivityPanelQuery = {
  resource: ResourceReference;
  search?: string;
  actions?: readonly Action[];
  actor?: string;
  from?: Date;
  to?: Date;
};

type Filter = "all" | "updates" | "content" | "lifecycle";
type IconName = "add" | "attachment" | "box" | "chevron-right" | "comment" | "copy" | "file-document";
type EntrySummary = {
  title: string;
  icon: IconName;
  family: "update" | "content" | "lifecycle";
};

const filterActions: Record<Exclude<Filter, "all">, BuiltInAction[]> = {
  updates: ["update"],
  content: ["comment", "attachment"],
  lifecycle: ["create", "delete", "archive", "restore"],
};

const defaultMessages = {
  panelLabel: "Activity history",
  title: "Activity",
  developer: "Developer",
  searchLabel: "Search activity",
  searchPlaceholder: "Search...",
  filterLabel: "Filter by action family",
  filterAll: "All",
  filterUpdates: "Updates",
  filterContent: "Content",
  filterLifecycle: "Lifecycle",
  loadingLabel: "Loading activity",
  refreshingLabel: "Refreshing activity",
  entryActionsLabel: "Entry actions",
  copyIdLabel: "Copy activity id",
  copyIdTitle: "Copy ID",
  changedBy: "Changed by",
  at: "At",
  source: "Source",
  version: "Version",
  application: "Application",
  unversioned: "Unversioned",
  noActivity: "No activity yet",
  noMatches: "No matching activity",
  noActivityHelp: "Tracked entries for this resource will appear here.",
  noMatchesHelp: "Try a broader search or a different action family.",
  loadError: "Activity could not load",
  loadErrorFallback: "The activity query returned an error.",
  retryLabel: "Try again",
  none: "None",
  moreChanges: "more changes",
  updated: "Updated",
  updatedSuffix: "updated",
  comment: "Comment",
  attachment: "Attachment",
  reason: "Reason",
  createdSuffix: "created",
} as const;

export function ActivityPanel({
  activity,
  resource,
  entries: controlledEntries,
  filters,
  onEntryClick,
  onError,
  onQueryChange,
  search,
  theme = "light",
  variant = "default",
  messages: messageOverrides,
  locale,
  renderEmpty,
  renderError,
  entryActions = [],
}: ActivityPanelProps) {
  const messages = { ...defaultMessages, ...messageOverrides };
  const actionLabels: Record<Filter, string> = {
    all: messages.filterAll,
    updates: messages.filterUpdates,
    content: messages.filterContent,
    lifecycle: messages.filterLifecycle,
  };
  const [entries, setEntries] = useState<ActivityRecord[]>(controlledEntries ?? []);
  const [status, setStatus] = useState<"loading" | "refreshing" | "ready" | "error">(
    controlledEntries ? "ready" : "loading",
  );
  const [error, setError] = useState<Error | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [developerMode, setDeveloperMode] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const hasLoaded = useRef(controlledEntries !== undefined);

  const query = search ?? localSearch;
  const activeActions = useMemo(() => {
    if (filters?.actions?.length) {
      return filters.actions;
    }

    return filter === "all" ? undefined : filterActions[filter];
  }, [filter, filters?.actions]);

  useEffect(() => {
    if (controlledEntries) {
      setEntries(controlledEntries);
      hasLoaded.current = true;
      setStatus("ready");
      return;
    }

    let cancelled = false;
    setStatus(hasLoaded.current ? "refreshing" : "loading");
    setError(null);
    const queryOptions: ActivityPanelQuery = {
      resource,
      search: query,
      actions: activeActions,
      actor: filters?.actor,
      from: filters?.from,
      to: filters?.to,
    };
    onQueryChange?.(queryOptions);

    activity
      .query(queryOptions)
      .then((nextEntries) => {
        if (!cancelled) {
          setEntries(nextEntries);
          hasLoaded.current = true;
          setStatus("ready");
        }
      })
      .catch((unknownError: unknown) => {
        const nextError =
          unknownError instanceof Error
            ? unknownError
            : new ActivityError("UNKNOWN_ERROR", "Activity could not load");

        if (!cancelled) {
          setError(nextError);
          setStatus("error");
          onError?.(nextError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activity,
    activeActions,
    controlledEntries,
    filters?.actor,
    filters?.from,
    filters?.to,
    onError,
    onQueryChange,
    query,
    resource,
    retryToken,
  ]);

  const retry = () => setRetryToken((value) => value + 1);
  const hasQuery = query.trim().length > 0 || filter !== "all";

  return (
    <section
      className={`activity-panel activity-panel--${variant}`}
      data-activity-theme={theme}
      aria-label={messages.panelLabel}
    >
      <header className="activity-panel__header">
        <div>
          <p className="eyebrow">{resource.type}</p>
          <h1>{messages.title}</h1>
        </div>
        <label className="developer-toggle">
          <input
            checked={developerMode}
            onChange={(event) => setDeveloperMode(event.currentTarget.checked)}
            type="checkbox"
          />
          {messages.developer}
        </label>
      </header>

      <div className="activity-toolbar">
        <label className="search-field">
          <span aria-hidden="true">/</span>
          <input
            aria-label={messages.searchLabel}
            disabled={search !== undefined}
            onChange={(event) => setLocalSearch(event.currentTarget.value)}
            placeholder={messages.searchPlaceholder}
            value={query}
          />
        </label>
        <div className="segmented-control" aria-label={messages.filterLabel}>
          {(Object.keys(actionLabels) as Filter[]).map((key) => (
            <button
              aria-pressed={filter === key}
              className={filter === key ? "is-active" : ""}
              disabled={Boolean(filters?.actions?.length)}
              key={key}
              onClick={() => setFilter(key)}
              type="button"
            >
              {actionLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" ? (
        <ActivityLoading messages={messages} variant={variant} />
      ) : null}
      {status === "refreshing" ? (
        <div className="activity-refreshing" role="status">
          {messages.refreshingLabel}
        </div>
      ) : null}
      {status === "error" ? (
        renderError && error ? (
          renderError({ error, retry })
        ) : (
          <ActivityErrorState error={error} messages={messages} retry={retry} />
        )
      ) : null}
      {status === "ready" && entries.length === 0 ? (
        renderEmpty ? renderEmpty({ hasQuery }) : (
          <ActivityEmpty hasQuery={hasQuery} messages={messages} />
        )
      ) : null}

      {(status === "ready" || status === "refreshing") && entries.length > 0 ? (
        <div className="activity-stream">
          {entries.map((entry) => (
            <ActivityEntryRow
              developerMode={developerMode}
              entry={entry}
              entryActions={entryActions}
              key={entry.id}
              onEntryClick={onEntryClick}
              messages={messages}
              locale={locale}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ActivityEntryRow({
  developerMode,
  entry,
  entryActions,
  onEntryClick,
  messages,
  locale,
}: {
  developerMode: boolean;
  entry: ActivityRecord;
  entryActions: readonly ActivityEntryAction[];
  onEntryClick?: (entry: ActivityRecord) => void;
  messages: ActivityPanelMessages;
  locale?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const summary = getEntrySummary(entry, messages);
  const visibleActions = entryActions.filter((action) => action.isVisible?.(entry) ?? true);
  return (
    <article className="activity-entry">
      <button
        aria-expanded={expanded}
        className="entry-main"
        onClick={() => {
          setExpanded((value) => !value);
          onEntryClick?.(entry);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setExpanded(false);
            return;
          }

          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            const stream = event.currentTarget.closest(".activity-stream");
            const toggles = Array.from(
              stream?.querySelectorAll<HTMLButtonElement>("button.entry-main") ?? [],
            );
            const currentIndex = toggles.indexOf(event.currentTarget);
            const nextIndex =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? toggles.length - 1
                  : event.key === "ArrowDown"
                    ? Math.min(currentIndex + 1, toggles.length - 1)
                    : Math.max(currentIndex - 1, 0);

            if (toggles[nextIndex]) {
              event.preventDefault();
              toggles[nextIndex].focus();
            }
          }
        }}
        type="button"
      >
        <span className={`entry-icon entry-icon--${summary.family}`}>
          <span className={`gg-icon gg-icon--${summary.icon}`} aria-hidden="true" />
        </span>
        <span className="entry-body">
          <span className="entry-kicker">{summary.title}</span>
          <EntryContent entry={entry} expanded={expanded} messages={messages} locale={locale} />
          <span className="entry-meta">
            {entry.actor.name} <span aria-hidden="true">-</span>{" "}
            {formatTime(entry.timestamp, locale)}
          </span>
        </span>
        <span className="expand-indicator" aria-hidden="true">
          <span
            className={`gg-icon gg-icon--chevron ${expanded ? "is-open" : ""}`}
          />
        </span>
      </button>
      <div className="entry-actions" aria-label={messages.entryActionsLabel}>
        {visibleActions.map((action) => (
          <button
            aria-label={action.label}
            disabled={action.isDisabled?.(entry) ?? false}
            key={action.id}
            onClick={() => action.onSelect(entry)}
            title={action.label}
            type="button"
          >
            {action.icon ?? <span className="entry-action-label">{action.label}</span>}
          </button>
        ))}
        <button
          aria-label={messages.copyIdLabel}
          onClick={() => void copyText(entry.id)}
          title={messages.copyIdTitle}
          type="button"
        >
          <span className="gg-icon gg-icon--copy" aria-hidden="true" />
        </button>
      </div>

      {expanded ? (
        <div className="entry-details">
          <dl>
            <div>
              <dt>{messages.changedBy}</dt>
              <dd>
                {entry.actor.name} <span>{entry.actor.type}</span>
              </dd>
            </div>
            <div>
              <dt>{messages.at}</dt>
              <dd>{formatFullDate(entry.timestamp, locale)}</dd>
            </div>
            <div>
              <dt>{messages.source}</dt>
              <dd>{readMetadata(entry, "source") ?? messages.application}</dd>
            </div>
            <div>
              <dt>{messages.version}</dt>
              <dd>{readMetadata(entry, "version") ?? messages.unversioned}</dd>
            </div>
          </dl>

          {developerMode ? (
            <pre className="developer-json">
              {JSON.stringify(serializeEntry(entry), null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function EntryContent({
  entry,
  expanded,
  messages,
  locale,
}: {
  entry: ActivityRecord;
  expanded: boolean;
  messages: ActivityPanelMessages;
  locale?: string;
}) {
  if (entry.action === "update") {
    return <UpdateChanges changes={entry.changes ?? []} expanded={expanded} messages={messages} locale={locale} />;
  }

  if (entry.action === "comment" && entry.content?.type === "comment") {
    return (
      <span className="content-preview">
        <q>{entry.content.text}</q>
      </span>
    );
  }

  if (entry.action === "attachment" && entry.content?.type === "attachment") {
    return (
      <span className="content-preview">
        <strong>{entry.content.fileName}</strong>
        <small>
          {formatBytes(entry.content.size)} - {entry.content.mimeType}
        </small>
      </span>
    );
  }

  return <span className="content-preview">{getLifecycleBody(entry, messages)}</span>;
}

function UpdateChanges({
  changes,
  expanded,
  messages,
  locale,
}: {
  changes: readonly Readonly<Change>[];
  expanded: boolean;
  messages: ActivityPanelMessages;
  locale?: string;
}) {
  const visibleChanges = expanded ? changes : changes.slice(0, 3);
  const hiddenCount = changes.length - visibleChanges.length;

  return (
    <span className="changes-list">
      {visibleChanges.map((change) => (
        <span className="change-row" key={`${change.field}-${change.label}`}>
          <span>{change.label}</span>
          <span>
            <del>{formatValue(change.before, messages, locale)}</del>
            <ins>{formatValue(change.after, messages, locale)}</ins>
          </span>
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="more-changes">+{hiddenCount} {messages.moreChanges}</span>
      ) : null}
    </span>
  );
}

function ActivityLoading({
  messages,
  variant,
}: {
  messages: ActivityPanelMessages;
  variant: ActivityPanelVariant;
}) {
  const rowCount = variant === "compact" ? 3 : variant === "comfortable" ? 5 : 4;
  return (
    <div
      className={`activity-skeleton activity-skeleton--${variant}`}
      aria-label={messages.loadingLabel}
      role="status"
    >
      {Array.from({ length: rowCount }, (_, index) => (
        <div className="skeleton-row" key={index}>
          <span />
          <div>
            <b />
            <i />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityEmpty({ hasQuery, messages }: { hasQuery: boolean; messages: ActivityPanelMessages }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">-</span>
      <h2>{hasQuery ? messages.noMatches : messages.noActivity}</h2>
      <p>
        {hasQuery
          ? messages.noMatchesHelp
          : messages.noActivityHelp}
      </p>
    </div>
  );
}

function ActivityErrorState({
  error,
  messages,
  retry,
}: {
  error: Error | null;
  messages: ActivityPanelMessages;
  retry: () => void;
}) {
  return (
    <div className="empty-state">
      <h2>{messages.loadError}</h2>
      <p>{error?.message ?? messages.loadErrorFallback}</p>
      <button className="activity-retry" onClick={retry} type="button">
        {messages.retryLabel}
      </button>
    </div>
  );
}

function getEntrySummary(entry: ActivityRecord, messages: ActivityPanelMessages): EntrySummary {
  if (entry.action === "update") {
    return {
      title:
        (entry.changes?.length ?? 0) > 1
          ? `${titleize(entry.resource.type)} ${messages.updatedSuffix}`
          : entry.changes?.[0]?.label ?? messages.updated,
      icon: "file-document",
      family: "update",
    };
  }

  if (entry.action === "comment") {
    return { title: messages.comment, icon: "comment", family: "content" };
  }

  if (entry.action === "attachment") {
    return { title: messages.attachment, icon: "attachment", family: "content" };
  }

  return {
    title: titleize(entry.action),
    icon: entry.action === "archive" ? "box" : "add",
    family: "lifecycle",
  };
}

function getLifecycleBody(entry: ActivityRecord, messages: ActivityPanelMessages) {
  if (entry.action === "create") {
    return entry.resource.title ?? `${entry.resource.type} ${messages.createdSuffix}`;
  }

  const reason = readMetadata(entry, "reason");
  return reason ? `${messages.reason}: ${reason}` : entry.resource.title ?? titleize(entry.action);
}

function readMetadata(entry: ActivityRecord, key: string) {
  const value = entry.metadata?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function formatTime(date: Date, locale?: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFullDate(date: Date, locale?: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  return `${Math.round(kilobytes)} KB`;
}

function formatValue(value: unknown, messages: ActivityPanelMessages, locale?: string) {
  if (value === null || value === undefined) {
    return messages.none;
  }

  if (value instanceof Date) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(value);
  }

  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : JSON.stringify(value);
}

function titleize(value: string) {
  return value
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function serializeEntry(entry: ActivityRecord) {
  return {
    ...entry,
    timestamp: entry.timestamp.toISOString(),
  };
}

async function copyText(value: string) {
  if (globalThis.navigator?.clipboard) {
    await globalThis.navigator.clipboard.writeText(value);
  }
}
