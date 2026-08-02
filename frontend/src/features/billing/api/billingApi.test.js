import { beforeEach, describe, expect, it, vi } from "vitest";

import apiClient from "../../../api/axiosInstance";
import { cancelSubscription, getPaymentHistory } from "./billingApi";

vi.mock("../../../api/axiosInstance", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

describe("billingApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves payment pagination metadata", async () => {
    apiClient.get.mockResolvedValue({
      data: { data: [{ id: 1 }], pagination: { page: 2, totalPages: 4, totalElements: 61 } },
    });

    await expect(getPaymentHistory(2, 20)).resolves.toEqual({
      items: [{ id: 1 }],
      pagination: { page: 2, totalPages: 4, totalElements: 61 },
    });
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/subscriptions/payments", {
      params: { page: 2, size: 20 },
    });
  });

  it("uses the existing cancellation endpoint without inventing a payload", async () => {
    apiClient.post.mockResolvedValue({ data: { data: { plan: "FREE" } } });
    await expect(cancelSubscription()).resolves.toEqual({ plan: "FREE" });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/subscriptions/cancel");
  });
});
