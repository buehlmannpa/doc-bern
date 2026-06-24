import { events } from "@/data/content";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function EventsPage() {
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const upcoming = sorted.filter((e) => new Date(e.date) >= new Date());
  const past = sorted.filter((e) => new Date(e.date) < new Date());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight px-1">Events</h1>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
            Kommende Events
          </h2>
          <div className="space-y-3">
            {upcoming.map((event) => (
              <article key={event.id} className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
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
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(event.date)}
                  </span>
                </div>
                <h3 className="font-bold text-base mb-1">{event.title}</h3>
                <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {event.time} Uhr
                  <span className="mx-1">·</span>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.location}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {event.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
            Vergangene Events
          </h2>
          <div className="space-y-3">
            {past.map((event) => (
              <article key={event.id} className="glass-card p-5 opacity-60">
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {formatDate(event.date)}
                </span>
                <h3 className="font-semibold text-sm mt-1">{event.title}</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {event.location}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
