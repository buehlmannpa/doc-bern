// Benutzerbezogene Authentifizierung (Benutzername + Passwort).
// Session-Cookie = "<username>|<signatur>", edge-kompatibel via Web Crypto.

export const COOKIE_NAME = "doc_admin_session";

export type AdminRole = "superadmin" | "admin";

function secret(): string {
  return process.env.SESSION_SECRET || "doc-bern-club-secret";
}

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Passwort-Hash (für Speicherung/Vergleich)
export function hashPassword(password: string): Promise<string> {
  return sha256hex(`${password}::${secret()}::pw`);
}

// Signatur eines Benutzernamens (für das Session-Cookie)
function signUsername(username: string): Promise<string> {
  return sha256hex(`${username}::${secret()}::sess`);
}

export async function makeSessionToken(username: string): Promise<string> {
  return `${username}|${await signUsername(username)}`;
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

// Liefert den eingeloggten Benutzernamen, oder null wenn ungültig.
export async function getSessionUser(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const idx = token.lastIndexOf("|");
  if (idx <= 0) return null;
  const username = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = await signUsername(username);
  return safeEqual(sig, expected) ? username : null;
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  return (await getSessionUser(token)) !== null;
}

export function normalizeUsername(u: string): string {
  return (u || "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
}
