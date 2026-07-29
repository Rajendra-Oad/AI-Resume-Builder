// HIBP's range API receives only the first five characters of a SHA-1 hash.
// The complete password and complete hash never leave the browser.
export const checkPasswordBreach = async (password, { signal } = {}) => {
  const digest = await globalThis.crypto.subtle.digest("SHA-1", new globalThis.TextEncoder().encode(password));
  const hash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const response = await globalThis.fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    signal,
    headers: { "Add-Padding": "true" },
  });
  if (!response.ok) throw new Error("Breach check is temporarily unavailable.");
  const match = (await response.text())
    .split(/\r?\n/)
    .find((line) => line.startsWith(`${suffix}:`));
  return match ? Number(match.split(":")[1]) : 0;
};
