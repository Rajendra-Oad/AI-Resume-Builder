const json = (route, data, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });

export const session = {
  accessToken: "e2e-access-token",
  email: "alex@example.com",
  role: "USER",
};

export const profile = {
  firstName: "Alex",
  lastName: "Morgan",
  email: session.email,
  onboardingCompleted: true,
};

export const apiData = (data, pagination) => ({ data, ...(pagination ? { pagination } : {}) });

export const mockAuthenticatedApi = async (page, overrides = {}) => {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new globalThis.URL(request.url());
    const key = `${request.method()} ${url.pathname}`;

    if (overrides[key]) {
      await overrides[key](route, request);
      return;
    }

    const responses = {
      "POST /api/v1/auth/refresh": apiData(session),
      "GET /api/v1/users/me": apiData(profile),
      "GET /api/v1/resumes": apiData([]),
    };

    if (responses[key]) {
      await json(route, responses[key]);
      return;
    }

    await json(
      route,
      { error: { code: "E2E_UNHANDLED", message: `Unhandled request: ${key}` } },
      501,
    );
  });
};

export const mockSignedOutApi = async (page, overrides = {}) => {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new globalThis.URL(request.url());
    const key = `${request.method()} ${url.pathname}`;

    if (overrides[key]) {
      await overrides[key](route, request);
      return;
    }

    if (key === "POST /api/v1/auth/refresh") {
      await json(route, { error: { code: "UNAUTHORIZED", message: "No active session" } }, 401);
      return;
    }

    await json(
      route,
      { error: { code: "E2E_UNHANDLED", message: `Unhandled request: ${key}` } },
      501,
    );
  });
};

export { json };
