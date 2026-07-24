import { NextResponse } from "next/server";
import { verifyLogin } from "@/lib/db";
import { COOKIE_NAME, makeSessionToken, normalizeUsername } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let username = "";
  let password = "";
  try {
    const body = await request.json();
    username = normalizeUsername(String(body.username || ""));
    password = String(body.password || "");
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "Benutzername und Passwort erforderlich" }, { status: 400 });
  }

  let user = null;
  try {
    user = await verifyLogin(username, password);
  } catch (e) {
    return NextResponse.json({ error: `Fehler: ${(e as Error).message}` }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Benutzername oder Passwort falsch" }, { status: 401 });
  }

  const token = await makeSessionToken(user.username);
  const res = NextResponse.json({ ok: true, user: { username: user.username, name: user.name, role: user.role } });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
