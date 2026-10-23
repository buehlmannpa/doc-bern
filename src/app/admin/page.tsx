import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import MaintenanceToggle from "@/components/MaintenanceToggle";
import { isDbConfigured } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const icons: Record<string, React.ReactNode> = {
  events: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  ),
  news: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h10" />
  ),
  actions: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  ),
  partners: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  ),
  board: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  ),
  users: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3M13 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-1a6 6 0 0112 0v1H3z" />
  ),
};

export default async function AdminDashboard() {
  const dbReady = isDbConfigured();
  const user = await currentUser();

  const tiles = [
    { href: "/admin/events", label: "Events", icon: "events" },
    { href: "/admin/news", label: "News", icon: "news" },
    { href: "/admin/actions", label: "Rabattaktion", icon: "actions" },
    { href: "/admin/partners", label: "Partner", icon: "partners" },
    { href: "/admin/board", label: "Vorstand", icon: "board" },
    ...(user?.role === "superadmin"
      ? [{ href: "/admin/users", label: "Benutzer", icon: "users" }]
      : []),
  ];

  return (
    <div>
      <AdminNav />
      <h1 className="text-2xl font-bold tracking-tight mb-1 px-1">Admin-Bereich</h1>
      <p className="text-sm mb-5 px-1" style={{ color: "var(--text-secondary)" }}>
        Wähle einen Bereich, um Inhalte der DOC-Bern App zu verwalten.
      </p>

      {!dbReady && (
        <div className="glass-card p-4 mb-5 text-sm" style={{ background: "rgba(255,149,0,0.1)" }}>
          <strong>Datenbank noch nicht verbunden.</strong> Verbinde in Vercel unter
          „Storage" eine Postgres-Datenbank, damit erstellte Inhalte dauerhaft
          gespeichert werden. Bis dahin siehst du Beispieldaten.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="glass-card p-5 flex flex-col items-center text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
              style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                {icons[t.icon]}
              </svg>
            </div>
            <span className="font-semibold text-sm">{t.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <MaintenanceToggle />
      </div>
    </div>
  );
}
