import { fontStack, resolveTemplate } from "../../templates/templateEngine";

const labels = {
  SUMMARY: "Career Objective", EDUCATION: "Education", EXPERIENCE: "Experience",
  PROJECT: "Projects", SKILL: "Skills", CERTIFICATION: "Certifications", LANGUAGES: "Languages",
};
const legacyFields = {
  SUMMARY: "summary", SKILL: "skillsContent", EXPERIENCE: "experienceContent",
  PROJECT: "projectsContent", CERTIFICATION: "certificationsContent",
  EDUCATION: "educationContent", LANGUAGES: "languagesContent",
};
const sectionText = (item) => {
  switch (item.type) {
    case "EDUCATION": return `${item.degree} — ${item.institution}${item.startYear ? ` | ${item.startYear}${item.endYear ? `–${item.endYear}` : ""}` : ""}`;
    case "EXPERIENCE": return `${item.role} — ${item.employer}${item.startDate ? ` | ${item.startDate}${item.endDate ? `–${item.endDate}` : ""}` : ""}`;
    case "PROJECT": return `${item.name}${item.description ? `\n${item.description}` : ""}`;
    case "SKILL": return `${item.name}${item.proficiencyLevel ? ` — ${item.proficiencyLevel}` : ""}`;
    case "CERTIFICATION": return `${item.name}${item.issuedBy ? ` — ${item.issuedBy}` : ""}`;
    default: return "";
  }
};

const PreviewSection = ({ type, values, grouped }) => {
  const items = grouped[type] ?? [];
  const content = values[legacyFields[type]];
  if (!items.length && !content?.trim()) return null;
  return <section data-section={type}><h3>{labels[type]}</h3>
    {items.length ? items.map((item) => <p key={item.id}>{sectionText(item)}</p>) : <p>{content}</p>}
  </section>;
};

export const ResumeDocumentPreview = ({ values, sections = [], className = "" }) => {
  const template = resolveTemplate(values.templateConfiguration);
  const grouped = sections.reduce((all, item) => ({ ...all, [item.type]: [...(all[item.type] ?? []), item] }), {});
  const style = {
    "--resume-font": fontStack(values.fontFamily || template.theme.bodyFont),
    "--resume-heading-font": fontStack(template.theme.headingFont),
    "--resume-size": `${values.fontSize ?? 10.5}px`,
    "--resume-leading": values.lineSpacing ?? 1.25,
    "--resume-section-space": `${values.sectionSpacing ?? 12}px`,
    "--resume-margin": `${Math.round((values.pageMargin ?? 42) * 0.72)}px`,
    "--resume-primary": template.theme.primary,
    "--resume-accent": template.theme.accent,
    "--resume-text": template.theme.text,
    "--resume-muted": template.theme.muted,
    "--resume-border": template.theme.border,
  };
  const ordered = template.sectionOrder.filter((type) => template.supportedSections.has(type));
  const main = ordered.filter((type) => !template.sidebarSections.has(type));
  const sidebar = ordered.filter((type) => template.sidebarSections.has(type));
  return <aside className={`preview-paper resume-live-preview resume-template--${template.key} resume-layout--${template.layout} ${className}`.trim()} style={style} aria-label="Resume preview">
    <header className="resume-preview-header">
      <p className="preview-name">{values.fullName?.trim() || "YOUR NAME"}</p>
      <p className="resume-preview-role">{values.targetJobTitle || "Professional title"}</p>
      <p className="resume-preview-contact">{[values.location, values.contactEmail, values.phone, values.githubUrl, values.linkedinUrl].filter(Boolean).join(" | ") || "Location | email@example.com | phone"}</p>
    </header>
    <div className="preview-rule" />
    <div className="resume-preview-columns">
      <div className="resume-preview-main">{main.map((type) => <PreviewSection key={type} type={type} values={values} grouped={grouped} />)}</div>
      {sidebar.length > 0 && <div className="resume-preview-sidebar">{sidebar.map((type) => <PreviewSection key={type} type={type} values={values} grouped={grouped} />)}</div>}
    </div>
  </aside>;
};
