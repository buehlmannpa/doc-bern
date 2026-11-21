import { NextResponse } from "next/server";
import { getPublishedEventDetail } from "@/lib/db";

export const dynamic = "force-dynamic";

// Öffentliche Abfrage: Inhalt EINES Events, wird beim Aufklappen einer Kachel geladen.
// Liefert nur veröffentlichte Events, deren Zeitpunkt erreicht ist (Entwürfe und geplante
// Events sind hier nie abrufbar).
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Ungültige Event-ID." }, { status: 400 });
  }
  try {
    const detail = await getPublishedEventDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ detail });
  } catch {
    return NextResponse.json({ error: "Event konnte nicht geladen werden." }, { status: 500 });
  }
}
