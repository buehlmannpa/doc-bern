import { NextResponse } from "next/server";
import { COOKIE_NAME, getAdminPassword, safeEqual, sessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const adminPw = getAdminPassword();
  if (!adminPw) {
    return NextResponse.json(
      { error: "Kein Admin-Passwort konfiguriert. Bitte ADMIN_PASSWORD in Vercel setzen." },
      { status: 500 }
    );
  }

  let password = "";
  try {
    const body = await request.json();
    password = String(body.password || "");
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!safeEqual(password, adminPw)) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  const token = await sessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 Tage
  });
  return res;
}
