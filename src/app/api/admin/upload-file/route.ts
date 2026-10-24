import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, isValidSession } from "@/lib/auth";
import { findBlobTokenEntry } from "@/lib/blob-token";

export const dynamic = "force-dynamic";

// Upload über den Server: gedacht für die im Browser bereits verkleinerten Bilder (ca. 30-200 KB).
// Der Browser muss dafür nur unsere eigene Adresse erreichen (kein Direktupload zu Vercel Blob).
const MAX_BYTES = 4 * 1024 * 1024; // Server-Functions erlauben ca. 4.5 MB pro Anfrage
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request): Promise<NextResponse> {
  const store = await cookies();
  if (!(await isValidSession(store.get(COOKIE_NAME)?.value))) {
    return NextResponse.json({ error: "Nicht autorisiert – bitte im Admin-Bereich anmelden." }, { status: 401 });
  }
  const entry = findBlobTokenEntry();
  const token = entry?.value;
  if (!token) {
    return NextResponse.json({ error: "Kein Blob-Schreibtoken gefunden (BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  }

  let file: FormDataEntryValue | null = null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (!file || typeof file === "string") return NextResponse.json({ error: "Keine Datei erhalten." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Dateityp nicht erlaubt (JPG, PNG, WebP, GIF)." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Datei zu gross." }, { status: 413 });

  const base = (file.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "bild").slice(0, 60);
  try {
    const blob = await put(`${base}.${ext}`, file, {
      access: "public",
      token,
      contentType: file.type,
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: `Upload fehlgeschlagen: ${(e as Error).message} (Token: ${entry!.name})` }, { status: 502 });
  }
}
