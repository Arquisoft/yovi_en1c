
/**
 * Validates and sanitizes a username.
 * Only allows alphanumeric characters, underscores, and hyphens.
 * SonarCloud tssecurity:S8475 — taint cleared via strict whitelist.
 */
export function sanitizeUsername(raw: unknown): string {
  if (raw === null || raw === undefined) {
    throw new Error("Invalid username format.");
  }

  const str = typeof raw === 'string' ? raw : String(raw || "") as string;
  const clean = str.replaceAll(/[^a-zA-Z0-9_-]/g, "");

if (!clean) {
  throw new Error("Invalid username format.");
}
return clean;
}


export function sanitizeToken(raw: unknown): string {
  if (raw === null || raw === undefined || typeof raw === 'object') {
    throw new Error("Invalid token format received.");
  }
  
  const str = typeof raw === 'string' ? raw :String(raw || "") as string;

  const jwtRegex = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
  if (!jwtRegex.test(str)){

  throw new Error("Invalid token format received.");
  }
  return str;
}
