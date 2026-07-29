const words = (value = "") => value.trim().split(/\s+/).filter(Boolean);

export const QualityAnalyzer = Object.freeze({
  wordCount: (value) => words(value).length,
  isMeaningful(value, minimumWords = 3) {
    const tokens = words(value);
    return tokens.length >= minimumWords && new Set(tokens.map((word) => word.toLowerCase())).size >= Math.min(3, minimumWords);
  },
  hasImpact(value = "") {
    return /\b(increased|reduced|improved|built|created|delivered|led|managed|designed|developed|implemented|launched|automated|\d+%?)\b/i.test(value);
  },
  isEmail(value = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  },
  isPhone(value = "") {
    return value.replace(/\D/g, "").length >= 7;
  },
  isUrl(value = "") {
    if (!value.trim()) return false;
    try {
      return Boolean(new window.URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.includes("."));
    } catch {
      return false;
    }
  },
});
