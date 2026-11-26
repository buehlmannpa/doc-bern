import { del } from "@vercel/blob";
import { blobUrlMatchesToken, findBlobToken } from "./blob-token";
import { isImageStillUsed } from "./db";

// Löscht Bilder im Blob-Speicher, die nach dem Löschen eines Eintrags nirgends mehr verwendet werden.
// Fehler hier dürfen das Löschen des Eintrags nicht verhindern (der ist in der Datenbank schon weg).
export async function deleteUnusedBlobs(urls: string[]): Promise<{ deleted: number; failed: boolean }> {
  const token = findBlobToken();
  // Nur Bilder aus dem Speicher, zu dem der Token gehört (Dev löscht nie im Produktiv-Speicher)
  const candidates = [...new Set(urls)].filter((u) => (token ? blobUrlMatchesToken(u, token) : false));
  if (candidates.length === 0) return { deleted: 0, failed: false };
  try {
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

// Nach dem Speichern: Bilder löschen, die vorher im Eintrag waren und jetzt nicht mehr (ersetzt oder entfernt)
export async function deleteReplacedBlobs(before: string[], after: string[]) {
  const keep = new Set(after);
  return deleteUnusedBlobs(before.filter((u) => !keep.has(u)));
}
