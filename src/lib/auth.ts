// Einfache, Edge-kompatible Session-Authentifizierung mit einem
// gemeinsamen Admin-Passwort (Umgebungsvariable ADMIN_PASSWORD).

export const COOKIE_NAME = "doc_admin_session";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "";
}

// Berechnet den Session-Token (SHA-256 aus Passwort + Secret).
// Funktioniert sowohl in Node- als auch in Edge-Runtime (Web Crypto).
export async function sessionToken(): Promise<string> {
  const pw = getAdminPassword();
  const secret = process.env.SESSION_SECRET || "doc-bern-club-secret";
  const data = new TextEncoder().encode(`${pw}::${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Konstantzeit-Vergleich zweier Strings
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token || !getAdminPassword()) return false;
  return safeEqual(token, await sessionToken());
}
