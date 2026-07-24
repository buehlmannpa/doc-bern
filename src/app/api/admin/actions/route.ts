import { NextResponse } from "next/server";
import { createAction, getActions, updateAction, deleteAction, isDbConfigured } from "@/lib/db";
import type { ActionItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actions = await getActions(4); // nur die letzten 4 im Admin anzeigen
    return NextResponse.json({ actions });
  } catch (e) {
    return NextResponse.json({ error: `Datenbankfehler: ${(e as Error).message}` }, { status: 500 });
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
    const body = (await request.json()) as Omit<ActionItem, "id" | "createdAt">;
    if (!body.title) {
      return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
    }
    const action = await createAction({
      title: body.title,
      description: body.description || "",
      discount: body.discount || "",
      periodLabel: body.periodLabel || "",
    });
    return NextResponse.json({ action });
  } catch (e) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as (Omit<ActionItem, "id" | "createdAt"> & { id?: string });
    if (!body.id) {
      return NextResponse.json({ error: "Keine id angegeben." }, { status: 400 });
    }
    const action = await updateAction(body.id, {
      title: body.title,
      description: body.description || "",
      discount: body.discount || "",
      periodLabel: body.periodLabel || "",
    });
    return NextResponse.json({ action });
  } catch (e) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Keine id angegeben." }, { status: 400 });
    }
    await deleteAction(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Löschen fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}
