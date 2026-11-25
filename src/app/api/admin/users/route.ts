import { NextResponse } from "next/server";
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, getAdminUserSnapshot } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requireSuperadmin } from "@/lib/session";
import { normalizeUsername, type AdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", superadmin: "Super-Admin" };

function role(v: unknown): AdminRole {
  return v === "superadmin" ? "superadmin" : "admin";
}

export async function GET() {
  if (!(await requireSuperadmin())) {
    return NextResponse.json({ error: "Nur für Super-Admins." }, { status: 403 });
  }
  try {
    return NextResponse.json({ users: await getAdminUsers() });
  } catch (e) {
    return NextResponse.json({ error: `Datenbankfehler: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireSuperadmin())) {
    return NextResponse.json({ error: "Nur für Super-Admins." }, { status: 403 });
  }
  try {
    const b = await request.json();
    const username = normalizeUsername(String(b.username || ""));
    if (!username) return NextResponse.json({ error: "Benutzername erforderlich." }, { status: 400 });
    if (!b.password) return NextResponse.json({ error: "Passwort erforderlich." }, { status: 400 });
    await createAdminUser({ username, name: String(b.name || ""), role: role(b.role), password: String(b.password) });
    await logAudit(request, { action: "create", entity: "user", id: username, label: username, detail: `Rolle: ${ROLE_LABEL[role(b.role)]}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await requireSuperadmin())) {
    return NextResponse.json({ error: "Nur für Super-Admins." }, { status: 403 });
  }
  try {
    const b = await request.json();
    const username = normalizeUsername(String(b.username || ""));
    if (!username) return NextResponse.json({ error: "Benutzername erforderlich." }, { status: 400 });
    const snap = await getAdminUserSnapshot(username);
    await updateAdminUser(username, {
      name: b.name !== undefined ? String(b.name) : undefined,
      role: b.role !== undefined ? role(b.role) : undefined,
      password: b.password ? String(b.password) : undefined,
    });
    // Im Protokoll steht nur WAS geändert wurde, nie das Passwort selbst
    const parts: string[] = [];
    if (b.role !== undefined && snap && snap.role !== role(b.role)) parts.push(`Rolle: ${ROLE_LABEL[snap.role]} → ${ROLE_LABEL[role(b.role)]}`);
    if (b.name !== undefined && snap && snap.name !== String(b.name)) parts.push("Anzeigename");
    if (b.password) parts.push("Passwort geändert");
    await logAudit(request, { action: "update", entity: "user", id: username, label: username, detail: parts.join(", ") || "keine Änderung" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const me = await requireSuperadmin();
  if (!me) {
    return NextResponse.json({ error: "Nur für Super-Admins." }, { status: 403 });
  }
  try {
    const username = normalizeUsername(new URL(request.url).searchParams.get("username") || "");
    if (!username) return NextResponse.json({ error: "Benutzername erforderlich." }, { status: 400 });
    if (username === me.username) {
      return NextResponse.json({ error: "Du kannst dich nicht selbst löschen." }, { status: 400 });
    }
    const snap = await getAdminUserSnapshot(username);
    await deleteAdminUser(username);
    await logAudit(request, { action: "delete", entity: "user", id: username, label: username, detail: snap ? `Rolle: ${ROLE_LABEL[snap.role]}` : null });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Löschen fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}
