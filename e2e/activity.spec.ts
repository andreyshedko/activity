import { expect, test } from "@playwright/test";

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
