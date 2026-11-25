import { del, put } from "@vercel/blob";
import { blobUrlMatchesToken, findBlobTokenEntry } from "./blob-token";

// Zugriff auf den Bildspeicher für die serverseitige Bild-Verkleinerung.
// Im Testlauf (E2E_FAKE_BLOB=1, nur in der Test-Konfiguration gesetzt) ersetzt ein Speicher im Arbeitsspeicher den
// echten Vercel Blob, damit die Tests nie mit dem echten Speicher sprechen. In Produktion ist das Flag nie gesetzt.

const FAKE = process.env.E2E_FAKE_BLOB === "1";

type Fake = Map<string, { bytes: Buffer; type: string }>;
const g = globalThis as unknown as { __fakeBlobs?: Fake };
export function fakeStore(): Fake {
  if (!g.__fakeBlobs) g.__fakeBlobs = new Map();
  return g.__fakeBlobs;
}
export const isFakeBlob = () => FAKE;

const FAKE_BASE = "/api/e2e-blob?name="; // relativ: gilt auch in Bild-Bausteinen (nur https oder eigener Pfad erlaubt)

/** Darf diese Adresse bearbeitet werden? (Nur Bilder aus dem Speicher, zu dem der Token gehört.) */
export function canHandleUrl(url: string): boolean {
  if (FAKE) return url.startsWith(FAKE_BASE);
  const entry = findBlobTokenEntry();
  return Boolean(entry && blobUrlMatchesToken(url, entry.value));
}

export async function readBlob(url: string): Promise<{ bytes: Buffer; type: string }> {
  if (FAKE) {
    const hit = fakeStore().get(decodeURIComponent(url.slice(FAKE_BASE.length)));
    if (!hit) throw new Error("Bild nicht gefunden.");
    return hit;
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Bild konnte nicht geladen werden (${res.status}).`);
  return { bytes: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") || "" };
}

export async function headBlob(url: string): Promise<{ bytes: number; type: string }> {
  if (FAKE) {
    const hit = fakeStore().get(decodeURIComponent(url.slice(FAKE_BASE.length)));
    if (!hit) throw new Error("Bild nicht gefunden.");
    return { bytes: hit.bytes.length, type: hit.type };
  }
  const res = await fetch(url, { method: "HEAD", cache: "no-store" });
  if (!res.ok) throw new Error(`Bild nicht erreichbar (${res.status}).`);
  return { bytes: Number(res.headers.get("content-length") || 0), type: res.headers.get("content-type") || "" };
}

export async function writeBlob(name: string, bytes: Buffer, type: string): Promise<string> {
  if (FAKE) {
    const key = `${name}-${Math.random().toString(36).slice(2, 8)}`;
    fakeStore().set(key, { bytes, type });
    return FAKE_BASE + encodeURIComponent(key);
  }
  const entry = findBlobTokenEntry();
  if (!entry) throw new Error("Kein Blob-Schreibtoken gefunden.");
  const blob = await put(name, bytes, { access: "public", token: entry.value, contentType: type, addRandomSuffix: true });
  return blob.url;
}

export async function removeBlob(url: string): Promise<void> {
  if (FAKE) {
    fakeStore().delete(decodeURIComponent(url.slice(FAKE_BASE.length)));
    return;
  }
  const entry = findBlobTokenEntry();
  if (!entry || !blobUrlMatchesToken(url, entry.value)) return;
  await del([url], { token: entry.value });
}
