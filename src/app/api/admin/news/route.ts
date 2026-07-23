import { NextResponse } from "next/server";
import { createNews, getNews, isDbConfigured } from "@/lib/db";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const news = await getNews();
  return NextResponse.json({ news });
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Keine Datenbank verbunden. Bitte Vercel Postgres verbinden." },
      { status: 503 }
    );
  }
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
}
