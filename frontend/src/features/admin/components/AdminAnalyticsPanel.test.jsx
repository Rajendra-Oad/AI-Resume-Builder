import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

import { useAdminAnalytics } from "../hooks/useAdminAnalytics";
import { AdminAnalyticsPanel } from "./AdminAnalyticsPanel";

vi.mock("../hooks/useAdminAnalytics", () => ({ useAdminAnalytics: vi.fn() }));

const query = (data) => ({ data, isLoading: false, isFetching: false, error: null, refetch: vi.fn() });

describe("AdminAnalyticsPanel", () => {
  it("renders supported KPIs and runtime metrics accessibly", async () => {
    const refresh = vi.fn();
    useAdminAnalytics.mockReturnValue({
      preset: "DAYS_30",
      range: { from: "2026-07-04", to: "2026-08-02" },
      customFrom: "2026-07-04",
      customTo: "2026-08-02",
      validationError: "",
      setCustomFrom: vi.fn(), setCustomTo: vi.fn(), selectPreset: vi.fn(), applyCustomRange: vi.fn(),
      refresh, isRefreshing: false,
      overview: query({ totals: { totalUsers: 100, activeUsers: 80, newUsers: 12, resumesCreated: 35, aiRequests: 70, pdfExports: 20, atsReports: 18 } }),
      metrics: query([{ date: "2026-08-01", name: "AI_REQUEST", dimensionKey: "", value: 9 }]),
    });
    const { container } = render(<AdminAnalyticsPanel />);

    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("AI request")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await axe(container)).toHaveNoViolations();
  });
});
