import * as Sentry from "@sentry/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { captureApiFailure, initializeObservability } from "./observability";

const { sentryScope } = vi.hoisted(() => ({
  sentryScope: {
    setContext: vi.fn(),
    setTag: vi.fn(),
  },
}));

vi.mock("./config/env", () => ({
  config: {
    sentryDsn: "https://public@example.ingest.sentry.io/1",
    environment: "test",
    release: "test-release",
    sentryTracesSampleRate: "0.25",
  },
}));

vi.mock("@sentry/react", () => ({
  browserTracingIntegration: vi.fn(() => "browser-tracing"),
  captureException: vi.fn(),
  init: vi.fn(),
  withScope: vi.fn((callback) => callback(sentryScope)),
}));

describe("observability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initializes privacy-preserving browser monitoring", async () => {
    await initializeObservability();

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: "test",
        release: "test-release",
        sendDefaultPii: false,
        tracesSampleRate: 0.25,
      }),
    );
  });

  it("captures server failures without URL query data", async () => {
    const error = {
      config: { method: "post", url: "/api/v1/resumes?token=secret" },
      response: { status: 503, headers: { "x-request-id": "request-1" } },
    };

    await captureApiFailure(error);

    expect(sentryScope.setContext).toHaveBeenCalledWith("api", {
      method: "POST",
      path: "/api/v1/resumes",
      requestId: "request-1",
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("does not capture expected client errors", async () => {
    await captureApiFailure({
      config: { url: "/api/v1/resumes" },
      response: { status: 400 },
    });

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
