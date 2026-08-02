import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { apiData, json, mockAuthenticatedApi } from "../support/mockApi";

test("public authentication flow has no serious accessibility violations", async ({ page }) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact)),
  ).toEqual([]);

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
});

test("authenticated navigation remains operable at the project viewport", async ({ page }) => {
  await mockAuthenticatedApi(page, {
    "GET /api/v1/analytics/overview": (route) => json(route, apiData({ totals: {} })),
  });
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: /Good to see you/i })).toBeVisible({
    timeout: 15_000,
  });
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  } else {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  }
});

test("authenticated dashboard has no serious accessibility violations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockAuthenticatedApi(page, {
    "GET /api/v1/analytics/overview": (route) => json(route, apiData({ totals: {} })),
  });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Good to see you/i })).toBeVisible({
    timeout: 15_000,
  });

  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact)),
  ).toEqual([]);
});

test("sidebar and command results scroll independently on short screens", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 320 });
  await mockAuthenticatedApi(page, {
    "GET /api/v1/analytics/overview": (route) => json(route, apiData({ totals: {} })),
  });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Good to see you/i })).toBeVisible({
    timeout: 15_000,
  });

  const sidebar = page.locator("#primary-sidebar");
  await expect(sidebar).toHaveCSS("overflow-y", "auto");
  await expect
    .poll(() => sidebar.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(true);
  await sidebar.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect.poll(() => sidebar.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await page.getByRole("button", { name: /Search or jump/i }).click();
  const results = page.locator(".command-results");
  await expect(results).toHaveCSS("overflow-y", "auto");
  await expect
    .poll(() => results.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(true);
  await results.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect.poll(() => results.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});
