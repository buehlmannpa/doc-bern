import { NextResponse } from "next/server";
import { getPastEvents } from "@/lib/db";
import { monthStartOf, zurichToday } from "@/lib/event-dates";

export const dynamic = "force-dynamic";

// Öffentliche Abfrage: vergangene Events EINES Jahres (leichte Felder, ohne Inhalt).
// Wird erst geladen, wenn jemand das Jahr im Zeitstrahl aufklappt. Nur veröffentlichte Events.
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("year") ?? "";
  const year = Number(raw);
  if (!/^\d{4}$/.test(raw) || year < 1990 || year > 2200) {
    return NextResponse.json({ error: "Ungültiges Jahr." }, { status: 400 });
  }
  try {
    const events = await getPastEvents(year, monthStartOf(zurichToday()));
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ error: "Events konnten nicht geladen werden." }, { status: 500 });
  }
}
