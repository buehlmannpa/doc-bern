import { NextResponse } from "next/server";
import {
  createNews,
  getNews,
  updateNews,
  deleteNews,
  reorderNews,
  isDbConfigured,
} from "@/lib/db";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const news = await getNews();
    return NextResponse.json({ news });
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
    const body = (await request.json()) as Omit<NewsItem, "id" | "sortOrder">;
    if (!body.title) {
      return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
    }
    const item = await createNews({
      title: body.title,
      summary: body.summary || "",
      content: body.content || "",
      imageUrl: body.imageUrl ?? null,
      links: body.links ?? [],
      category: body.category || "news",
      isArchived: body.isArchived ?? false,
      publishedAt: body.publishedAt || new Date().toISOString(),
    });
    return NextResponse.json({ item });
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
    const body = (await request.json()) as (Omit<NewsItem, "id" | "sortOrder"> & { id?: string });
    if (!body.id) {
      return NextResponse.json({ error: "Keine id angegeben." }, { status: 400 });
    }
    const item = await updateNews(body.id, {
      title: body.title,
      summary: body.summary || "",
      content: body.content || "",
      imageUrl: body.imageUrl ?? null,
      links: body.links ?? [],
      category: body.category || "news",
      isArchived: body.isArchived ?? false,
      publishedAt: body.publishedAt,
    });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json(
      { error: `Speichern fehlgeschlagen: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}

// Reihenfolge anpassen – ids im Body
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    await reorderNews(ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: `Sortieren fehlgeschlagen: ${(e as Error).message}` },
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
    await deleteNews(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: `Löschen fehlgeschlagen: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
