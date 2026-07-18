import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import axe from "axe-core";
import { ActivityPanel } from "../src/react";
import type { Activity, ActivityRecord } from "../src";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});

Object.defineProperties(globalThis, {
  document: { configurable: true, value: dom.window.document },
  HTMLElement: { configurable: true, value: dom.window.HTMLElement },
  Node: { configurable: true, value: dom.window.Node },
  navigator: { configurable: true, value: dom.window.navigator },
  window: { configurable: true, value: dom.window },
});

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");

afterEach(() => cleanup());

const activity: Activity = {
  async track() {
    throw new Error("not used");
  },
  async query() {
    return [];
  },
};

const entry: ActivityRecord = Object.freeze({
  id: "evt_1",
  resource: Object.freeze({ type: "invoice", id: "inv_1", title: "Invoice 1" }),
  action: "update",
  actor: Object.freeze({ type: "user", id: "usr_1", name: "Ada Lovelace" }),
  timestamp: new Date("2026-07-11T10:00:00.000Z"),
  changes: Object.freeze([
    Object.freeze({
      field: "status",
      label: "Status",
      before: "Draft",
      after: "Approved",
      valueType: "enum" as const,
    }),
  ]),
});

const secondEntry: ActivityRecord = Object.freeze({
  ...entry,
  id: "evt_2",
  action: "comment",
  content: Object.freeze({ type: "comment", text: "Ready for payment" }),
  changes: undefined,
});

test("controlled ActivityPanel renders localized empty state without querying", () => {
  render(
    <ActivityPanel
      activity={activity}
      entries={[]}
      locale="cs-CZ"
      messages={{ title: "Aktivita", noActivity: "Zatím žádná aktivita" }}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );

  assert.ok(screen.getByRole("heading", { name: "Aktivita" }));
  assert.ok(screen.getByText("Zatím žádná aktivita"));
});

test("ActivityPanel exposes light, dark, and system themes", () => {
  const { rerender } = render(
    <ActivityPanel
      activity={activity}
      entries={[]}
      resource={{ type: "invoice", id: "inv_1" }}
      theme="dark"
    />,
  );

  const panel = screen.getByRole("region", { name: "Activity history" });
  assert.equal(panel.getAttribute("data-activity-theme"), "dark");

  rerender(
    <ActivityPanel
      activity={activity}
      entries={[]}
      resource={{ type: "invoice", id: "inv_1" }}
      theme="system"
    />,
  );
  assert.equal(panel.getAttribute("data-activity-theme"), "system");
});

