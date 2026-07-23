import { NextResponse } from "next/server";
import { deleteEvent, updateEvent } from "@/lib/db";
import type { EventItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as Omit<EventItem, "id">;
  const event = await updateEvent(id, {
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
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteEvent(id);
  return NextResponse.json({ ok: true });
}
