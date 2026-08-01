import type { ActivityRecord } from "./activity";

export type ActivityDayGroup = Readonly<{
  date: string;
  entries: readonly ActivityRecord[];
}>;

export type CollapsedActivityGroup = Readonly<{
  key: string;
  entries: readonly ActivityRecord[];
  first: ActivityRecord;
  last: ActivityRecord;
}>;

export type ActivityFeedStore = Readonly<{
  getSnapshot(): readonly ActivityRecord[];
  subscribe(listener: () => void): () => void;
  replace(entries: readonly ActivityRecord[]): void;
  prepend(entry: ActivityRecord): void;
  remove(id: string): void;
}>;

export function createActivityFeed(
  initialEntries: readonly ActivityRecord[] = [],
): ActivityFeedStore {
  let entries = [...initialEntries];
  const listeners = new Set<() => void>();
  const update = (next: ActivityRecord[]) => {
    entries = next;
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => entries,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    replace: (next) => update([...next]),
    prepend: (entry) => update([entry, ...entries.filter(({ id }) => id !== entry.id)]),
    remove: (id) => update(entries.filter((entry) => entry.id !== id)),
  };
}

export function groupActivityByDay(
  entries: readonly ActivityRecord[],
  locale = "en-CA",
  timeZone = "UTC",
): ActivityDayGroup[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  });
  const groups = new Map<string, ActivityRecord[]>();
  for (const entry of entries) {
    const date = formatter.format(entry.timestamp);
    const group = groups.get(date) ?? [];
    group.push(entry);
    groups.set(date, group);
  }
  return [...groups].map(([date, groupedEntries]) => ({
    date,
    entries: groupedEntries,
  }));
}

export function collapseActivityEntries(
  entries: readonly ActivityRecord[],
  options: {
    windowMs?: number;
    key?: (entry: ActivityRecord) => string;
  } = {},
): CollapsedActivityGroup[] {
  const windowMs = options.windowMs ?? 60_000;
  const key = options.key ?? ((entry) => `${entry.resource.type}:${entry.resource.id}:${entry.actor.id}:${entry.action}`);
  const groups: CollapsedActivityGroup[] = [];

  for (const entry of entries) {
    const entryKey = key(entry);
    const previous = groups[groups.length - 1];
    if (
      previous?.key === entryKey &&
      Math.abs(previous.last.timestamp.getTime() - entry.timestamp.getTime()) <= windowMs
    ) {
      groups[groups.length - 1] = {
        ...previous,
        entries: [...previous.entries, entry],
        last: entry,
      };
    } else {
      groups.push({ key: entryKey, entries: [entry], first: entry, last: entry });
    }
  }
  return groups;
}

export function retainActivityEntries(
  entries: readonly ActivityRecord[],
  options: { after?: Date; before?: Date },
): ActivityRecord[] {
  const after = options.after?.getTime();
  const before = options.before?.getTime();
  return entries.filter((entry) => {
    const timestamp = entry.timestamp.getTime();
    return (after === undefined || timestamp >= after) &&
      (before === undefined || timestamp <= before);
  });
}

export function exportActivityEntries(
  entries: readonly ActivityRecord[],
  format: "json" | "csv" = "json",
): string {
  if (format === "json") return JSON.stringify(entries, null, 2);
  const header = ["id", "timestamp", "resourceType", "resourceId", "action", "actorId", "actorName"];
  const rows = entries.map((entry) => [
    entry.id,
    entry.timestamp.toISOString(),
    entry.resource.type,
    entry.resource.id,
    entry.action,
    entry.actor.id,
    entry.actor.name,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
