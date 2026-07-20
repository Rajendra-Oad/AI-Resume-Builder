import { describe, expect, it } from "vitest";
import { normalizeApiError } from "./errorHandler";

describe("normalizeApiError", () => {
  it("normalizes a structured API error", () => {
    expect(
      normalizeApiError({
        response: { status: 422, data: { error: { code: "VALIDATION", message: "Invalid input" } } },
      }),
    ).toEqual({ status: 422, code: "VALIDATION", message: "Invalid input" });
  });

  it("uses safe network defaults when no response exists", () => {
    expect(normalizeApiError({ message: "Network unavailable" })).toEqual({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Network unavailable",
    });
  });

  it("uses the generic message when the thrown value has no details", () => {
    expect(normalizeApiError({}).message).toBe("Something went wrong. Please try again.");
  });
});
