import Link from "next/link";
import Image from "next/image";
import { getEvents, getNews } from "@/lib/db";
import { board, boardIntro, hostettlerInfo } from "@/data/content";

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
  const [allEvents, allNews] = await Promise.all([getEvents(), getNews()]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextEvents = allEvents
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const latestNews = allNews.filter((n) => !n.isArchived).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="glass-card px-6 pt-5 pb-6 text-center">
        <Image src="/logo.svg" alt="DOC Bern" width={96} height={96} className="mx-auto mb-3 rounded-2xl" priority />
        <h1 className="text-xl font-bold tracking-tight mb-1">Ducati Official Club Bern</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Willkommen auf der Seite vom DOC-Bern.
        </p>
      </section>

      {/* Anstehende Events */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-bold tracking-tight">Anstehende Events</h2>
          <Link href="/events" className="text-sm font-semibold" style={{ color: "var(--accent-hex)" }}>Alle →</Link>
        </div>
        <div className="space-y-3">
          {nextEvents.length === 0 && (
            <p className="glass-card p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              Zurzeit sind keine Events geplant.
            </p>
          )}
          {nextEvents.map((event) => (
            <Link key={event.id} href="/events" className="glass-card p-4 flex gap-4 items-start">
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
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-bold tracking-tight">Aktuelle News</h2>
          <Link href="/newsletter" className="text-sm font-semibold" style={{ color: "var(--accent-hex)" }}>Alle →</Link>
        </div>
        <div className="space-y-3">
          {latestNews.length === 0 && (
            <p className="glass-card p-4 text-sm" style={{ color: "var(--text-secondary)" }}>Noch keine News.</p>
          )}
          {latestNews.map((item) => (
            <Link key={item.id} href="/newsletter" className="glass-card block overflow-hidden">
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.title} className="w-full h-32 object-cover" loading="lazy" />
              )}
              <div className="p-4">
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

      {/* Vorstand stellt sich vor */}
      <section>
        <h2 className="text-lg font-bold tracking-tight mb-1 px-1">Vorstand stellt sich vor</h2>
        <p className="text-sm mb-3 px-1" style={{ color: "var(--text-secondary)" }}>{boardIntro}</p>
        <div className="grid grid-cols-2 gap-3">
          {board.map((m, i) => (
            <div key={i} className="glass-card p-4 flex flex-col items-center text-center">
              {m.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt={m.name} className="w-16 h-16 rounded-full object-cover mb-2" />
              ) : (
                <div className="w-16 h-16 rounded-full mb-2 flex items-center justify-center" style={{ background: "rgba(var(--accent), 0.1)" }}>
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--accent-hex)" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <span className="text-xs font-semibold" style={{ color: "var(--accent-hex)" }}>{m.role}</span>
              <span className="text-sm font-semibold">{m.name}</span>
              {m.description && <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>{m.description}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* hostettler Quick Info */}
      <section className="glass-card p-5">
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
        <Link href="/partners" className="mt-3 block text-center text-sm font-semibold py-2.5 rounded-xl" style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}>
          Zum Vertragshändler & Partnern →
        </Link>
      </section>
    </div>
  );
}
