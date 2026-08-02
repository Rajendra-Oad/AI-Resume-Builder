import { beforeEach, describe, expect, it, vi } from "vitest";

import apiClient from "../../../api/axiosInstance";
import { getAiJob, submitAiJob } from "./aiAssistantApi";

vi.mock("../../../api/axiosInstance", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe("AI background job API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits using the existing background-job endpoint", async () => {
    apiClient.post.mockResolvedValue({ data: { data: { id: "job-1", status: "PENDING" } } });
    await expect(submitAiJob({ workflow: "cover-letter", input: "facts" })).resolves.toEqual({ id: "job-1", status: "PENDING" });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/ai/jobs", {
      workflow: "cover-letter", input: "facts", locale: "en-US",
    });
  });

  it("loads only the requested owned job", async () => {
    apiClient.get.mockResolvedValue({ data: { data: { id: "job-1", status: "SUCCEEDED" } } });
    await getAiJob("job-1");
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/ai/jobs/job-1");
  });
});
