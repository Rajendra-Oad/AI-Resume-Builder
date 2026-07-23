import { useCallback, useRef, useState } from "react";

export const useUndoRedoState = (initialValue, limit = 100) => {
  const [history, setHistory] = useState({ past: [], present: initialValue, future: [] });
  const editGroup = useRef({ key: null, at: 0 });

  const setValue = useCallback((updater, groupKey = null) => {
    const now = Date.now();
    setHistory((current) => {
      const next = typeof updater === "function" ? updater(current.present) : updater;
      if (Object.is(next, current.present)) return current;
      const grouped = Boolean(groupKey) && editGroup.current.key === groupKey && now - editGroup.current.at < 750;
      editGroup.current = { key: groupKey, at: now };
      return { past: grouped ? current.past : [...current.past, current.present].slice(-limit), present: next, future: [] };
    });
  }, [limit]);

  const undo = useCallback(() => {
    editGroup.current = { key: null, at: 0 };
    setHistory((current) => current.past.length ? {
      past: current.past.slice(0, -1), present: current.past.at(-1), future: [current.present, ...current.future],
    } : current);
  }, []);

  const redo = useCallback(() => {
    editGroup.current = { key: null, at: 0 };
    setHistory((current) => current.future.length ? {
      past: [...current.past, current.present].slice(-limit), present: current.future[0], future: current.future.slice(1),
    } : current);
  }, [limit]);

  const reset = useCallback((value) => {
    editGroup.current = { key: null, at: 0 };
    setHistory({ past: [], present: value, future: [] });
  }, []);

  return { value: history.present, setValue, reset, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
};
