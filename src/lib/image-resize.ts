// Verkleinert Fotos im Browser, BEVOR sie hochgeladen werden (spart Speicher und Ladezeit).
// Gemessen an Handy-Fotos: ca. 1,6 MB -> ca. 100 KB bei 960 px (siehe docs/PROPOSAL-news-bloecke.md).
//
// - Die Ausrichtung des Fotos (EXIF) wird beachtet, dann fallen alle Foto-Infos weg
//   (auch der GPS-Standort), weil das Bild neu gespeichert wird.
// - Format: WebP, wo der Browser es erzeugen kann, sonst JPEG (PNG bleibt PNG).
// - Qualität wird so lange gesenkt, bis die Zielgrösse erreicht ist, aber nicht unter eine Untergrenze.
// - Animierte GIFs und SVG bleiben unverändert.

export type ResizeOptions = {
  maxEdge?: number; // längste Seite in Pixel
  targetKb?: number; // Zielgrösse in KB
  minQuality?: number; // Untergrenze der Qualität (0..1)
};

export class ImageReadError extends Error {}

const DEFAULTS = { maxEdge: 960, targetKb: 100, minQuality: 0.45 };

let webpSupport: Promise<boolean> | null = null;
function canEncodeWebp(): Promise<boolean> {
  if (!webpSupport) {
    webpSupport = new Promise((resolve) => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 1;
        c.toBlob((b) => resolve(!!b && b.type === "image/webp"), "image/webp", 0.8);
      } catch {
        resolve(false);
      }
    });
  }
  return webpSupport;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function extFor(type: string): string {
  return type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
}

export async function resizeImage(file: File, opts: ResizeOptions = {}): Promise<File> {
  // Nicht gesetzte Werte (auch ausdrücklich "undefined") fallen auf die Standardwerte zurück
  const maxEdge = opts.maxEdge ?? DEFAULTS.maxEdge;
  const targetKb = opts.targetKb ?? DEFAULTS.targetKb;
  const minQuality = opts.minQuality ?? DEFAULTS.minQuality;

  // Animierte/vektorbasierte Formate nicht anfassen
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageReadError(
      "Das Foto konnte nicht gelesen werden. Bitte als JPG oder PNG speichern und nochmals versuchen."
    );
  }

  // Ergebnis übernehmen – ausser ein schon kleines, passendes Bild würde dadurch GRÖSSER: dann Original behalten
  const finish = (blob: Blob): File =>
    blob.size >= file.size && bmp.width <= maxEdge && bmp.height <= maxEdge ? file : makeFile(file, blob);

  try {
    const isPng = file.type === "image/png";
    const webp = await canEncodeWebp();
    // Grafiken (PNG) vertragen weniger Kompression als Fotos
    const floor = isPng ? Math.max(minQuality, 0.7) : minQuality;
    const outType = webp ? "image/webp" : isPng ? "image/png" : "image/jpeg";

    let best: Blob | null = null;
    const edges = [maxEdge, Math.round(maxEdge * 0.85)];

    for (const edge of edges) {
      const scale = Math.min(1, edge / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new ImageReadError("Das Foto konnte nicht verarbeitet werden.");
      if (outType === "image/jpeg") {
        ctx.fillStyle = "#ffffff"; // JPEG hat keine Transparenz
        ctx.fillRect(0, 0, w, h);
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, 0, 0, w, h);

      if (outType === "image/png") {
        const png = await toBlob(canvas, "image/png");
        if (png && (!best || png.size < best.size)) best = png;
        if (png && png.size <= targetKb * 1024) break;
        continue;
      }

      for (let q = 0.82; q >= floor - 0.001; q -= 0.06) {
        const blob = await toBlob(canvas, outType, q);
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= targetKb * 1024) return finish(blob);
      }
    }

    if (!best) throw new ImageReadError("Das Foto konnte nicht verarbeitet werden.");

    return finish(best);
  } finally {
    bmp.close();
  }
}

function makeFile(original: File, blob: Blob): File {
  const base = original.name.replace(/\.[^.]+$/, "") || "bild";
  const type = blob.type || "image/jpeg";
  return new File([blob], `${base}.${extFor(type)}`, { type });
}

export function formatKb(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
