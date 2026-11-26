import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// NUR für die automatischen Tests: simuliert die Händler-Seite (E2E_FAKE_HOURS=1). Sonst immer 404.
// POST setzt den Inhalt, GET liefert ihn aus. Test-Szenarien: "html" (Seite), "status" (HTTP-Status).
const g = globalThis as unknown as { __fakeHours?: { html: string; status: number } };
const on = () => process.env.E2E_FAKE_HOURS === "1";

export async function GET() {
  if (!on()) return new NextResponse(null, { status: 404 });
  const s = g.__fakeHours ?? { html: "", status: 500 };
  return new NextResponse(s.html, { status: s.status, headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function POST(request: Request) {
  if (!on()) return new NextResponse(null, { status: 404 });
  const b = (await request.json()) as { html?: string; status?: number };
  g.__fakeHours = { html: b.html ?? "", status: b.status ?? 200 };
  return NextResponse.json({ ok: true });
}
