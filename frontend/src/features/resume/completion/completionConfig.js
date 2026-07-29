export const COMPLETION_STATUS = Object.freeze({
  COMPLETE: "complete",
  NEEDS_IMPROVEMENT: "needs-improvement",
  INCOMPLETE: "incomplete",
});

export const completionConfig = Object.freeze({
  personal: { label: "Personal information", weight: 15, threshold: 100, minutes: 3 },
  summary: { label: "Professional summary", weight: 10, threshold: 80, minutes: 5 },
  education: { label: "Education", weight: 15, threshold: 80, minutes: 4 },
  experience: { label: "Experience", weight: 25, threshold: 80, minutes: 8 },
  projects: { label: "Projects", weight: 10, threshold: 80, minutes: 6 },
  skills: { label: "Skills", weight: 10, threshold: 80, minutes: 3 },
  certifications: { label: "Certifications", weight: 5, threshold: 70, minutes: 3 },
  languages: { label: "Languages", weight: 5, threshold: 70, minutes: 2 },
  achievements: { label: "Achievements", weight: 3, threshold: 70, minutes: 3 },
  links: { label: "Professional links", weight: 2, threshold: 50, minutes: 2 },
});

export const qualityRules = Object.freeze({
  summary: { minWords: 60, idealMaxWords: 150 },
  experience: { minEntries: 1, maxEntries: 10, minDescriptionWords: 12 },
  projects: { minEntries: 1, maxEntries: 8, minDescriptionWords: 10 },
  skills: { minEntries: 3, maxEntries: 30 },
  education: { minEntries: 1, maxEntries: 8 },
  certifications: { maxEntries: 12 },
});
