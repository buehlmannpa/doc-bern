import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  const dbReady = isDbConfigured();

  return (
    <div>
      <AdminNav />
      <h1 className="text-2xl font-bold tracking-tight mb-1 px-1">Admin-Bereich</h1>
      <p className="text-sm mb-5 px-1" style={{ color: "var(--text-secondary)" }}>
        Verwalte hier Events und News der DOC-Bern App.
      </p>

      {!dbReady && (
        <div
          className="glass-card p-4 mb-5 text-sm"
          style={{ background: "rgba(255,149,0,0.1)" }}
        >
          <strong>Datenbank noch nicht verbunden.</strong> Verbinde in Vercel unter
          „Storage" eine Postgres-Datenbank, damit erstellte Inhalte dauerhaft
          gespeichert werden. Bis dahin siehst du Beispieldaten.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/events" className="glass-card p-5 flex flex-col items-center text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
            style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-semibold text-sm">Events verwalten</span>
        </Link>

        <Link href="/admin/news" className="glass-card p-5 flex flex-col items-center text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
            style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h10" />
            </svg>
          </div>
          <span className="font-semibold text-sm">News verwalten</span>
        </Link>
      </div>
    </div>
  );
}
