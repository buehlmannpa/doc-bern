import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, isValidSession } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pfad als Header weitergeben, damit das Layout den Wartungsmodus korrekt
  // (nur für Nicht-Admin-Seiten) anzeigen kann.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Admin-Bereich absichern. Login und Upload sind ausgenommen:
  // Login ist öffentlich, der Upload-Endpoint prüft die Anmeldung selbst und
  // muss zusätzlich den Abschluss-Callback von Vercel Blob (ohne Cookie) empfangen.
  const needsAuth =
    (pathname.startsWith("/admin") && pathname !== "/admin/login") ||
    (pathname.startsWith("/api/admin") && pathname !== "/api/admin/upload");

  if (needsAuth) {
    const valid = await isValidSession(request.cookies.get(COOKIE_NAME)?.value);
    if (!valid) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Läuft auf allen Seiten/Routen ausser statischen Assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|logo.svg|apple-touch-icon.png|icon-512.png|manifest.json|images/).*)",
  ],
};
