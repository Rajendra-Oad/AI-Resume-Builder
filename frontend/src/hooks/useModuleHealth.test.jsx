import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useModuleHealth } from "./useModuleHealth";

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe("useModuleHealth", () => {
  it("loads health through React Query and caches it under the module key", async () => {
    const checkHealth = vi.fn().mockResolvedValue({ status: "healthy" });
    const { result } = renderHook(() => useModuleHealth("resume", checkHealth), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ status: "healthy" });
    expect(checkHealth).toHaveBeenCalledOnce();
  });

  it("exposes query failures", async () => {
    const error = new Error("offline");
    const { result } = renderHook(() => useModuleHealth("ats", () => Promise.reject(error)), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
