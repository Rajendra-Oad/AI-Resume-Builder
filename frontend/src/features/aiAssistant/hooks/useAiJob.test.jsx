import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { notify } from "../../../components/NotificationProvider";
import { getAiJob } from "../api/aiAssistantApi";
import { useAiJob } from "./useAiJob";

vi.mock("../api/aiAssistantApi", () => ({ getAiJob: vi.fn(), submitAiJob: vi.fn() }));
vi.mock("../../../components/NotificationProvider", () => ({
  notify: { success: vi.fn(), error: vi.fn(), queue: vi.fn() },
}));

describe("useAiJob", () => {
  it("polls active jobs and stops after a terminal response", async () => {
    getAiJob
      .mockResolvedValueOnce({ id: "poll-job", status: "PENDING", content: null, error: null })
      .mockResolvedValue({ id: "poll-job", status: "SUCCEEDED", content: "Ready", error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const { result, unmount } = renderHook(() => useAiJob("poll-job"), { wrapper });
    await waitFor(() => expect(result.current.data?.status).toBe("PENDING"));
    await waitFor(() => expect(result.current.data?.status).toBe("SUCCEEDED"), { timeout: 3500 });
    const callsAtCompletion = getAiJob.mock.calls.length;
    await new Promise((resolve) => window.setTimeout(resolve, 1700));

    expect(getAiJob).toHaveBeenCalledTimes(callsAtCompletion);
    expect(notify.success).toHaveBeenCalledTimes(1);
    unmount();
    client.clear();
  });
});
