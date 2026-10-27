import { NextResponse } from "next/server";
import { currentUsername } from "@/lib/session";
import {
  createNews,
  getNews,
  updateNews,
  deleteNews,
  reorderNews,
  isDbConfigured,
} from "@/lib/db";
import type { NewsBlock, NewsItem } from "@/lib/types";
import { blocksToPlainText, sanitizeBlocks } from "@/lib/blocks";
import { deleteUnusedBlobs, deleteReplacedBlobs } from "@/lib/blob-cleanup";
import { getStoredImageUrls } from "@/lib/db";
import { collectImageUrls } from "@/lib/blocks";

export const dynamic = "force-dynamic";

// Bausteine aus dem Request prüfen. undefined = nicht mitgeschickt (bestehende bleiben unverändert),
// null = Bausteine entfernen. Ungültige Daten lösen einen verständlichen Fehler (400) aus.
function parseBlocks(v: unknown): NewsBlock[] | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return sanitizeBlocks(v);
}

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
    let blocks: NewsBlock[] | null | undefined;
    try {
      blocks = parseBlocks((body as { blocks?: unknown }).blocks);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    // Reiner Text zusätzlich in "content" ablegen (Rückfall, falls Bausteine einmal nicht verfügbar sind)
    const content = blocks && blocks.length > 0 ? blocksToPlainText(blocks) : body.content || "";
    const item = await createNews({
      title: body.title,
      summary: body.summary || "",
      content,
      blocks,
      imageUrl: body.imageUrl ?? null,
      links: body.links ?? [],
      category: body.category || "news",
      isArchived: body.isArchived ?? false,
      publishedAt: body.publishedAt || new Date().toISOString(),
      status: body.status === "draft" ? "draft" : "published",
      updatedBy: await currentUsername(),
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
    let blocks: NewsBlock[] | null | undefined;
    try {
      blocks = parseBlocks((body as { blocks?: unknown }).blocks);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    const content = blocks && blocks.length > 0 ? blocksToPlainText(blocks) : body.content || "";
    const before = await getStoredImageUrls("news", body.id);
    const item = await updateNews(body.id, {
      title: body.title,
      summary: body.summary || "",
      content,
      blocks,
      imageUrl: body.imageUrl ?? null,
      links: body.links ?? [],
      category: body.category || "news",
      isArchived: body.isArchived ?? false,
      publishedAt: body.publishedAt,
      status: body.status === "draft" ? "draft" : "published",
      updatedBy: await currentUsername(),
    });
    await deleteReplacedBlobs(before, collectImageUrls(item.imageUrl, item.blocks));
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
    const urls = await deleteNews(id);
    const cleanup = await deleteUnusedBlobs(urls);
    return NextResponse.json({ ok: true, deletedImages: cleanup.deleted, imageCleanupFailed: cleanup.failed });
  } catch (e) {
    return NextResponse.json(
      { error: `Löschen fehlgeschlagen: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
