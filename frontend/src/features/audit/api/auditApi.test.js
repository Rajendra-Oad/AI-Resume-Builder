import { beforeEach, describe, expect, it, vi } from "vitest";

import apiClient from "../../../api/axiosInstance";
import { getPersonalAuditHistory } from "./auditApi";

vi.mock("../../../api/axiosInstance", () => ({ default: { get: vi.fn() } }));

describe("personal audit API", () => {
  beforeEach(() => vi.clearAllMocks());
  it("preserves audit pagination metadata", async () => {
    apiClient.get.mockResolvedValue({ data: { data: [{ id: 7 }], pagination: { page: 2, totalPages: 4, totalElements: 75 } } });
    await expect(getPersonalAuditHistory(2, 20)).resolves.toEqual({ items: [{ id: 7 }], pagination: { page: 2, totalPages: 4, totalElements: 75 } });
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/audit", { params: { page: 2, size: 20 } });
  });
});
