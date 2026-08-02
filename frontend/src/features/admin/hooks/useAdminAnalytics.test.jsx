import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminAnalytics, getAdminUsageMetrics } from "../api/adminApi";
import { useAdminAnalytics } from "./useAdminAnalytics";

vi.mock("../api/adminApi", () => ({ getAdminAnalytics: vi.fn(), getAdminUsageMetrics: vi.fn() }));

describe("useAdminAnalytics", () => {
  beforeEach(() => {
    getAdminAnalytics.mockResolvedValue({ totals: {} });
    getAdminUsageMetrics.mockResolvedValue([]);
  });

  it("validates and applies custom ranges without unnecessary requests", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(useAdminAnalytics, { wrapper });
    await waitFor(() => expect(result.current.overview.isSuccess).toBe(true));

    act(() => result.current.selectPreset("CUSTOM"));
    act(() => {
      result.current.setCustomFrom("2026-08-02");
      result.current.setCustomTo("2026-08-01");
    });
    act(() => expect(result.current.applyCustomRange()).toBe(false));
    expect(result.current.validationError).toMatch(/start date/i);

    act(() => {
      result.current.setCustomFrom("2026-07-01");
      result.current.setCustomTo("2026-07-31");
    });
    act(() => expect(result.current.applyCustomRange()).toBe(true));
    await waitFor(() => expect(getAdminAnalytics).toHaveBeenCalledWith({ from: "2026-07-01", to: "2026-07-31" }));
  });
});
