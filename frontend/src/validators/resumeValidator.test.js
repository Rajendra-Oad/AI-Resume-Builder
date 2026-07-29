import { describe, expect, it } from "vitest";

import { validateResume } from "./resumeValidator";

describe("validateResume", () => {
  it("returns field errors for an empty resume", () => {
    expect(validateResume({ title: "", fullName: "", summary: "" })).toEqual({
      title: "Resume title is required.",
      fullName: "Full name is required.",
      summary: "Professional summary is required.",
    });
  });

  it("accepts a complete resume", () => {
    expect(
      validateResume({
        title: "Product resume",
        fullName: "Alex Morgan",
        summary: "Ten years of experience.",
      }),
    ).toEqual({});
  });
});
