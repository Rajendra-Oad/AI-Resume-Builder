import { beforeEach, describe, expect, it, vi } from "vitest";

import apiClient from "../../../api/axiosInstance";
import { listPdfExports } from "./resumeApi";

vi.mock("../../../api/axiosInstance", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("resume PDF API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads and unwraps export history for a resume", async () => {
    const exports = [{ id: 4, fileName: "engineer.pdf" }];
    apiClient.get.mockResolvedValue({ data: { data: exports } });

    await expect(listPdfExports(12)).resolves.toEqual(exports);
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/pdf/resumes/12/history", { params: { page: 0, size: 100 } });
  });
});
