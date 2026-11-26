import { NextResponse } from "next/server";
import { deleteUnusedBlobs, deleteReplacedBlobs } from "@/lib/blob-cleanup";
import { getStoredImageUrls, getBoard, createBoardMember, updateBoardMember, deleteBoardMember, reorderBoard, isDbConfigured } from "@/lib/db";
import type { BoardMemberItem } from "@/lib/types";
import { logAudit, auditDiff } from "@/lib/audit";
import { getAuditSnapshot } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ board: await getBoard() });
  } catch (e) {
    return NextResponse.json({ error: `Datenbankfehler: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Keine Datenbank verbunden." }, { status: 503 });
  }
  try {
    const b = (await request.json()) as Omit<BoardMemberItem, "id" | "sortOrder">;
    if (!b.name) return NextResponse.json({ error: "Name ist erforderlich." }, { status: 400 });
    const member = await createBoardMember({
      name: b.name, role: b.role || "", description: b.description ?? null, imageUrl: b.imageUrl ?? null,
    });
    await logAudit(request, { action: "create", entity: "board", id: member.id, label: member.name });
    return NextResponse.json({ member });
  } catch (e) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const b = (await request.json()) as (Omit<BoardMemberItem, "id" | "sortOrder"> & { id?: string });
    if (!b.id) return NextResponse.json({ error: "Keine id angegeben." }, { status: 400 });
    const snap = await getAuditSnapshot("board", b.id);
    const before = await getStoredImageUrls("board", b.id);
    const member = await updateBoardMember(b.id, {
      name: b.name, role: b.role || "", description: b.description ?? null, imageUrl: b.imageUrl ?? null,
    });
    await deleteReplacedBlobs(before, member.imageUrl ? [member.imageUrl] : []);
    await logAudit(request, { action: "update", entity: "board", id: member.id, label: member.name, detail: auditDiff("board", snap, member as unknown as Record<string, unknown>) });
    return NextResponse.json({ member });
  } catch (e) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const b = await request.json();
    await reorderBoard(Array.isArray(b.ids) ? b.ids : []);
    await logAudit(request, { action: "reorder", entity: "board" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Sortieren fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Keine id angegeben." }, { status: 400 });
    const snap = await getAuditSnapshot("board", id);
    const urls = await deleteBoardMember(id);
    await deleteUnusedBlobs(urls);
    if (snap) await logAudit(request, { action: "delete", entity: "board", id, label: String(snap.name) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Löschen fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}
