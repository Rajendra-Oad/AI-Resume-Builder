import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useUndoRedoState } from "./useUndoRedoState";

describe("useUndoRedoState", () => {
  it("undoes grouped typing as one edit and redoes it", () => {
    const { result } = renderHook(() => useUndoRedoState({ title: "" }));
    act(() => result.current.setValue({ title: "A" }, "title"));
    act(() => result.current.setValue({ title: "AB" }, "title"));
    act(() => result.current.undo());
    expect(result.current.value.title).toBe("");
    act(() => result.current.redo());
    expect(result.current.value.title).toBe("AB");
  });

  it("clears redo history after a new edit", () => {
    const { result } = renderHook(() => useUndoRedoState("first"));
    act(() => result.current.setValue("second"));
    act(() => result.current.undo());
    act(() => result.current.setValue("different"));
    expect(result.current.canRedo).toBe(false);
  });

  it("resets loaded data without creating an undo entry", () => {
    const { result } = renderHook(() => useUndoRedoState("empty"));
    act(() => result.current.reset("loaded"));
    expect(result.current.value).toBe("loaded");
    expect(result.current.canUndo).toBe(false);
  });
});
