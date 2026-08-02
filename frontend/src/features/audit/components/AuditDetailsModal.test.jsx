import { describe, expect, it } from "vitest";

import { parseAuditState } from "./AuditDetailsModal";

describe("audit state parsing", () => {
  it("parses JSON and safely preserves legacy text", () => {
    expect(parseAuditState('{"active":true}')).toEqual({ active: true });
    expect(parseAuditState("legacy-state")).toBe("legacy-state");
    expect(parseAuditState(null)).toBeNull();
  });
});
