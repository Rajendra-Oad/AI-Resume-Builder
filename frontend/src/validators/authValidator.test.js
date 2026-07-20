import { describe, expect, it } from "vitest";
import { validateAuth } from "./authValidator";

describe("validateAuth", () => {
  it("reports every registration error together", () => {
    expect(validateAuth({ firstName: " ", lastName: "", email: "bad", password: "short" }, true))
      .toEqual({
        firstName: "First name is required.",
        lastName: "Last name is required.",
        email: "Enter a valid email address.",
        password: "Password must be at least 8 characters.",
      });
  });

  it("accepts valid login data without requiring names", () => {
    expect(validateAuth({ email: "person@example.com", password: "password123" }, false)).toEqual({});
  });
});
