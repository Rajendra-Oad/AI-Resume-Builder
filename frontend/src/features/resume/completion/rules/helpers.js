import { COMPLETION_STATUS } from "../completionConfig";

export const finish = ({ score, errors = [], suggestions = [], qualityScore = score }) => {
  const completion = Math.max(0, Math.min(100, Math.round(score)));
  return {
    completion,
    qualityScore: Math.max(0, Math.min(100, Math.round(qualityScore))),
    errors,
    suggestions,
    status:
      completion >= 100
        ? COMPLETION_STATUS.COMPLETE
        : completion > 0
          ? COMPLETION_STATUS.NEEDS_IMPROVEMENT
          : COMPLETION_STATUS.INCOMPLETE,
  };
};

export const typed = (sections, type) => sections.filter((section) => section.type === type);
export const has = (value) => Boolean(String(value ?? "").trim());
export const legacyEntries = (value = "") => value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
