import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityRecord } from "../src/activity";
import {
  collapseActivityEntries,
  createActivityFeed,
  exportActivityEntries,
  groupActivityByDay,
  retainActivityEntries,
} from "../src/headless";

const entry = (id: string, timestamp: string, action = "update", actorId = "user_1"): ActivityRecord => ({
  id,
  timestamp: new Date(timestamp),
  resource: { type: "invoice", id: "inv_1" },
  actor: { type: "user", id: actorId, name: 'Ada "A"' },
  action,
});

test("headless feed supports optimistic and real-time host updates", () => {
  const first = entry("1", "2026-08-01T10:00:00Z");
  const second = entry("2", "2026-08-01T10:01:00Z");
  const feed = createActivityFeed([first]);
  let updates = 0;
  const unsubscribe = feed.subscribe(() => { updates += 1; });
  feed.prepend(second);
  feed.prepend(second);
  assert.deepEqual(feed.getSnapshot().map(({ id }) => id), ["2", "1"]);
  feed.remove("2");
  feed.replace([second]);
  unsubscribe();
  feed.remove("2");
  assert.equal(updates, 4);
  assert.deepEqual(createActivityFeed().getSnapshot(), []);
});

test("headless defaults and boundary filters are deterministic", () => {
  const first = entry("1", "2026-08-01T10:00:00Z");
  const later = entry("2", "2026-08-01T10:02:00Z");
  assert.equal(groupActivityByDay([first]).length, 1);
  assert.equal(collapseActivityEntries([first, later]).length, 2);
  assert.equal(collapseActivityEntries([first, later], { windowMs: 180_000 }).length, 1);
  assert.deepEqual(retainActivityEntries([first, later], {}).map(({ id }) => id), ["1", "2"]);
  assert.deepEqual(retainActivityEntries([first, later], { after: later.timestamp }).map(({ id }) => id), ["2"]);
  assert.deepEqual(retainActivityEntries([first, later], { before: first.timestamp }).map(({ id }) => id), ["1"]);
});

test("headless utilities group, collapse, retain, and export activity", () => {
  const entries = [
    entry("1", "2026-08-01T10:00:00Z"),
    entry("2", "2026-08-01T10:00:30Z"),
    entry("3", "2026-08-02T10:00:00Z", "comment"),
  ];

  const days = groupActivityByDay(entries, "en-CA", "UTC");
  assert.equal(days.length, 2);
  assert.equal(days[0].entries.length, 2);

  const collapsed = collapseActivityEntries(entries);
  assert.equal(collapsed.length, 2);
  assert.deepEqual(collapsed[0].entries.map(({ id }) => id), ["1", "2"]);
  assert.equal(collapseActivityEntries(entries, { key: ({ id }) => id }).length, 3);

  assert.deepEqual(
    retainActivityEntries(entries, {
      after: new Date("2026-08-01T10:00:10Z"),
      before: new Date("2026-08-02T10:00:00Z"),
    }).map(({ id }) => id),
    ["2", "3"],
  );
  assert.match(exportActivityEntries(entries), /2026-08-01T10:00:00.000Z/);
  assert.match(exportActivityEntries(entries, "csv"), /"Ada ""A"""/);
});
