import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, isValidSession } from "@/lib/auth";
import { deleteUnusedBlobs } from "@/lib/blob-cleanup";

export const dynamic = "force-dynamic";

// Räumt Bilder auf, die im Editor hochgeladen, aber nicht gespeichert wurden (Abbrechen/Schliessen,
// ersetztes Bild vor dem Speichern). Gelöscht wird nur, was nirgends in der Datenbank verwendet wird.
export async function POST(request: Request): Promise<NextResponse> {
  const store = await cookies();
  if (!(await isValidSession(store.get(COOKIE_NAME)?.value))) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { urls?: unknown };
  const urls = Array.isArray(body.urls) ? body.urls.filter((u): u is string => typeof u === "string").slice(0, 200) : [];
  const result = await deleteUnusedBlobs(urls);
  return NextResponse.json({ ok: true, deleted: result.deleted });
}
