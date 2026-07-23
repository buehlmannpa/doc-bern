import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

// Sucht einen Blob-Read-Write-Token. Standard ist BLOB_READ_WRITE_TOKEN,
// manche Stores legen ihn jedoch mit Präfix an (z.B. XYZ_READ_WRITE_TOKEN).
function findBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("READ_WRITE_TOKEN") && value) return value;
    if (typeof value === "string" && value.startsWith("vercel_blob_rw_")) return value;
  }
  return undefined;
}

export async function POST(request: Request) {
  const token = findBlobToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Kein Blob-Schreibtoken gefunden. Bitte in Vercel unter Storage → Blob einen Read-Write-Token erstellen und als Umgebungsvariable BLOB_READ_WRITE_TOKEN hinterlegen, dann neu deployen. (Alternativ Bild-URL einfügen.)",
      },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Keine Datei erhalten." }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`uploads/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
      token,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json(
      { error: `Upload fehlgeschlagen: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
