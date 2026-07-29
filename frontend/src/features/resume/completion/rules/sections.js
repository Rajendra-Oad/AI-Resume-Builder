import { qualityRules } from "../completionConfig";
import { QualityAnalyzer } from "../qualityAnalyzer";
import { finish, has, legacyEntries, typed } from "./helpers";

export const validateEducation = ({ resume, sections }) => {
  const entries = typed(sections, "EDUCATION");
  if (!entries.length && has(resume.educationContent)) return finish({ score: 75, suggestions: ["Use a structured education entry for stronger validation."] });
  const valid = entries.filter((item) => has(item.institution) && has(item.degree) && item.startYear).length;
  return finish({
    score: entries.length ? (valid / entries.length) * 100 : 0,
    errors: entries.length ? [] : ["Education is missing."],
    suggestions: valid < entries.length ? ["Complete the institution, degree, and start year for each education entry."] : [],
  });
};

export const validateExperience = ({ resume, sections }) => {
  const entries = typed(sections, "EXPERIENCE");
  if (!entries.length && has(resume.experienceContent)) {
    const quality = QualityAnalyzer.isMeaningful(resume.experienceContent, qualityRules.experience.minDescriptionWords);
    return finish({ score: quality ? 75 : 40, suggestions: ["Use structured experience entries with role, company, dates, and impact bullets."] });
  }
  const valid = entries.filter((item) => has(item.employer) && has(item.role) && has(item.startDate) && has(item.endDate));
  const descriptions = entries.filter((item) => QualityAnalyzer.isMeaningful(item.description, qualityRules.experience.minDescriptionWords));
  const impact = entries.filter((item) => QualityAnalyzer.hasImpact(item.description));
  const score = entries.length ? 50 * (valid.length / entries.length) + 35 * (descriptions.length / entries.length) + 15 * (impact.length / entries.length) : 0;
  const suggestions = [];
  if (!entries.length) suggestions.push("Add at least one work experience.");
  if (valid.length < entries.length) suggestions.push("Complete the company, role, and duration for every experience.");
  if (descriptions.length < entries.length) suggestions.push("Describe your responsibilities and results with meaningful bullet points.");
  if (entries.length && impact.length < entries.length) suggestions.push("Add measurable impact or strong action verbs to your experience.");
  return finish({ score, errors: entries.length ? [] : ["Experience is missing."], suggestions });
};

export const validateProjects = ({ resume, sections }) => {
  const entries = typed(sections, "PROJECT");
  if (!entries.length && has(resume.projectsContent)) return finish({ score: 65, suggestions: ["Add structured projects with a title, description, and technologies."] });
  const named = entries.filter((item) => has(item.name));
  const described = entries.filter((item) => QualityAnalyzer.isMeaningful(item.description, qualityRules.projects.minDescriptionWords));
  const technologies = entries.filter((item) => /\b(react|java|python|javascript|typescript|node|spring|sql|aws|azure|docker|api|html|css|technology|built with|using)\b/i.test(item.description ?? ""));
  const score = entries.length ? 30 * named.length / entries.length + 45 * described.length / entries.length + 25 * technologies.length / entries.length : 0;
  const suggestions = [];
  if (!entries.length) suggestions.push("Add at least one relevant project.");
  if (entries.length === 1) suggestions.push("Add one more project to strengthen your resume.");
  if (described.length < entries.length) suggestions.push("Explain the purpose and outcome of each project.");
  if (technologies.length < entries.length) suggestions.push("Mention the technologies used in each project description.");
  return finish({ score, errors: entries.length ? [] : ["Projects are missing."], suggestions });
};

export const validateSkills = ({ resume, sections }) => {
  const entries = typed(sections, "SKILL");
  const count = entries.length || legacyEntries(resume.skillsContent).length;
  const score = Math.min(100, (count / qualityRules.skills.minEntries) * 100);
  return finish({ score, errors: count ? [] : ["Skills are missing."], suggestions: count < 3 ? [`Include at least three relevant skills (${count}/3).`] : [] });
};

export const validateCertifications = ({ resume, sections }) => {
  const entries = typed(sections, "CERTIFICATION");
  const legacy = legacyEntries(resume.certificationsContent);
  if (!entries.length && !legacy.length) return finish({ score: 0, suggestions: ["Add a relevant certification if you have one."] });
  const valid = entries.length ? entries.filter((item) => has(item.name) && has(item.issuedBy)).length : legacy.length;
  return finish({ score: entries.length ? valid / entries.length * 100 : 75, suggestions: valid < entries.length ? ["Include the certification name and issuer."] : [] });
};

export const validateLanguages = ({ resume }) => {
  const entries = legacyEntries(resume.languagesContent);
  return finish({ score: entries.length ? (entries.some((item) => /:|-/.test(item)) ? 100 : 70) : 0, suggestions: entries.length ? [] : ["Add languages and proficiency levels."] });
};

export const validateAchievements = ({ resume }) => {
  const content = resume.achievementsContent ?? "";
  return finish({ score: QualityAnalyzer.isMeaningful(content, 5) ? 100 : 0, suggestions: has(content) ? ["Add detail or measurable context to your achievements."] : ["Add awards or measurable achievements if applicable."] });
};
