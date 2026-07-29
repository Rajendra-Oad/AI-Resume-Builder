import { useMemo } from "react";

import { resumeCompletionEngine } from "./ResumeCompletionEngine";

export const useResumeCompletion = (resume, sections, profile) =>
  useMemo(() => resumeCompletionEngine.calculate(resume, sections, profile), [resume, sections, profile]);
