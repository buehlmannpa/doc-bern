import { NextResponse } from "next/server";
import { createEvent, getEvents, updateEvent, deleteEvent, isDbConfigured } from "@/lib/db";
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

// Bearbeiten – id kommt im Body (dynamische [id]-Route wird auf Vercel umgangen)
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as (Omit<EventItem, "id"> & { id?: string });
    if (!body.id) {
      return NextResponse.json({ error: "Keine id angegeben." }, { status: 400 });
    }
    const event = await updateEvent(body.id, {
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

// Löschen – id als Query-Parameter (?id=...)
export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Keine id angegeben." }, { status: 400 });
    }
    await deleteEvent(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: `Löschen fehlgeschlagen: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
