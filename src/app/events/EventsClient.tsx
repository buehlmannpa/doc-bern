"use client";

import { useState } from "react";
import type { EventItem } from "@/lib/types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function EventsClient({ events }: { events: EventItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sorted.filter((e) => new Date(e.date) >= today);
  const past = sorted.filter((e) => new Date(e.date) < today).reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight px-1">Events</h1>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
            Anstehende Events
          </h2>
          <div className="space-y-3">
            {upcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                expanded={expandedId === event.id}
                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
              />
            ))}
          </div>
        </section>
      )}

      {upcoming.length === 0 && (
        <p className="glass-card p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Zurzeit sind keine Events geplant. Schau bald wieder vorbei!
        </p>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
            Vergangene Events
          </h2>
          <div className="space-y-3">
            {past.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                expanded={expandedId === event.id}
                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                isPast
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EventCard({
  event,
  expanded,
  onToggle,
  isPast,
}: {
  event: EventItem;
  expanded: boolean;
  onToggle: () => void;
  isPast?: boolean;
}) {
  return (
    <article className="glass-card overflow-hidden" style={{ opacity: isPast ? 0.7 : 1 }}>
      {event.imageUrl && !expanded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.imageUrl} alt={event.title} className="w-full h-40 object-cover" loading="lazy" />
      )}
      <button onClick={onToggle} className="w-full text-left p-5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {isPast ? (
            <span className="tag text-[10px]" style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}>
              Vergangenes Event
            </span>
          ) : (
            event.badge && (
              <span className="tag text-[10px]" style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}>
                {event.badge}
              </span>
            )
          )}
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatDate(event.date)}</span>
        </div>
        <h3 className="font-bold text-base mb-1">{event.title}</h3>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
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
        {!expanded && (
          <div className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: "var(--accent-hex)" }}>
            Details anzeigen
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/30">
          {event.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt={event.title} className="w-full rounded-2xl mt-4 mb-3" loading="lazy" />
          )}
          <p className="text-sm leading-relaxed pt-4 whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
            {event.description}
          </p>

          {event.links.length > 0 && (
            <div className="mt-4 space-y-2">
              {event.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm font-semibold py-2.5 rounded-xl"
                  style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
                >
                  {link.label || link.url} →
                </a>
              ))}
            </div>
          )}

          <button
            onClick={onToggle}
            className="mt-4 w-full flex items-center justify-center gap-1 text-sm font-semibold py-2.5 rounded-xl"
            style={{ background: "rgba(0,0,0,0.04)", color: "var(--text-secondary)" }}
          >
            Schliessen & zurück zur Liste
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}
    </article>
  );
}
