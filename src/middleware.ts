import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, isValidSession } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login-Seite und Auth-API immer erlauben.
  // Der Upload-Endpoint prüft die Anmeldung selbst (onBeforeGenerateToken) und
  // muss zusätzlich den Abschluss-Callback von Vercel Blob (ohne Cookie) empfangen.
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/admin/upload"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valid = await isValidSession(token);

  if (!valid) {
    // Admin-Seiten -> Login-Redirect
    if (pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    // Schreibende Admin-APIs -> 401
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
