import { NextResponse } from "next/server";
import { createEvent, getEvents, updateEvent, deleteEvent, isDbConfigured } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import type { EventItem, NewsBlock } from "@/lib/types";
import { blocksToPlainText, collectImageUrls, parseBlocks } from "@/lib/blocks";
import { deleteUnusedBlobs, deleteReplacedBlobs } from "@/lib/blob-cleanup";
import { getStoredImageUrls } from "@/lib/db";

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
    let blocks: NewsBlock[] | null | undefined;
    try {
      blocks = parseBlocks((body as { blocks?: unknown }).blocks);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    // Reiner Text zusätzlich in "description" ablegen (Rückfall, Kalender-Export)
    const description = blocks && blocks.length > 0 ? blocksToPlainText(blocks) : body.description || "";
    const event = await createEvent({
      title: body.title,
      date: body.date,
      time: body.time || "",
      location: body.location || "",
      description,
      blocks,
      imageUrl: body.imageUrl ?? null,
      links: body.links ?? [],
      badge: body.badge ?? null,
      status: body.status === "draft" ? "draft" : "published",
      publishAt: body.publishAt || new Date().toISOString(),
      updatedBy: await currentUsername(),
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
    let blocks: NewsBlock[] | null | undefined;
    try {
      blocks = parseBlocks((body as { blocks?: unknown }).blocks);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    // Reiner Text zusätzlich in "description" ablegen (Rückfall, Kalender-Export)
    const description = blocks && blocks.length > 0 ? blocksToPlainText(blocks) : body.description || "";
    const before = await getStoredImageUrls("events", body.id);
    const event = await updateEvent(body.id, {
      title: body.title,
      date: body.date,
      time: body.time || "",
      location: body.location || "",
      description,
      blocks,
      imageUrl: body.imageUrl ?? null,
      links: body.links ?? [],
      badge: body.badge ?? null,
      status: body.status === "draft" ? "draft" : "published",
      publishAt: body.publishAt || new Date().toISOString(),
      updatedBy: await currentUsername(),
    });
    await deleteReplacedBlobs(before, collectImageUrls(event.imageUrl, event.blocks));
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
    const urls = await deleteEvent(id);
    const cleanup = await deleteUnusedBlobs(urls);
    return NextResponse.json({ ok: true, deletedImages: cleanup.deleted, imageCleanupFailed: cleanup.failed });
  } catch (e) {
    return NextResponse.json(
      { error: `Löschen fehlgeschlagen: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
