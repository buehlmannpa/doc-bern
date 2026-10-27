import { NextResponse } from "next/server";
import { getPublishedNewsDetail } from "@/lib/db";

export const dynamic = "force-dynamic";

// Öffentliche Abfrage: Inhalt EINES Beitrags, wird beim Öffnen einer Kachel geladen.
// Liefert nur veröffentlichte Beiträge, deren Zeitpunkt erreicht ist (Entwürfe und geplante
// Beiträge sind hier nie abrufbar). Die id kommt als Query-Parameter (wie bei den Admin-Routen).
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Ungültige Beitrags-ID." }, { status: 400 });
  }
  try {
    const detail = await getPublishedNewsDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Beitrag nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ detail });
  } catch {
    // Keine internen Fehlermeldungen nach aussen geben
    return NextResponse.json({ error: "Beitrag konnte nicht geladen werden." }, { status: 500 });
  }
}
