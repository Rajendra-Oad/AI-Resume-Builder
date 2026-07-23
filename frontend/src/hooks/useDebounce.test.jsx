import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  afterEach(() => vi.useRealTimers());

  it("delays updates and cancels the previous timeout", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 250), {
      initialProps: { value: "first" },
    });

    rerender({ value: "second" });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("first");
    rerender({ value: "third" });
    act(() => vi.advanceTimersByTime(250));
    expect(result.current).toBe("third");
  });
});
