import { getImageReferences, isImageStillUsed, replaceImageUrl, type ImageRole } from "./db";
import { canHandleUrl, headBlob, readBlob, removeBlob, writeBlob } from "./blob-store";
import { isCandidateSize, shrinkToWebp } from "./image-shrink";

// Einmalige Verkleinerung der bereits hochgeladenen Bilder (Platz sparen):
// Original holen -> verkleinern -> neues Bild speichern -> Adresse überall in der Datenbank ersetzen -> Original löschen.
// Das Original wird erst gelöscht, wenn das neue Bild gespeichert und die Datenbank umgestellt ist.

export type ScanItem = {
  url: string;
  role: ImageRole;
  bytes: number;
  type: string;
  candidate: boolean;
  note?: string; // Grund, warum ein Bild nicht verkleinert wird
};

const SKIP_TYPES = /image\/(gif|svg)/i; // Animationen und Vektorgrafiken bleiben unverändert

export async function scanImages(): Promise<ScanItem[]> {
  const refs = await getImageReferences();
  const out: ScanItem[] = new Array(refs.length);
  let next = 0;
  async function worker() {
    while (next < refs.length) {
      const i = next++;
      const { url, role } = refs[i];
      if (!canHandleUrl(url)) {
        out[i] = { url, role, bytes: 0, type: "", candidate: false, note: "liegt nicht in diesem Bildspeicher" };
        continue;
      }
      try {
        const h = await headBlob(url);
        const skip = SKIP_TYPES.test(h.type);
        out[i] = { url, role, bytes: h.bytes, type: h.type, candidate: !skip && isCandidateSize(h.bytes, role), note: skip ? "GIF/SVG bleiben unverändert" : undefined };
      } catch (e) {
        out[i] = { url, role, bytes: 0, type: "", candidate: false, note: (e as Error).message };
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  return out.sort((a, b) => b.bytes - a.bytes);
}

function baseName(url: string): string {
  let name = "";
  try {
    const u = new URL(url, "http://x");
    name = u.searchParams.get("name") || decodeURIComponent(u.pathname.split("/").pop() || "");
  } catch {
    // leer
  }
  name = name.replace(/\.[A-Za-z0-9]{2,5}$/, "").replace(/-[A-Za-z0-9]{16,}$/, ""); // Endung und Zufallsteil entfernen
  name = name.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return (name || "bild").slice(0, 60);
}

export type OptimizeResult =
  | { status: "verkleinert"; before: number; after: number; newUrl: string; changedRows: number; deletedOriginal: boolean; note?: string }
  | { status: "vorschau"; before: number; after: number }
  | { status: "übersprungen"; before: number; note: string }
  | { status: "fehler"; message: string };

export async function optimizeImage(url: string, dryRun = false): Promise<OptimizeResult> {
  try {
    const ref = (await getImageReferences()).find((r) => r.url === url);
    if (!ref) return { status: "fehler", message: "Dieses Bild wird nirgends verwendet." };
    if (!canHandleUrl(url)) return { status: "fehler", message: "Dieses Bild liegt nicht in diesem Bildspeicher und wird nicht verändert." };

    const original = await readBlob(url);
    const before = original.bytes.length;
    if (SKIP_TYPES.test(original.type)) return { status: "übersprungen", before, note: "GIF/SVG bleiben unverändert." };

    const small = await shrinkToWebp(original.bytes, ref.role);
    const after = small.buffer.length;
    if (after >= before * 0.9) return { status: "übersprungen", before, note: "Das Bild ist bereits klein." };
    if (dryRun) return { status: "vorschau", before, after };

    // 1) Neues Bild speichern und prüfen, dass es erreichbar ist
    const newUrl = await writeBlob(`${baseName(url)}.webp`, small.buffer, "image/webp");
    try {
      const check = await headBlob(newUrl);
      if (check.bytes <= 0) throw new Error("Das neue Bild ist leer.");
    } catch (e) {
      await removeBlob(newUrl).catch(() => {});
      return { status: "fehler", message: `Das neue Bild konnte nicht geprüft werden: ${(e as Error).message}` };
    }

    // 2) Adresse überall ersetzen. Gelingt das nicht, bleibt das Original unangetastet.
    let changedRows = 0;
    try {
      changedRows = await replaceImageUrl(url, newUrl);
    } catch (e) {
      await removeBlob(newUrl).catch(() => {});
      return { status: "fehler", message: `Datenbank nicht umgestellt: ${(e as Error).message}` };
    }
    if (changedRows === 0) {
      await removeBlob(newUrl).catch(() => {});
      return { status: "fehler", message: "Das Bild wurde zwischenzeitlich entfernt oder geändert." };
    }

    // 3) Original löschen (nur wenn es nirgends mehr verwendet wird)
    let deletedOriginal = false;
    let note: string | undefined;
    try {
      if (!(await isImageStillUsed(url))) {
        await removeBlob(url);
        deletedOriginal = true;
      } else {
        note = "Das Original wird noch verwendet und bleibt erhalten.";
      }
    } catch (e) {
      note = `Das Original konnte nicht gelöscht werden: ${(e as Error).message}`;
    }
    return { status: "verkleinert", before, after, newUrl, changedRows, deletedOriginal, note };
  } catch (e) {
    return { status: "fehler", message: (e as Error).message };
  }
}
