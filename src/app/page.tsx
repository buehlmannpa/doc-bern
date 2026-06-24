import Link from "next/link";
import Image from "next/image";
import { events, newsletters, discounts, hostettlerInfo } from "@/data/content";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "numeric",
    month: "short",
  });
}

const categoryLabels: Record<string, string> = {
  news: "Neuigkeit",
  report: "Bericht",
  interview: "Interview",
  update: "Update",
};

const categoryColors: Record<string, string> = {
  news: "rgba(var(--accent), 0.12)",
  report: "rgba(52, 199, 89, 0.12)",
  interview: "rgba(0, 122, 255, 0.12)",
  update: "rgba(255, 149, 0, 0.12)",
};

const categoryTextColors: Record<string, string> = {
  news: "rgb(var(--accent))",
  report: "#34c759",
  interview: "#007aff",
  update: "#ff9500",
};

export default function Home() {
  const nextEvents = events
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const latestNews = newsletters.slice(0, 2);
  const topDiscounts = discounts.slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="glass-card p-6 text-center">
        <Image
          src="/logo.svg"
          alt="DOC Bern"
          width={100}
          height={100}
          className="mx-auto mb-3 rounded-2xl"
          priority
        />
        <h1 className="text-xl font-bold tracking-tight mb-1">Ducati Owners Club Bern</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Willkommen bei der DOC Bern Community
        </p>
      </section>

      {/* Nächste Events */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-bold tracking-tight">Nächste Events</h2>
          <Link href="/events" className="text-sm font-semibold" style={{ color: "var(--accent-hex)" }}>
            Alle →
          </Link>
        </div>
        <div className="space-y-3">
          {nextEvents.map((event) => (
            <div key={event.id} className="glass-card p-4 flex gap-4 items-start">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-2xl flex flex-col items-center justify-center"
                style={{ background: "rgba(var(--accent), 0.1)" }}
              >
                <span className="text-xs font-bold" style={{ color: "var(--accent-hex)" }}>
                  {formatDate(event.date).split(" ")[0]}
                </span>
                <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--accent-hex)" }}>
                  {formatDate(event.date).split(" ")[1]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{event.title}</h3>
                  {event.badge && (
                    <span
                      className="tag text-[10px]"
                      style={{
                        background: "rgba(var(--accent), 0.1)",
                        color: "var(--accent-hex)",
                      }}
                    >
                      {event.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {event.time} · {event.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Neueste News */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-bold tracking-tight">Neueste News</h2>
          <Link href="/newsletter" className="text-sm font-semibold" style={{ color: "var(--accent-hex)" }}>
            Alle →
          </Link>
        </div>
        <div className="space-y-3">
          {latestNews.map((item) => (
            <Link key={item.id} href={`/newsletter#${item.id}`} className="glass-card p-4 block">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="tag text-[10px]"
                  style={{
                    background: categoryColors[item.category],
                    color: categoryTextColors[item.category],
                  }}
                >
                  {categoryLabels[item.category]}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  {formatDate(item.date)}
                </span>
              </div>
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                {item.summary}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Rabatte */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-bold tracking-tight">Aktuelle Rabatte</h2>
          <Link href="/rabatte" className="text-sm font-semibold" style={{ color: "var(--accent-hex)" }}>
            Alle →
          </Link>
        </div>
        <div className="space-y-3">
          {topDiscounts.map((d) => (
            <div key={d.id} className="glass-card p-4 flex items-center gap-4">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base"
                style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
              >
                {d.percentage}%
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{d.title}</h3>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {d.partner}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* hostettler Quick Info */}
      <section className="glass-card p-5">
        <h2 className="font-bold text-base mb-3">hostettler-moto Bern</h2>
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
        <Link
          href="/partners"
          className="mt-3 block text-center text-sm font-semibold py-2.5 rounded-xl"
          style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
        >
          Alle Partner & Details →
        </Link>
      </section>
    </div>
  );
}
