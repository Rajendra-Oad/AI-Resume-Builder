import { expect, test } from "@playwright/test";

import {
  apiData,
  json,
  mockAuthenticatedApi,
  mockSignedOutApi,
  profile,
  session,
} from "./support/mockApi";

test("a signed-out visitor is redirected from a protected page", async ({ page }) => {
  await mockSignedOutApi(page);

  await page.goto("/resumes");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeFocused();
});

test("a user can sign in and see the dashboard", async ({ page }) => {
  await mockSignedOutApi(page, {
    "POST /api/v1/auth/login": (route) => json(route, apiData(session)),
    "GET /api/v1/users/me": (route) => json(route, apiData(profile)),
    "GET /api/v1/resumes": (route) => json(route, apiData([])),
  });

  await page.goto("/login");
  await page.getByLabel("Email or verified phone number").fill("alex@example.com");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Welcome back, alex." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your story starts here" })).toBeVisible();
});

test("an incomplete profile is sent to onboarding", async ({ page }) => {
  await mockAuthenticatedApi(page, {
    "GET /api/v1/users/me": (route) =>
      json(route, apiData({ ...profile, onboardingCompleted: false })),
  });

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "Where are you in your career?" })).toBeVisible();
});

test("an authenticated user can open their resume list", async ({ page }) => {
  await mockAuthenticatedApi(page, {
    "GET /api/v1/resumes": (route) =>
      json(
        route,
        apiData([
          {
            id: 42,
            title: "Senior Product Engineer",
            summary: "Building reliable products and teams.",
            status: "DRAFT",
            updatedAt: "2026-07-22T08:30:00Z",
          },
        ]),
      ),
  });

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "My resumes" }).click();

  await expect(page).toHaveURL(/\/resumes$/);
  await expect(page.getByRole("heading", { name: "My resumes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Senior Product Engineer" })).toBeVisible();
  await expect(page.getByRole("link", { name: /continue editing/i })).toHaveAttribute(
    "href",
    "/resumes/42",
  );
});

test("a deleted resume can be restored", async ({ page }) => {
  const deletedResume = {
    id: 7,
    title: "Platform Engineer",
    summary: "Cloud infrastructure and developer experience.",
    deletedAt: "2026-07-21T08:30:00Z",
    recoverableUntil: "2099-08-20T08:30:00Z",
  };

  await mockAuthenticatedApi(page, {
    "GET /api/v1/resumes/deleted": (route) => json(route, apiData([deletedResume])),
    "POST /api/v1/resumes/7/restore": (route) => json(route, apiData(deletedResume)),
  });

  await page.goto("/resumes/deleted");
  await expect(page.getByRole("heading", { name: "Platform Engineer" })).toBeVisible();
  await page.getByRole("button", { name: "Restore resume" }).click();

  await expect(page.getByRole("status")).toContainText("was restored to My Resumes");
  await expect(page.getByRole("heading", { name: "Nothing to recover" })).toBeVisible();
});
