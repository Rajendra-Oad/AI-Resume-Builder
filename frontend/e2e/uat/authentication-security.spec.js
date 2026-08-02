import { expect, test } from "@playwright/test";

import { apiData, json, mockAuthenticatedApi, mockSignedOutApi, session } from "../support/mockApi";

test("registration reaches the email-verification checkpoint", async ({ page }) => {
  await mockSignedOutApi(page, {
    "POST /api/v1/auth/register": (route) =>
      json(
        route,
        apiData({ userId: "uat-user", email: "uat@example.test", status: "PENDING_VERIFICATION" }),
        201,
      ),
  });

  await page.goto("/register");
  await page.getByLabel("First name").fill("UAT");
  await page.getByLabel("Last name").fill("Candidate");
  await page.getByLabel("Email address").fill("uat@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Acceptance-passphrase-2026!");
  await page.getByLabel("Confirm password").fill("Acceptance-passphrase-2026!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/verify-email-sent$/);
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await expect(page.getByText("uat@example.test")).toBeVisible();
});

test("invalid login remains signed out and exposes a useful error", async ({ page }) => {
  await mockSignedOutApi(page, {
    "POST /api/v1/auth/login": (route) =>
      json(
        route,
        { success: false, error: { code: "UNAUTHENTICATED", message: "Invalid credentials." } },
        401,
      ),
  });

  await page.goto("/login");
  await page.getByLabel("Email address").fill("uat@example.test");
  await page.getByLabel("Password").fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("alert")).toContainText("Invalid credentials");
});

test("forgot-password response does not disclose account existence", async ({ page }) => {
  await mockSignedOutApi(page, {
    "POST /api/v1/auth/forgot-password": (route) => json(route, apiData(null)),
  });

  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill("unknown@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByText(/If an account exists.*reset link has been sent/i)).toBeVisible();
});

test("email verification handles missing and valid tokens", async ({ page }) => {
  await mockSignedOutApi(page, {
    "POST /api/v1/auth/verify-email": (route) => json(route, apiData(null)),
  });

  await page.goto("/verify-email");
  await expect(page.getByRole("alert")).toContainText("invalid or incomplete");

  await page.goto("/verify-email?token=synthetic-verification-token");
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page.getByText("Your email is verified")).toBeVisible();
});

test("reset-password rejects a missing token", async ({ page }) => {
  await mockSignedOutApi(page);
  await page.goto("/reset-password");
  await page.getByLabel("New password").fill("Acceptance-passphrase-2026!");
  await page.getByLabel("Confirm password").fill("Acceptance-passphrase-2026!");
  await page.getByRole("button", { name: "Reset password" }).click();

  await expect(page.getByRole("alert")).toContainText("invalid or incomplete");
});

test("a non-admin user is denied the administration route", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/forbidden$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("logout clears the authenticated workspace", async ({ page }) => {
  let loggedOut = false;
  await mockAuthenticatedApi(page, {
    "POST /api/v1/auth/logout": (route) => {
      loggedOut = true;
      return route.fulfill({ status: 204 });
    },
    "POST /api/v1/auth/refresh": (route) =>
      loggedOut
        ? json(
            route,
            { success: false, error: { code: "UNAUTHENTICATED", message: "No active session" } },
            401,
          )
        : json(route, apiData(session)),
    "GET /api/v1/analytics/overview": (route) => json(route, apiData({ totals: {} })),
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).last().click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/resumes");
  await expect(page).toHaveURL(/\/login$/);
});

test("an expired access token is refreshed once and the request succeeds", async ({ page }) => {
  let resumeAttempts = 0;
  await mockAuthenticatedApi(page, {
    "GET /api/v1/resumes": async (route) => {
      resumeAttempts += 1;
      if (resumeAttempts === 1) {
        await json(
          route,
          { success: false, error: { code: "UNAUTHENTICATED", message: "Expired token" } },
          401,
        );
      } else {
        await json(route, apiData([]));
      }
    },
    "POST /api/v1/auth/refresh": (route) =>
      json(route, apiData({ ...session, accessToken: "refreshed-token" })),
  });

  await page.goto("/resumes");
  await expect(page.getByRole("heading", { name: "No resumes yet" })).toBeVisible();
  expect(resumeAttempts).toBe(2);
});