test("error state retries the failed query", async () => {
  let attempts = 0;
  const retryingActivity: Activity = {
    async track() {
      throw new Error("not used");
    },
    async query() {
      attempts += 1;
      if (attempts === 1) throw new Error("Database unavailable");
      return [];
    },
  };

  render(
    <ActivityPanel
      activity={retryingActivity}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );

  assert.ok(await screen.findByText("Database unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  assert.ok(await screen.findByText("No activity yet"));
  assert.equal(attempts, 2);
});

test("custom empty and error renderers receive state actions", async () => {
  const failingActivity: Activity = {
    async track() {
      throw new Error("not used");
    },
    async query() {
      throw new Error("Custom failure");
    },
  };
  const { rerender } = render(
    <ActivityPanel
      activity={activity}
      entries={[]}
      renderEmpty={({ hasQuery }) => <p>{hasQuery ? "Filtered empty" : "Custom empty"}</p>}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );
  assert.ok(screen.getByText("Custom empty"));

  rerender(
    <ActivityPanel
      activity={failingActivity}
      renderError={({ error, retry }) => (
        <button onClick={retry} type="button">Custom: {error.message}</button>
      )}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );
  assert.ok(await screen.findByRole("button", { name: "Custom: Custom failure" }));
});

test("refreshing keeps existing entries visible", async () => {
  let queryCount = 0;
  let resolveRefresh!: (entries: ActivityRecord[]) => void;
  const refreshingActivity: Activity = {
    async track() {
      throw new Error("not used");
    },
    async query() {
      queryCount += 1;
      if (queryCount === 1) return [entry];
      return new Promise<ActivityRecord[]>((resolve) => {
        resolveRefresh = resolve;
      });
    },
  };
  const resource = { type: "invoice", id: "inv_1" };
  const { rerender } = render(
    <ActivityPanel activity={refreshingActivity} resource={resource} />,
  );
  assert.ok(await screen.findByText("Approved"));

  rerender(
    <ActivityPanel activity={refreshingActivity} resource={resource} search="payment" />,
  );
  assert.ok(await screen.findByText("Refreshing activity"));
  assert.ok(screen.getByText("Approved"));

  resolveRefresh([secondEntry]);
  assert.ok(await screen.findByText("Ready for payment"));
});

test("custom entry actions receive their record and support visibility and disabled state", () => {
  let selectedId = "";
  render(
    <ActivityPanel
      activity={activity}
      entries={[entry]}
      entryActions={[
        {
          id: "open",
          label: "Open invoice",
          onSelect: (selectedEntry) => {
            selectedId = selectedEntry.id;
          },
        },
        {
          id: "approve",
          label: "Approve invoice",
          isDisabled: () => true,
          onSelect: () => undefined,
        },
        {
          id: "hidden",
          label: "Hidden action",
          isVisible: () => false,
          onSelect: () => undefined,
        },
      ]}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Open invoice" }));
  assert.equal(selectedId, entry.id);
  assert.equal(screen.getByRole("button", { name: "Approve invoice" }).hasAttribute("disabled"), true);
  assert.equal(screen.queryByRole("button", { name: "Hidden action" }), null);
});

test("renders every entry family, formatted value, metadata, and developer JSON", () => {
  let clicked = "";
  const richUpdate: ActivityRecord = Object.freeze({
    ...entry,
    metadata: Object.freeze({ source: "API", version: "2" }),
    changes: Object.freeze([
      Object.freeze({ field: "empty", label: "Empty", before: null, after: "Filled", valueType: "string" }),
      Object.freeze({ field: "date", label: "Date", before: new Date("2026-01-01"), after: 42, valueType: "date" }),
      Object.freeze({ field: "json", label: "JSON", before: { a: 1 }, after: true, valueType: "json" }),
      Object.freeze({ field: "owner", label: "Owner", before: "Ada", after: "Grace", valueType: "user" }),
    ]),
  });
  const records: ActivityRecord[] = [
    richUpdate,
    secondEntry,
    Object.freeze({
      ...entry,
      id: "evt_attachment_small",
      action: "attachment",
      changes: undefined,
      content: Object.freeze({ type: "attachment", fileName: "small.txt", mimeType: "text/plain", size: 512 }),
    }),
    Object.freeze({
      ...entry,
      id: "evt_attachment_large",
      action: "attachment",
      changes: undefined,
      content: Object.freeze({ type: "attachment", fileName: "large.pdf", mimeType: "application/pdf", size: 2048 }),
    }),
    Object.freeze({ ...entry, id: "evt_create", action: "create", changes: undefined }),
    Object.freeze({
      ...entry,
      id: "evt_create_fallback",
      action: "create",
      changes: undefined,
      resource: Object.freeze({ type: "invoice", id: "inv_1" }),
    }),
    Object.freeze({
      ...entry,
      id: "evt_archive",
      action: "archive",
      changes: undefined,
      metadata: Object.freeze({ reason: "Duplicate" }),
    }),
    Object.freeze({
      ...entry,
      id: "evt_delete",
      action: "delete",
      changes: undefined,
      resource: Object.freeze({ type: "invoice", id: "inv_1" }),
    }),
  ];
  render(
    <ActivityPanel
      activity={activity}
      entries={records}
      locale="en-US"
      onEntryClick={(selected) => { clicked = selected.id; }}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );

  assert.ok(screen.getByText("+1 more changes"));
  assert.ok(screen.getByText("512 B - text/plain"));
  assert.ok(screen.getByText("2 KB - application/pdf"));
  assert.ok(screen.getByText("Reason: Duplicate"));
  const toggles = screen.getAllByRole("button", { expanded: false });
  fireEvent.click(toggles[0]);
  assert.equal(clicked, richUpdate.id);
  assert.ok(screen.getByText("Grace"));
  assert.ok(screen.getByText("API"));
  assert.ok(screen.getByText("2"));

  fireEvent.click(screen.getByRole("checkbox", { name: "Developer" }));
  assert.ok(document.querySelector(".developer-json"));
});

test("defensively renders update entries without changes", () => {
  render(
    <ActivityPanel
      activity={activity}
      entries={[
        Object.freeze({ ...entry, id: "evt_no_changes", changes: undefined }),
        Object.freeze({ ...entry, id: "evt_empty_changes", changes: Object.freeze([]) }),
      ]}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );
  assert.equal(screen.getAllByText("Updated").length, 2);
});

test("controls expanded entries for URL-backed detail views", () => {
  const changes: Array<{ id: string | null; entry: string }> = [];
  const { rerender } = render(
    <ActivityPanel
      activity={activity}
      entries={[entry, secondEntry]}
      expandedEntryId="evt_2"
      onExpandedEntryChange={(id, selected) => changes.push({ id, entry: selected.id })}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );

  const toggles = screen.getAllByRole("button", { expanded: false });
  assert.equal(document.querySelector("#activity-entry-evt_2") !== null, true);
  assert.equal(screen.getByRole("button", { expanded: true }).closest("article")?.id, "activity-entry-evt_2");

  fireEvent.click(toggles[0]);
  assert.deepEqual(changes.at(-1), { id: "evt_1", entry: "evt_1" });

  const expanded = screen.getByRole("button", { expanded: true });
  fireEvent.keyDown(expanded, { key: "Escape" });
  assert.deepEqual(changes.at(-1), { id: null, entry: "evt_2" });

  rerender(
    <ActivityPanel
      activity={activity}
      entries={[entry, secondEntry]}
      expandedEntryId={null}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );
  assert.equal(screen.queryByRole("button", { expanded: true }), null);
});

test("loads paginated activity without replacing the current page", async () => {
  const offsets: Array<number | undefined> = [];
  const emittedOffsets: Array<number | undefined> = [];
  const paginatedActivity: Activity = {
    async track() { throw new Error("not used"); },
    async query() { throw new Error("queryPage should be preferred"); },
    async queryPage(options) {
      offsets.push(options.offset);
      return options.offset === 1
        ? { entries: [secondEntry], total: 2, hasMore: false }
        : { entries: [entry], total: 2, hasMore: true };
    },
  };

  render(
    <ActivityPanel
      activity={paginatedActivity}
      filters={{
        actor: "usr_1",
        from: new Date("2026-01-01T00:00:00.000Z"),
        to: new Date("2026-12-31T00:00:00.000Z"),
      }}
      messages={{ loadMoreLabel: "More history", loadingMoreLabel: "Loading history" }}
      onQueryChange={(query) => emittedOffsets.push(query.offset)}
      pageSize={1}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );

  const loadMore = await screen.findByRole("button", { name: "More history" });
  fireEvent.click(loadMore);
  assert.ok(await screen.findByText("Ready for payment"));
  assert.deepEqual(offsets, [0, 1]);
  assert.deepEqual(emittedOffsets, [0, 1]);
  assert.equal(screen.queryByRole("button", { name: "More history" }), null);
});

test("keeps paginated entries visible when loading another page fails", async () => {
  const errors: string[] = [];
  let resolveFailure!: () => void;
  let failures = 0;
  const paginatedActivity: Activity = {
    async track() { throw new Error("not used"); },
    async query() { return []; },
    async queryPage(options) {
      if (options.offset === 0) return { entries: [entry], total: 2, hasMore: true };
      await new Promise<void>((resolve) => { resolveFailure = resolve; });
      failures += 1;
      throw failures === 1 ? "offline" : new Error("Still offline");
    },
  };

  render(
    <ActivityPanel
      activity={paginatedActivity}
      onError={(error) => errors.push(error.message)}
      pageSize={1}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );
  const button = await screen.findByRole("button", { name: "Load more" });
  fireEvent.click(button);
  assert.equal(screen.getByRole("button", { name: "Loading more activity" }).hasAttribute("disabled"), true);
  resolveFailure();
  assert.ok(await screen.findByRole("button", { name: "Load more" }));
  assert.deepEqual(errors, ["Activity could not load"]);
  assert.ok(screen.getAllByText("Status", { exact: true }).length > 0);

  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  resolveFailure();
  assert.ok(await screen.findByRole("button", { name: "Load more" }));
  assert.deepEqual(errors, ["Activity could not load", "Still offline"]);
});

test("local search and action-family controls emit normalized panel queries", async () => {
  const queries: Array<{ search?: string; actions?: readonly string[] }> = [];
  const queryActivity: Activity = {
    async track() { throw new Error("not used"); },
    async query() { return []; },
  };
  render(
    <ActivityPanel
      activity={queryActivity}
      onQueryChange={(query) => queries.push(query)}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );
  await screen.findByText("No activity yet");
  fireEvent.change(screen.getByRole("textbox", { name: "Search activity" }), { target: { value: "paid" } });
  await screen.findByText("No matching activity");

  for (const name of ["Updates", "Content", "Lifecycle", "All"]) {
    fireEvent.click(screen.getByRole("button", { name }));
  }
  assert.ok(queries.some((query) => query.search === "paid"));
  assert.ok(queries.some((query) => query.actions?.includes("comment")));
  assert.ok(queries.some((query) => query.actions?.includes("archive")));
});

test("controlled filters disable family controls and reach the activity query", async () => {
  let received: unknown;
  const filteredActivity: Activity = {
    async track() { throw new Error("not used"); },
    async query(options) {
      received = options;
      return [];
    },
  };
  render(
    <ActivityPanel
      activity={filteredActivity}
      filters={{
        actions: ["update"],
        actor: "usr_1",
        from: new Date("2026-01-01"),
        to: new Date("2026-12-31"),
      }}
      resource={{ type: "invoice", id: "inv_1" }}
      search="fixed"
      variant="compact"
    />,
  );
  await screen.findByText("No matching activity");
  assert.equal(screen.getByRole("textbox", { name: "Search activity" }).hasAttribute("disabled"), true);
  assert.equal(screen.getByRole("button", { name: "Updates" }).hasAttribute("disabled"), true);
  assert.equal((received as { actor: string }).actor, "usr_1");
});

test("loading skeletons honor every variant", () => {
  const pendingActivity: Activity = {
    async track() { throw new Error("not used"); },
    async query() { return new Promise<ActivityRecord[]>(() => undefined); },
  };
  for (const [variant, rows] of [["compact", 3], ["default", 4], ["comfortable", 5]] as const) {
    const { unmount } = render(
      <ActivityPanel
        activity={pendingActivity}
        resource={{ type: "invoice", id: variant }}
        variant={variant}
      />,
    );
    assert.equal(document.querySelectorAll(".skeleton-row").length, rows);
    unmount();
  }
});

test("non-Error query failures are normalized and reported", async () => {
  let reported: Error | undefined;
  const failingActivity: Activity = {
    async track() { throw new Error("not used"); },
    async query() { throw "failure"; },
  };
  render(
    <ActivityPanel
      activity={failingActivity}
      onError={(error) => { reported = error; }}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );
  assert.ok(await screen.findByRole("heading", { name: "Activity could not load" }));
  assert.equal(reported?.message, "Activity could not load");
});

test("ignores a query failure after the panel unmounts", async () => {
  let rejectQuery!: (error: unknown) => void;
  const errors: Error[] = [];
  const pendingActivity: Activity = {
    async track() { throw new Error("not used"); },
    async query() {
      return new Promise<ActivityRecord[]>((_, reject) => { rejectQuery = reject; });
    },
  };
  const view = render(
    <ActivityPanel
      activity={pendingActivity}
      onError={(error) => errors.push(error)}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );
  view.unmount();
  rejectQuery(new Error("late failure"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(errors, []);
});

test("custom icons, copy, and fallback metadata remain accessible", () => {
  let copied = "";
  Object.defineProperty(dom.window.navigator, "clipboard", {
    configurable: true,
    value: { async writeText(value: string) { copied = value; } },
  });
  render(
    <ActivityPanel
      activity={activity}
      entries={[entry]}
      entryActions={[{
        id: "icon",
        label: "Icon action",
        icon: <span data-testid="custom-icon">*</span>,
        onSelect: () => undefined,
      }]}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );
  assert.ok(screen.getByTestId("custom-icon"));
  fireEvent.click(screen.getByRole("button", { name: "Copy activity id" }));
  assert.equal(copied, entry.id);
  fireEvent.click(screen.getByRole("button", { expanded: false }));
  assert.ok(screen.getByText("Application"));
  assert.ok(screen.getByText("Unversioned"));
  Object.defineProperty(dom.window.navigator, "clipboard", { configurable: true, value: undefined });
  fireEvent.click(screen.getByRole("button", { name: "Copy activity id" }));
});

test("attachment open handler receives the immutable attachment and entry", () => {
  const attachment = Object.freeze({
    type: "attachment" as const,
    fileName: "invoice.pdf",
    mimeType: "application/pdf",
    size: 2048,
    url: "https://cdn.example.com/invoice.pdf",
  });
  const attachmentEntry: ActivityRecord = Object.freeze({
    ...entry,
    id: "evt_attachment_open",
    action: "attachment",
    changes: undefined,
    content: attachment,
  });
  let opened: { fileName: string; entryId: string } | undefined;
  render(
    <ActivityPanel
      activity={activity}
      entries={[attachmentEntry, entry]}
      onAttachmentOpen={(selectedAttachment, selectedEntry) => {
        opened = { fileName: selectedAttachment.fileName, entryId: selectedEntry.id };
      }}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open attachment: invoice.pdf" }));
  assert.deepEqual(opened, { fileName: "invoice.pdf", entryId: attachmentEntry.id });
  assert.equal(screen.getAllByRole("button", { name: /Open attachment/ }).length, 1);
});

test("entry expands inline and Escape collapses it", () => {
  render(
    <ActivityPanel
      activity={activity}
      entries={[entry]}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );

  const toggle = screen.getByRole("button", { expanded: false });
  fireEvent.click(toggle);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.ok(screen.getByText("Changed by"));

  fireEvent.keyDown(toggle, { key: "Escape" });
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
});

test("arrow, Home, and End keys move focus between entries", () => {
  render(
    <ActivityPanel
      activity={activity}
      entries={[entry, secondEntry]}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );

  const toggles = screen.getAllByRole("button", { expanded: false });
  toggles[0].focus();
  fireEvent.keyDown(toggles[0], { key: "ArrowDown" });
  assert.equal(document.activeElement, toggles[1]);
  fireEvent.keyDown(toggles[1], { key: "Home" });
  assert.equal(document.activeElement, toggles[0]);
  fireEvent.keyDown(toggles[0], { key: "End" });
  assert.equal(document.activeElement, toggles[1]);
  fireEvent.keyDown(toggles[1], { key: "ArrowUp" });
  assert.equal(document.activeElement, toggles[0]);
});

test("rendered panel has no automated axe violations", async () => {
  const { container } = render(
    <ActivityPanel
      activity={activity}
      entries={[entry, secondEntry]}
      resource={{ type: "invoice", id: "inv_1" }}
    />,
  );

  const result = await axe.run(container, {
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
    },
  });
  assert.deepEqual(
    result.violations.map(({ id }) => id),
    [],
  );
});
