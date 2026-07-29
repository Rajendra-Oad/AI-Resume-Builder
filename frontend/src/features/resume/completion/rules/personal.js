import { QualityAnalyzer } from "../qualityAnalyzer";
import { finish, has } from "./helpers";

export const validatePersonal = ({ resume }) => {
  const name = resume.fullName;
  const checks = [
    [has(name), "Add your full name."],
    [QualityAnalyzer.isEmail(resume.contactEmail), "Add a valid contact email."],
    [QualityAnalyzer.isPhone(resume.phone), "Add a valid phone number."],
    [has(resume.location), "Add your city and region."],
  ];
  const errors = checks.filter(([valid]) => !valid).map(([, message]) => message);
  return finish({ score: ((checks.length - errors.length) / checks.length) * 100, errors, suggestions: errors });
};
