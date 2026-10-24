import { del } from "@vercel/blob";
import { findBlobToken } from "./blob-token";
import { isImageStillUsed } from "./db";

// Nur Bilder aus unserem Blob-Speicher werden gelöscht – nie externe Adressen oder Bilder der Website (/logo.png)
function isBlobUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

// Löscht Bilder im Blob-Speicher, die nach dem Löschen eines Eintrags nirgends mehr verwendet werden.
// Fehler hier dürfen das Löschen des Eintrags nicht verhindern (der ist in der Datenbank schon weg).
export async function deleteUnusedBlobs(urls: string[]): Promise<{ deleted: number; failed: boolean }> {
  const candidates = [...new Set(urls)].filter(isBlobUrl);
  if (candidates.length === 0) return { deleted: 0, failed: false };
  try {
    const token = findBlobToken();
    if (!token) return { deleted: 0, failed: true };
    const unused: string[] = [];
    for (const u of candidates) if (!(await isImageStillUsed(u))) unused.push(u);
    if (unused.length) await del(unused, { token });
    return { deleted: unused.length, failed: false };
  } catch (e) {
    console.error("Blob-Aufräumen fehlgeschlagen:", (e as Error).message);
    return { deleted: 0, failed: true };
  }
}
