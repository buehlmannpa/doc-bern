import { NextResponse } from "next/server";
import { deleteNews, updateNews } from "@/lib/db";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as Omit<NewsItem, "id" | "sortOrder">;
  const item = await updateNews(id, {
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
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteNews(id);
  return NextResponse.json({ ok: true });
}
