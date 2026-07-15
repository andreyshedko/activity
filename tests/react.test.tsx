import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
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
