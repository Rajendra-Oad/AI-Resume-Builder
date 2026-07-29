import { qualityRules } from "../completionConfig";
import { QualityAnalyzer } from "../qualityAnalyzer";
import { finish } from "./helpers";

export const validateSummary = ({ resume }) => {
  const count = QualityAnalyzer.wordCount(resume.summary);
  if (!count) return finish({ score: 0, errors: ["Professional summary is missing."], suggestions: ["Write a focused 60–150 word professional summary."] });
  const meaningful = QualityAnalyzer.isMeaningful(resume.summary, 12);
  const inRange = count >= qualityRules.summary.minWords && count <= qualityRules.summary.idealMaxWords;
  const score = (meaningful ? 45 : 15) + (count >= 30 ? 25 : Math.round(count / 2)) + (inRange ? 30 : 0);
  const suggestions = [];
  if (count < 60) suggestions.push(`Your professional summary is too short (${count}/60 words).`);
  if (count > 150) suggestions.push("Trim your professional summary to 150 words or fewer.");
  if (!meaningful) suggestions.push("Replace generic wording with specific experience, strengths, and goals.");
  return finish({ score, qualityScore: meaningful ? Math.min(100, score + 5) : score, suggestions });
};
