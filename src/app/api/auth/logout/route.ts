import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { currentUsername } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const who = await currentUsername();
  if (who) await logAudit(request, { action: "logout", entity: "login", actor: who });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
