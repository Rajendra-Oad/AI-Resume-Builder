import { QualityAnalyzer } from "../qualityAnalyzer";
import { finish } from "./helpers";

export const validateLinks = ({ resume }) => {
  const linkedin = QualityAnalyzer.isUrl(resume.linkedinUrl);
  const github = QualityAnalyzer.isUrl(resume.githubUrl);
  const score = (linkedin ? 50 : 0) + (github ? 50 : 0);
  const suggestions = [];
  if (!linkedin) suggestions.push("Add a valid LinkedIn profile for better recruiter visibility.");
  if (!github) suggestions.push("Add a valid GitHub profile to showcase your work.");
  return finish({ score, suggestions });
};
