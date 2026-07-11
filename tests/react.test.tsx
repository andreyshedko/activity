import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
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
