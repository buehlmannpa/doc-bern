import { NextResponse } from "next/server";
import { getPartners, createPartner, updatePartner, deletePartner, reorderPartners, isDbConfigured } from "@/lib/db";
import type { PartnerItem } from "@/lib/types";
import { logAudit, auditDiff } from "@/lib/audit";
import { getAuditSnapshot } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ partners: await getPartners() });
  } catch (e) {
    return NextResponse.json({ error: `Datenbankfehler: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Keine Datenbank verbunden." }, { status: 503 });
  }
  try {
    const b = (await request.json()) as Omit<PartnerItem, "id" | "sortOrder">;
    if (!b.name) return NextResponse.json({ error: "Name ist erforderlich." }, { status: 400 });
    const partner = await createPartner({
      name: b.name, category: b.category || "", description: b.description || "",
      address: b.address ?? null, phone: b.phone ?? null, email: b.email ?? null,
      website: b.website ?? null, discount: b.discount ?? null,
    });
    await logAudit(request, { action: "create", entity: "partner", id: partner.id, label: partner.name });
    return NextResponse.json({ partner });
  } catch (e) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const b = (await request.json()) as (Omit<PartnerItem, "id" | "sortOrder"> & { id?: string });
    if (!b.id) return NextResponse.json({ error: "Keine id angegeben." }, { status: 400 });
    const snap = await getAuditSnapshot("partner", b.id);
    const partner = await updatePartner(b.id, {
      name: b.name, category: b.category || "", description: b.description || "",
      address: b.address ?? null, phone: b.phone ?? null, email: b.email ?? null,
      website: b.website ?? null, discount: b.discount ?? null,
    });
    await logAudit(request, { action: "update", entity: "partner", id: partner.id, label: partner.name, detail: auditDiff("partner", snap, partner as unknown as Record<string, unknown>) });
    return NextResponse.json({ partner });
  } catch (e) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const b = await request.json();
    await reorderPartners(Array.isArray(b.ids) ? b.ids : []);
    await logAudit(request, { action: "reorder", entity: "partner" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Sortieren fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Keine id angegeben." }, { status: 400 });
    const snap = await getAuditSnapshot("partner", id);
    await deletePartner(id);
    if (snap) await logAudit(request, { action: "delete", entity: "partner", id, label: String(snap.name) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Löschen fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}
