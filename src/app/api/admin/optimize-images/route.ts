import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { optimizeImage, scanImages } from "@/lib/image-optimizer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Nur für Super-Admins. GET: Liste aller verwendeten Bilder mit Grösse (was lässt sich verkleinern?).
export async function GET() {
  if (!(await requireSuperadmin())) return NextResponse.json({ error: "Nur für Super-Admins." }, { status: 403 });
  try {
    return NextResponse.json({ images: await scanImages() });
  } catch (e) {
    return NextResponse.json({ error: `Prüfung fehlgeschlagen: ${(e as Error).message}` }, { status: 500 });
  }
}

// POST { url, dryRun? }: EIN Bild verkleinern (oder nur berechnen). Die Oberfläche ruft es Bild für Bild auf.
export async function POST(request: Request) {
  if (!(await requireSuperadmin())) return NextResponse.json({ error: "Nur für Super-Admins." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { url?: unknown; dryRun?: unknown };
  if (typeof body.url !== "string" || body.url.length > 2000) {
    return NextResponse.json({ error: "Bild-Adresse fehlt." }, { status: 400 });
  }
  const result = await optimizeImage(body.url, body.dryRun === true);
  if (result.status === "verkleinert") {
    const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
    const name = decodeURIComponent((body.url.split("?name=")[1] ?? body.url.split("/").pop() ?? "").slice(0, 60));
    await logAudit(request, { action: "optimize", entity: "image", label: name, detail: `${kb(result.before)} → ${kb(result.after)}` });
  }
  return NextResponse.json(result, { status: result.status === "fehler" ? 422 : 200 });
}
