import { NextResponse } from "next/server";
import { reorderNews } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  await reorderNews(ids);
  return NextResponse.json({ ok: true });
}
