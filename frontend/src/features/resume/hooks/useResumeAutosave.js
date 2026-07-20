import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";

import { useDebounce } from "../../../hooks/useDebounce";
import { updateResume } from "../api/resumeApi";

export const useResumeAutosave = ({ enabled, resumeId, values, onSaved }) => {
  const [state, setState] = useState({ status: "saved", error: "" });
  const lastSaved = useRef(values);
  const debouncedValues = useDebounce(values, 900);
  const isDirty = enabled && JSON.stringify(values) !== JSON.stringify(lastSaved.current);
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!enabled || JSON.stringify(debouncedValues) === JSON.stringify(lastSaved.current)) return;
    let active = true;
    setState({ status: "saving", error: "" });
    updateResume(resumeId, debouncedValues)
      .then((saved) => {
        if (!active) return;
        lastSaved.current = debouncedValues;
        setState({ status: "saved", error: "" });
        onSaved?.(saved);
      })
      .catch((error) => {
        if (active) setState({ status: "error", error: error.message });
      });
    return () => {
      active = false;
    };
  }, [debouncedValues, enabled, onSaved, resumeId]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const markSaved = (savedValues) => {
    lastSaved.current = savedValues;
    setState({ status: "saved", error: "" });
  };
  return { ...state, blocker, isDirty, markSaved };
};
