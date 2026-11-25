import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/session";
import { auditFacets, queryAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Protokoll lesen: nur für Super-Admins. Filter: from/to (Tag), actor, entity, action, q (Text), critical=1.
// Blättern: before=<id des letzten Eintrags>. Beim ersten Abruf kommt die Filterauswahl (Personen, Anzahl, ältester Eintrag) mit.
export async function GET(request: Request) {
  if (!(await requireSuperadmin())) return NextResponse.json({ error: "Nur für Super-Admins." }, { status: 403 });
  const p = new URL(request.url).searchParams;
  const before = p.get("before");
  try {
    const { entries, hasMore } = await queryAudit({
      from: p.get("from") ?? undefined,
      to: p.get("to") ?? undefined,
      actor: p.get("actor") ?? undefined,
      entity: p.get("entity") ?? undefined,
      action: p.get("action") ?? undefined,
      q: p.get("q") ?? undefined,
      critical: p.get("critical") === "1",
      before: before && /^\d{1,18}$/.test(before) ? Number(before) : undefined,
      limit: p.get("limit") ? Number(p.get("limit")) : 50,
    });
    return NextResponse.json({ entries, hasMore, facets: before ? undefined : await auditFacets() });
  } catch (e) {
    return NextResponse.json({ error: `Protokoll konnte nicht geladen werden: ${(e as Error).message}` }, { status: 500 });
  }
}
