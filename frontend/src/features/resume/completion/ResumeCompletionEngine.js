import { COMPLETION_STATUS,completionConfig } from "./completionConfig";
import { validateLinks } from "./rules/links";
import { validatePersonal } from "./rules/personal";
import {
  validateAchievements, validateCertifications, validateEducation, validateExperience,
  validateLanguages, validateProjects, validateSkills,
} from "./rules/sections";
import { validateSummary } from "./rules/summary";

export const sectionValidators = Object.freeze({
  personal: validatePersonal,
  summary: validateSummary,
  education: validateEducation,
  experience: validateExperience,
  projects: validateProjects,
  skills: validateSkills,
  certifications: validateCertifications,
  languages: validateLanguages,
  achievements: validateAchievements,
  links: validateLinks,
});

const cache = new Map();
const stableKey = (value) => JSON.stringify(value);
const sectionInput = {
  personal: ({ resume, profile }) => ({ profile, fullName: resume.fullName, contactEmail: resume.contactEmail, phone: resume.phone, location: resume.location }),
  summary: ({ resume }) => resume.summary,
  education: ({ resume, sections }) => ({ legacy: resume.educationContent, entries: sections.filter((item) => item.type === "EDUCATION") }),
  experience: ({ resume, sections }) => ({ legacy: resume.experienceContent, entries: sections.filter((item) => item.type === "EXPERIENCE") }),
  projects: ({ resume, sections }) => ({ legacy: resume.projectsContent, entries: sections.filter((item) => item.type === "PROJECT") }),
  skills: ({ resume, sections }) => ({ legacy: resume.skillsContent, entries: sections.filter((item) => item.type === "SKILL") }),
  certifications: ({ resume, sections }) => ({ legacy: resume.certificationsContent, entries: sections.filter((item) => item.type === "CERTIFICATION") }),
  languages: ({ resume }) => resume.languagesContent,
  achievements: ({ resume }) => resume.achievementsContent,
  links: ({ resume }) => ({ githubUrl: resume.githubUrl, linkedinUrl: resume.linkedinUrl }),
};

export class ResumeCompletionEngine {
  constructor(config = completionConfig) {
    this.config = config;
  }

  validateSection(id, context) {
    // Each cache key contains only the data used by that section. Editing a
    // summary, for example, does not invalidate experience or project results.
    const key = `${id}:${stableKey(sectionInput[id](context))}`;
    if (cache.has(key)) return cache.get(key);
    const result = sectionValidators[id](context);
    const configured = this.config[id];
    const normalized = {
      id,
      label: configured.label,
      weight: configured.weight,
      ...result,
      status:
        result.completion >= configured.threshold
          ? COMPLETION_STATUS.COMPLETE
          : result.completion > 0
            ? COMPLETION_STATUS.NEEDS_IMPROVEMENT
            : COMPLETION_STATUS.INCOMPLETE,
    };
    cache.set(key, normalized);
    if (cache.size > 300) cache.delete(cache.keys().next().value);
    return normalized;
  }

  calculate(resume = {}, sections = [], profile = {}) {
    const context = { resume, sections, profile };
    const results = Object.keys(this.config).map((id) => this.validateSection(id, context));
    const overall = Math.round(results.reduce((total, section) => total + section.weight * section.completion / 100, 0));
    const remaining = results.filter((section) => section.status !== COMPLETION_STATUS.COMPLETE);
    return {
      overall,
      qualityScore: Math.round(results.reduce((total, section) => total + section.weight * section.qualityScore / 100, 0)),
      sections: results,
      completedCount: results.length - remaining.length,
      remainingItems: remaining.flatMap((section) => section.suggestions.map((text) => ({ sectionId: section.id, text }))),
      estimatedMinutes: remaining.reduce((total, section) => total + this.config[section.id].minutes, 0),
      isComplete: overall === 100 && remaining.length === 0,
    };
  }
}

export const resumeCompletionEngine = new ResumeCompletionEngine();
