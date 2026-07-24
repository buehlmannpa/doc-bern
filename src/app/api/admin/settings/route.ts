import { NextResponse } from "next/server";
import { getMaintenance, setMaintenance, isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const maintenance = await getMaintenance();
    return NextResponse.json({ maintenance });
  } catch (e) {
    return NextResponse.json({ error: `Datenbankfehler: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Keine Datenbank verbunden. Bitte Vercel Postgres verbinden und neu deployen." },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    await setMaintenance(Boolean(body.maintenance));
    return NextResponse.json({ maintenance: Boolean(body.maintenance) });
  } catch (e) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}
