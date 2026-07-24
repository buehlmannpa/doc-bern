import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, isValidSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Sucht einen Blob-Read-Write-Token. Standard ist BLOB_READ_WRITE_TOKEN,
// manche Stores legen ihn mit Präfix an (z.B. XYZ_READ_WRITE_TOKEN).
function findBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("READ_WRITE_TOKEN") && value) return value;
    if (typeof value === "string" && value.startsWith("vercel_blob_rw_")) return value;
  }
  return undefined;
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = findBlobToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Kein Blob-Schreibtoken gefunden. Bitte BLOB_READ_WRITE_TOKEN in Vercel setzen und neu deployen.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async () => {
        // Nur angemeldete Admins dürfen einen Upload-Token erhalten.
        const store = await cookies();
        const ok = await isValidSession(store.get(COOKIE_NAME)?.value);
        if (!ok) {
          throw new Error("Nicht autorisiert – bitte im Admin-Bereich anmelden.");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/heic",
            "image/heif",
          ],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // Kein Nachbearbeiten nötig – die URL wird direkt im Client verwendet.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json(
      { error: `Upload fehlgeschlagen: ${(e as Error).message}` },
      { status: 400 }
    );
  }
}
