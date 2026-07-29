import { describe, expect, it } from "vitest";

import {
  evaluatePassword,
  isBasedOnEmail,
  isCommonPassword,
  validateNewPassword,
} from "./passwordSecurity";

describe("password security", () => {
  it("accepts modern passphrases without composition requirements", () => {
    expect(validateNewPassword("correct horse battery staple")).toBe(true);
    expect(evaluatePassword("correct horse battery staple").strongEnough).toBe(true);
  });

  it("enforces the 8 to 128 character boundary", () => {
    expect(validateNewPassword("short")).toContain("at least 8");
    expect(validateNewPassword("a".repeat(129))).toContain("128");
  });

  it("flags common and email-derived passwords", () => {
    expect(isCommonPassword("Password1")).toBe(true);
    expect(isBasedOnEmail("alexmorgan-2026", "alex.morgan@example.com")).toBe(true);
    expect(evaluatePassword("alexmorgan-2026", "alex.morgan@example.com").strongEnough).toBe(false);
  });
});
