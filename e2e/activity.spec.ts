import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Activity", exact: true })).toBeVisible();
  const panel = page.getByRole("region", { name: "Activity history" });
  await expect(panel.getByText("Status", { exact: true }).first()).toBeVisible();
});

test("searches and filters the activity stream", async ({ page }) => {
  const panel = page.getByRole("region", { name: "Activity history" });
  await page.getByRole("textbox", { name: "Search activity" }).fill("contract-v3");
  await expect(page.getByText("contract-v3.pdf")).toBeVisible();
  await expect(panel.getByText("Status", { exact: true })).not.toBeVisible();

  await page.getByRole("textbox", { name: "Search activity" }).fill("");
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await expect(page.getByText("Customer confirmed the updated delivery window.")).toBeVisible();
  await expect(page.getByText("contract-v3.pdf")).toBeVisible();
  await expect(panel.getByText("Status", { exact: true })).not.toBeVisible();
});

test("switches resources without leaking entries", async ({ page }) => {
  await page.getByRole("button", { name: /customer Northstar Supply/i }).click();
  await expect(page.getByRole("heading", { name: "Northstar Supply" })).toBeVisible();
  await expect(page.getByText("Health", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("contract-v3.pdf")).not.toBeVisible();
});

test("expands an entry and exposes developer details", async ({ page }) => {
  const firstEntry = page.locator("button.entry-main").first();
  await expect(page.getByText("+1 more changes")).toBeVisible();
  await firstEntry.click();
  await expect(firstEntry).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Changed by")).toBeVisible();
  await expect(page.getByText("v124").first()).toBeVisible();

  await page.getByRole("checkbox", { name: "Developer" }).check();
  await expect(page.locator(".developer-json")).toContainText("evt_1007");
  await firstEntry.press("Escape");
  await expect(firstEntry).toHaveAttribute("aria-expanded", "false");
});

test("opens and clears a deep-linked activity detail", async ({ page }) => {
  await page.goto("/#activity-entry-evt_1007");
  const linkedEntry = page.locator("#activity-entry-evt_1007");
  const toggle = linkedEntry.locator("button.entry-main");

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL(/#activity-entry-evt_1007$/);
  await toggle.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page).not.toHaveURL(/#activity-entry-/);
});

test("delegates attachment opening to the host application", async ({ page }) => {
  const attachmentEntry = page.locator(".activity-entry").filter({ hasText: "contract-v3.pdf" });
  await attachmentEntry.hover();
  await attachmentEntry.getByRole("button", { name: "Open attachment: contract-v3.pdf" }).click();
  await expect(page.getByRole("status")).toHaveText("Application received attachment: contract-v3.pdf");
});

test("supports keyboard navigation across activity entries", async ({ page }) => {
  const entries = page.locator("button.entry-main");
  await entries.first().focus();
  await entries.first().press("ArrowDown");
  await expect(entries.nth(1)).toBeFocused();
  await entries.nth(1).press("End");
  await expect(entries.last()).toBeFocused();
  await entries.last().press("Home");
  await expect(entries.first()).toBeFocused();
});

test("switches light, dark, and system themes", async ({ page }) => {
  const panel = page.getByRole("region", { name: "Activity history" });
  await expect(panel).toHaveAttribute("data-activity-theme", "light");
  await page.getByRole("button", { name: "dark", exact: true }).click();
  await expect(panel).toHaveAttribute("data-activity-theme", "dark");
  await expect(panel).toHaveCSS("color-scheme", "dark");
  await page.getByRole("button", { name: "system", exact: true }).click();
  await expect(panel).toHaveAttribute("data-activity-theme", "system");
});

test("recovers from a query error through retry", async ({ page }) => {
  await page.getByRole("button", { name: "error", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Activity could not load" })).toBeVisible();
  await expect(page.getByText("Demo query failed")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Status", { exact: true }).first()).toBeVisible();
});

test("tracks a new update through the demo composer", async ({ page }) => {
  await page.getByLabel("Change label").fill("Review state");
  await page.getByLabel("Before").fill("Queued");
  await page.getByLabel("After").fill("Reviewed by E2E");
  await page.getByRole("button", { name: "Track update" }).click();

  await expect(page.getByText("Review state", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Reviewed by E2E")).toBeVisible();
  await expect(page.getByText("Demo User").first()).toBeVisible();
});

test("shows refreshing and empty demo states", async ({ page }) => {
  await page.getByRole("button", { name: "loading", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Refreshing activity");
  await expect(page.getByRole("region", { name: "Activity history" }).getByText("Status", { exact: true }).first()).toBeVisible({ timeout: 3_000 });

  await page.getByRole("button", { name: "empty", exact: true }).click();
  await expect(page.getByText("No activity yet")).toBeVisible();
});

test("has no automatically detectable accessibility violations", async ({ page }) => {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return result.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target),
    }));
  });

  expect(violations).toEqual([]);
});

declare global {
  interface Window {
    axe: typeof import("axe-core");
  }
}
