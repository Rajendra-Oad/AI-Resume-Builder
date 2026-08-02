import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuditHistory } from "../hooks/useAuditHistory";
import { AuditHistoryWorkspace } from "./AuditHistoryWorkspace";

vi.mock("../hooks/useAuditHistory", () => ({ useAuditHistory: vi.fn() }));

const entries = [
  { id: 1, action: "RESUME_UPDATED", entityType: "Resume", entityId: 12, beforeState: "{\"title\":\"Old\"}", afterState: "{\"title\":\"New\"}", ipAddress: "127.0.0.1", createdAt: new Date().toISOString() },
  { id: 2, action: "PROFILE_CHANGED", entityType: "User", entityId: 4, beforeState: "{}", afterState: "{}", ipAddress: null, createdAt: "2024-01-01T10:00:00Z" },
];

describe("personal audit history", () => {
  beforeEach(() => useAuditHistory.mockReturnValue({
    page: 0,
    setPage: vi.fn(),
    history: { data: { items: entries, pagination: { totalElements: 2, totalPages: 1 } }, isLoading: false, isFetching: false, error: null, refetch: vi.fn() },
  }));

  it("groups activity and shows structured details", async () => {
    const user = userEvent.setup();
    render(<AuditHistoryWorkspace />);
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Older" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /View details for Resume updated Resume #12/i }));
    expect(screen.getByRole("dialog", { name: "Activity details" })).toBeInTheDocument();
    expect(screen.getByText(/"title": "Old"/)).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1")).toBeInTheDocument();
  });

  it("filters only the currently loaded page and reports no matches", async () => {
    const user = userEvent.setup();
    render(<AuditHistoryWorkspace />);
    await user.type(screen.getByPlaceholderText("Action, entity, or description"), "missing");
    expect(screen.getByRole("heading", { name: "No matching activity" })).toBeInTheDocument();
    expect(screen.getByText(/currently loaded page/i)).toBeInTheDocument();
  });
});
