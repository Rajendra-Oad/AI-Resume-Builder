import { expect, test } from "@playwright/test";

test("a keyboard user can navigate from the landing page to sign in", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /a resume that opens doors/i })).toBeVisible();
  await page.getByRole("link", { name: "Sign in" }).focus();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/login$/);
  const heading = page.getByRole("heading", { name: "Sign in to your workspace" });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
});

test("unknown routes render a useful not-found page", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /home/i })).toBeVisible();
});
