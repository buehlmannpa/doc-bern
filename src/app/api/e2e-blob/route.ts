import { NextResponse } from "next/server";
import { fakeStore, isFakeBlob } from "@/lib/blob-store";

export const dynamic = "force-dynamic";

// NUR für die automatischen Tests (E2E_FAKE_BLOB=1): einfacher Bildspeicher im Arbeitsspeicher.
// Ohne dieses Flag (alle echten Umgebungen) antwortet die Route immer mit 404.
const off = () => new NextResponse(null, { status: 404 });

export async function GET(request: Request) {
  if (!isFakeBlob()) return off();
  const hit = fakeStore().get(new URL(request.url).searchParams.get("name") || "");
  if (!hit) return off();
  return new NextResponse(new Uint8Array(hit.bytes), { headers: { "content-type": hit.type, "content-length": String(hit.bytes.length) } });
}

export async function HEAD(request: Request) {
  return GET(request);
}

export async function POST(request: Request) {
  if (!isFakeBlob()) return off();
  const url = new URL(request.url);
  const name = url.searchParams.get("name") || "";
  fakeStore().set(name, { bytes: Buffer.from(await request.arrayBuffer()), type: request.headers.get("content-type") || "image/jpeg" });
  return NextResponse.json({ url: `/api/e2e-blob?name=${encodeURIComponent(name)}` });
}

export async function DELETE(request: Request) {
  if (!isFakeBlob()) return off();
  fakeStore().delete(new URL(request.url).searchParams.get("name") || "");
  return NextResponse.json({ ok: true });
}
