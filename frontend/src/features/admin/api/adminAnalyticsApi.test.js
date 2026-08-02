import { beforeEach, describe, expect, it, vi } from "vitest";

import apiClient from "../../../api/axiosInstance";
import { getAdminAnalytics, getAdminUsageMetrics } from "./adminApi";

vi.mock("../../../api/axiosInstance", () => ({ default: { get: vi.fn() } }));

describe("admin analytics API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the selected range to the overview endpoint", async () => {
    apiClient.get.mockResolvedValue({ data: { data: { totals: {} } } });
    const range = { from: "2026-07-01", to: "2026-07-31" };
    await getAdminAnalytics(range);
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/admin/analytics/overview", { params: range });
  });

  it("uses the existing runtime usage endpoint", async () => {
    apiClient.get.mockResolvedValue({ data: { data: [] } });
    const range = { from: "2026-07-01", to: "2026-07-31" };
    await getAdminUsageMetrics(range);
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/admin/analytics/usage-metrics", { params: range });
  });
});
