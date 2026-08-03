import { beforeEach, describe, expect, it, vi } from "vitest";

import apiClient from "../../../api/axiosInstance";
import { downloadResumePdf,listPdfExports } from "./resumeApi";

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

  it("generates a PDF via POST so the state change is CSRF-protected", async () => {
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    apiClient.post.mockResolvedValue({ data: blob });
    const click = vi.fn();
    const anchor = { href: "", download: "", click };
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(window.URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
    document.createElement = vi.fn(() => anchor);

    await downloadResumePdf(12, "My Resume");

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pdf/resumes/12", null, { responseType: "blob" });
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(anchor.download).toBe("My-Resume.pdf");
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
