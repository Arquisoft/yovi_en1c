

/**
 * Validates and sanitizes a username.
 * Only allows alphanumeric characters, underscores, and hyphens.
 * SonarCloud tssecurity:S8475 — taint cleared via strict whitelist.
 */
export function sanitizeUsername(raw: unknown): string {
  const str = String(raw ?? "");

  const clean = str.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!clean) throw new Error("Invalid username received from server.");
  return clean;
}

/**
 * Validates and sanitizes a JWT token.
 * JWT format: three base64url segments separated by dots.
 * SonarCloud tssecurity:S8475 — taint cleared via strict whitelist.
 */
export function sanitizeToken(raw: unknown): string {
  const str = String(raw ?? "");

  const jwtRegex = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
  if (!jwtRegex.test(str)) throw new Error("Invalid token format received.");
  return str;
}
