import Link from "next/link";
import Image from "next/image";
import { getPublishedEvents, getPublishedNews, getBoard } from "@/lib/db";
import { seedEvents, seedNews } from "@/lib/seed";
import { board, boardIntro, hostettlerInfo, membershipUrl } from "@/data/content";
import BoardMemberCard from "@/components/BoardMemberCard";

type BoardListItem = { name: string; role: string; description?: string | null; imageUrl?: string | null };

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", { day: "numeric", month: "short" });
}

const categoryLabels: Record<string, string> = {
  news: "Neuigkeit", report: "Bericht", interview: "Interview", update: "Update",
};
const categoryColors: Record<string, string> = {
  news: "rgba(var(--accent), 0.12)", report: "rgba(52, 199, 89, 0.12)",
  interview: "rgba(0, 122, 255, 0.12)", update: "rgba(255, 149, 0, 0.12)",
};
const categoryTextColors: Record<string, string> = {
  news: "rgb(var(--accent))", report: "#34c759", interview: "#007aff", update: "#ff9500",
};

export default async function Home() {
  let allEvents = seedEvents;
  let allNews = seedNews;
  let boardList: BoardListItem[] = board;
  try {
    [allEvents, allNews, boardList] = await Promise.all([
      getPublishedEvents(),
      getPublishedNews(),
      getBoard(),
    ]);
  } catch {
    // Bei DB-Problemen Beispieldaten anzeigen, damit die Seite nie fehlschlägt.
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextEvents = allEvents
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 2);

  const latestNews = allNews.filter((n) => !n.isArchived).slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="glass-card px-6 pt-5 pb-6 text-center">
        <Image src="/logo.png" alt="DOC Bern" width={96} height={96} className="mx-auto mb-3 rounded-2xl" priority />
        <h1 className="text-xl font-bold tracking-tight mb-1">Ducati Official Club Bern</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Willkommen auf der Seite vom DOC-Bern.
        </p>
      </section>

      {/* Events + News (Desktop: 2 Spalten) */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
      {/* Anstehende Events */}
      <section className="lg:flex lg:flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-bold tracking-tight">Anstehende Events</h2>
          <Link href="/events" className="text-sm font-semibold" style={{ color: "var(--accent-hex)" }}>Alle →</Link>
        </div>
        <div className="space-y-3 lg:space-y-0 lg:flex lg:flex-col lg:gap-3 lg:flex-1">
          {nextEvents.length === 0 && (
            <p className="glass-card p-4 text-sm lg:flex-1" style={{ color: "var(--text-secondary)" }}>
              Zurzeit sind keine Events geplant.
            </p>
          )}
          {nextEvents.map((event, i) => (
            <Link key={event.id} href="/events" className={`glass-card p-4 flex gap-4 items-start lg:items-center lg:flex-1${i >= 1 ? " hidden lg:flex" : ""}`}>
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex flex-col items-center justify-center" style={{ background: "rgba(var(--accent), 0.1)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--accent-hex)" }}>{formatDate(event.date).split(" ")[0]}</span>
                <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--accent-hex)" }}>{formatDate(event.date).split(" ")[1]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{event.title}</h3>
                  {event.badge && (
                    <span className="tag text-[10px]" style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}>{event.badge}</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{event.time} · {event.location}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Aktuelle News */}
      <section className="lg:flex lg:flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-bold tracking-tight">Aktuelle News</h2>
          <Link href="/newsletter" className="text-sm font-semibold" style={{ color: "var(--accent-hex)" }}>Alle →</Link>
        </div>
        <div className="space-y-3 lg:space-y-0 lg:flex lg:flex-col lg:gap-3 lg:flex-1">
          {latestNews.length === 0 && (
            <p className="glass-card p-4 text-sm lg:flex-1" style={{ color: "var(--text-secondary)" }}>Noch keine News.</p>
          )}
          {latestNews.map((item, i) => (
            <Link key={item.id} href="/newsletter" className={`glass-card block overflow-hidden lg:flex-1 lg:flex lg:flex-col${i >= 1 ? " hidden lg:flex" : ""}`}>
              <div className="p-4 lg:flex-1 lg:flex lg:flex-col lg:justify-center">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="tag text-[10px]" style={{ background: categoryColors[item.category], color: categoryTextColors[item.category] }}>{categoryLabels[item.category]}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{formatDate(item.publishedAt)}</span>
                </div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{item.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      </div>

      {/* Vorstand stellt sich vor */}
      <section>
        <h2 className="text-lg font-bold tracking-tight mb-1 px-1">Vorstand stellt sich vor</h2>
        <p className="text-sm mb-3 px-1" style={{ color: "var(--text-secondary)" }}>{boardIntro}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {boardList.map((m, i) => (
            <BoardMemberCard key={i} member={m} />
          ))}
        </div>
      </section>

      {/* hostettler + Mitglied werden (Desktop: 2 Spalten, gleiche Höhe) */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0 lg:items-stretch">
      {/* hostettler Quick Info */}
      <section className="glass-card p-5 lg:h-full lg:flex lg:flex-col">
        <h2 className="font-bold text-base mb-3">{hostettlerInfo.name}</h2>
        <div className="space-y-2.5 text-sm">
          <a href={`tel:${hostettlerInfo.phone}`} className="flex items-center gap-3" style={{ color: "var(--accent-hex)" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {hostettlerInfo.phone}
          </a>
          <a href={hostettlerInfo.googleMaps} target="_blank" rel="noopener" className="flex items-center gap-3" style={{ color: "var(--text-secondary)" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {hostettlerInfo.address}
          </a>
        </div>
        <Link href="/partners" className="mt-3 lg:mt-auto block text-center text-sm font-semibold py-2.5 rounded-xl" style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}>
          Zum Vertragshändler & Partnern →
        </Link>
      </section>

      {/* Mitglied werden – hervorgehobener Call-to-Action */}
      <a
        href={membershipUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group glass-card lg:h-full p-6 flex flex-col justify-center gap-4 relative overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-hex) 0%, color-mix(in srgb, var(--accent-hex) 80%, #000) 100%)",
          color: "var(--accent-foreground)",
        }}
      >
        {/* dezentes Hintergrund-Icon */}
        <svg
          className="absolute -right-6 -bottom-6 opacity-10"
          width="150" height="150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>

        <div className="relative flex items-center gap-3">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Mitglied werden</h2>
        </div>

        <p className="relative text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>
          Werde Teil der DOC-Bern-Community: gemeinsame Ausfahrten, Events und
          exklusive Vorteile bei unseren Partnern. Die Anmeldung läuft bequem
          über das offizielle Ducati-Portal.
        </p>

        <span
          className="relative inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-xl text-sm font-bold transition-transform group-hover:translate-x-0.5"
          style={{ background: "#ffffff", color: "var(--accent-hex)" }}
        >
          Jetzt beitreten
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M5 12h13" />
          </svg>
        </span>
      </a>
      </div>
    </div>
  );
}
