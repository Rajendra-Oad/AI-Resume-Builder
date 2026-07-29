const DEFAULT_ORDER = ["SUMMARY", "SKILL", "EXPERIENCE", "PROJECT", "CERTIFICATION", "EDUCATION", "LANGUAGES"];
const KNOWN = new Set(DEFAULT_ORDER);
const DEFAULT_THEME = {
  primary: "#17212b", accent: "#31546d", text: "#17212b",
  muted: "#52606d", border: "#9aa5b1", headingFont: "TIMES", bodyFont: "TIMES",
};

const safeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value ?? "") ? value : fallback;
const safeFont = (value) => ["HELVETICA", "TIMES", "COURIER"].includes(value) ? value : "HELVETICA";
const parse = (configuration) => {
  if (!configuration) return {};
  if (typeof configuration === "object") return configuration;
  try { return JSON.parse(configuration); } catch { return {}; }
};

export const resolveTemplate = (configuration) => {
  const source = parse(configuration);
  const order = (Array.isArray(source.sectionOrder) ? source.sectionOrder : DEFAULT_ORDER)
    .map((key) => String(key).toUpperCase()).filter((key, index, all) => KNOWN.has(key) && all.indexOf(key) === index);
  const supported = new Set((Array.isArray(source.supportedSections) ? source.supportedSections : DEFAULT_ORDER)
    .map((key) => String(key).toUpperCase()).filter((key) => KNOWN.has(key)));
  const theme = source.theme ?? {};
  return {
    key: source.key || "professional",
    version: Math.max(1, Number(source.version) || 1),
    layout: source.layout === "sidebar" ? "sidebar" : "single",
    sectionOrder: order.length ? order : DEFAULT_ORDER,
    supportedSections: supported.size ? supported : new Set(DEFAULT_ORDER),
    sidebarSections: new Set((source.sidebarSections ?? []).map((key) => String(key).toUpperCase())),
    theme: {
      primary: safeColor(theme.primary, DEFAULT_THEME.primary),
      accent: safeColor(theme.accent, DEFAULT_THEME.accent),
      text: safeColor(theme.text, DEFAULT_THEME.text),
      muted: safeColor(theme.muted, DEFAULT_THEME.muted),
      border: safeColor(theme.border, DEFAULT_THEME.border),
      headingFont: safeFont(theme.headingFont || DEFAULT_THEME.headingFont),
      bodyFont: safeFont(theme.bodyFont || DEFAULT_THEME.bodyFont),
    },
  };
};

export const fontStack = (font) =>
  font === "TIMES" ? "Georgia, 'Times New Roman', serif" :
    font === "COURIER" ? "'DM Mono', Consolas, monospace" : "Arial, Helvetica, sans-serif";

