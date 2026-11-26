import sharp from "sharp";
import type { ImageRole } from "./db";

// Verkleinert ein Bild auf Grösse und Dateigewicht, wie es neue Uploads im Browser erhalten (siehe image-resize.ts).
// Ergebnis ist immer WebP; Ausrichtung (EXIF) wird beachtet, Foto-Infos (auch GPS) fallen weg, Transparenz bleibt.
export const ROLE_LIMITS: Record<ImageRole, { maxEdge: number; targetKb: number }> = {
  standard: { maxEdge: 960, targetKb: 100 }, // Titelbild, Bild-Baustein, Vorstand
  galerie: { maxEdge: 1280, targetKb: 180 }, // Galerie (Grossansicht)
  vorschau: { maxEdge: 480, targetKb: 35 }, // Galerie (Vorschau)
};

// Ab dieser Grösse lohnt sich eine Verkleinerung (Verhältnis zum Ziel)
export const CANDIDATE_FACTOR = 1.6;

export function isCandidateSize(bytes: number, role: ImageRole): boolean {
  return bytes > ROLE_LIMITS[role].targetKb * 1024 * CANDIDATE_FACTOR;
}

export async function shrinkToWebp(input: Buffer, role: ImageRole): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { maxEdge, targetKb } = ROLE_LIMITS[role];
  const base = sharp(input, { failOn: "error" }).rotate(); // Ausrichtung aus den Foto-Infos übernehmen
  const meta = await sharp(input).rotate().metadata();
  if (!meta.width || !meta.height) throw new Error("Das Bild konnte nicht gelesen werden.");

  let best: { buffer: Buffer; width: number; height: number } | null = null;
  for (const edge of [maxEdge, Math.round(maxEdge * 0.85)]) {
    const resized = base.clone().resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true });
    for (let q = 82; q >= 45; q -= 6) {
      const { data, info } = await resized.clone().webp({ quality: q, effort: 4 }).toBuffer({ resolveWithObject: true });
      if (!best || data.length < best.buffer.length) best = { buffer: data, width: info.width, height: info.height };
      if (data.length <= targetKb * 1024) return { buffer: data, width: info.width, height: info.height };
    }
  }
  if (!best) throw new Error("Das Bild konnte nicht verarbeitet werden.");
  return best;
}
