import { NextResponse } from "next/server";
import { createEvent, getEvents, isDbConfigured } from "@/lib/db";
import type { EventItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json(
      { error: `Datenbankfehler: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Keine Datenbank verbunden. Bitte Vercel Postgres verbinden und neu deployen." },
      { status: 503 }
    );
  }
  try {
    const body = (await request.json()) as Omit<EventItem, "id">;
    if (!body.title || !body.date) {
      return NextResponse.json({ error: "Titel und Datum sind erforderlich." }, { status: 400 });
    }
    const event = await createEvent({
      title: body.title,
      date: body.date,
      time: body.time || "",
      location: body.location || "",
      description: body.description || "",
      imageUrl: body.imageUrl ?? null,
      links: body.links ?? [],
      badge: body.badge ?? null,
    });
    return NextResponse.json({ event });
  } catch (e) {
    return NextResponse.json(
      { error: `Speichern fehlgeschlagen: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
