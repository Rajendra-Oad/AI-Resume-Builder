/**
 * Returns a cryptographically secure random integer in [0, max) without modulo bias.
 * Uses rejection sampling: discards values that would introduce uneven distribution.
 */
function unbiasedRandom(max) {
  const limit = Math.floor(0xFFFFFFFF / max) * max;
  let r;
  do {
    r = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  } while (r >= limit);
  return r % max;
}

const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "password", "password1", "qwerty123",
  "letmein", "welcome", "admin123", "iloveyou", "monkey123",
]);

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const isCommonPassword = (password) =>
  COMMON_PASSWORDS.has(password.trim().toLowerCase());

export const isBasedOnEmail = (password, email = "") => {
  const localPart = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalized = password.toLowerCase().replace(/[^a-z0-9]/g, "");
  return Boolean(localPart && localPart.length >= 3 && normalized.includes(localPart));
};

export const evaluatePassword = (password = "", email = "") => {
  if (!password) return { score: 0, percent: 0, label: "Very weak", tone: "neutral" };

  const common = isCommonPassword(password);
  const personal = isBasedOnEmail(password, email);
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const uniqueRatio = new Set(password).size / password.length;
  let entropy = password.length * Math.log2(Math.max(2, classes * 18));
  entropy += Math.min(15, uniqueRatio * 15);
  if (common) entropy = Math.min(entropy, 12);
  if (personal) entropy -= 12;

  const thresholds = [18, 30, 44, 60, 80];
  let score = thresholds.filter((threshold) => entropy >= threshold).length;
  if (password.length < PASSWORD_MIN_LENGTH) score = Math.min(score, 1);
  const levels = [
    ["Very weak", "neutral"], ["Weak", "orange"], ["Fair", "yellow"],
    ["Good", "lime"], ["Strong", "green"], ["Excellent", "diamond"],
  ];
  return {
    score,
    percent: Math.max(6, Math.min(100, Math.round((entropy / 88) * 100))),
    label: levels[score][0],
    tone: levels[score][1],
    common,
    personal,
    strongEnough: password.length >= PASSWORD_MIN_LENGTH && !common && !personal && score >= 3,
  };
};

export const validateNewPassword = (password) => {
  if (!password) return "Password is required.";
  if (password.length < PASSWORD_MIN_LENGTH) return "Password must be at least 8 characters.";
  if (password.length > PASSWORD_MAX_LENGTH) return "Password must be 128 characters or fewer.";
  if (isCommonPassword(password)) return "Choose a less commonly used password.";
  return true;
};

export const generateStrongPassword = (length = 20) => {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%^&*()-_=+[]{};:,.?",
  ];
  const output = groups.map((group) => group[unbiasedRandom(group.length)]);
  const all = groups.join("");
  while (output.length < Math.max(16, Math.min(24, length))) {
    output.push(all[unbiasedRandom(all.length)]);
  }
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swap = unbiasedRandom(index + 1);
    [output[index], output[swap]] = [output[swap], output[index]];
  }
  return output.join("");
};
