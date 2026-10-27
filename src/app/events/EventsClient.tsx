"use client";

import { useCallback, useState } from "react";
import type { EventDetail, EventListItem } from "@/lib/types";
import NewsBlocks from "@/components/NewsBlocks";
import { isSafeHref } from "@/lib/blocks";
import AddToCalendar from "@/components/AddToCalendar";
import TileGrid from "@/components/TileGrid";
import TileImage from "@/components/TileImage";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ───────────── Inhalt erst beim Aufklappen laden ───────────── */

const DETAIL_TTL_MS = 2 * 60 * 1000; // so lange wird ein geladener Inhalt im Browser gemerkt
const detailCache = new Map<string, { at: number; detail: EventDetail }>();
const inflight = new Map<string, Promise<EventDetail>>();

function cachedDetail(id: string): EventDetail | null {
  const hit = detailCache.get(id);
  if (!hit) return null;
  if (Date.now() - hit.at > DETAIL_TTL_MS) { detailCache.delete(id); return null; }
  return hit.detail;
}

function loadDetail(id: string): Promise<EventDetail> {
  const cached = cachedDetail(id);
  if (cached) return Promise.resolve(cached);
  const running = inflight.get(id);
  if (running) return running;
  const p = fetch(`/api/events?id=${encodeURIComponent(id)}`)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Dieses Event ist nicht mehr verfügbar." : "Das Event konnte nicht geladen werden.");
      }
      const data = (await res.json()) as { detail: EventDetail };
      detailCache.set(id, { at: Date.now(), detail: data.detail });
      return data.detail;
    })
    .finally(() => { inflight.delete(id); });
  inflight.set(id, p);
  return p;
}

type DetailState = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; detail: EventDetail };

function Skeleton() {
  return (
    <div className="pt-4 space-y-2.5 animate-pulse" aria-busy="true" aria-label="Event wird geladen">
      {[100, 92, 96, 60].map((w, i) => (
        <div key={i} className="h-3.5 rounded-md" style={{ width: `${w}%`, background: "var(--field-bg)" }} />
      ))}
    </div>
  );
}

// Alte Events (ohne Bausteine): Link-Buttons wie bisher (nur sichere Links)
function LegacyLinks({ detail }: { detail: EventDetail }) {
  const links = detail.links.filter((l) => isSafeHref(l.url));
  if (links.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {links.map((link, i) => (
        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
          className="block text-center text-sm font-semibold py-2.5 rounded-xl"
          style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}>
          {link.label || link.url} →
        </a>
      ))}
    </div>
  );
}

export default function EventsClient({ events }: { events: EventListItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});

  const fetchDetail = useCallback((id: string) => {
    const hit = cachedDetail(id);
    if (hit) {
      setDetails((d) => ({ ...d, [id]: { status: "ok", detail: hit } }));
      return;
    }
    setDetails((d) => ({ ...d, [id]: { status: "loading" } }));
    loadDetail(id)
      .then((detail) => setDetails((d) => ({ ...d, [id]: { status: "ok", detail } })))
      .catch((e: Error) => setDetails((d) => ({ ...d, [id]: { status: "error", message: e.message || "Das Event konnte nicht geladen werden." } })));
  }, []);

  const toggle = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    fetchDetail(id);
  };

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
          <TileGrid
            items={upcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                expanded={expandedId === event.id}
                state={details[event.id]}
                onRetry={() => fetchDetail(event.id)}
                onToggle={() => toggle(event.id)}
              />
            ))}
          />
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
          <TileGrid
            items={past.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                expanded={expandedId === event.id}
                state={details[event.id]}
                onRetry={() => fetchDetail(event.id)}
                onToggle={() => toggle(event.id)}
                isPast
              />
            ))}
          />
        </section>
      )}
    </div>
  );
}

function EventCard({
  event,
  expanded,
  onToggle,
  state,
  onRetry,
  isPast,
}: {
  event: EventListItem;
  expanded: boolean;
  onToggle: () => void;
  state?: DetailState;
  onRetry: () => void;
  isPast?: boolean;
}) {
  return (
    <article className="glass-card overflow-hidden" style={{ opacity: isPast ? 0.7 : 1 }}>
      {/* Kopfbereich (Bild + Titel + Infos): bleibt beim Aufklappen unverändert */}
      <TileImage src={event.imageUrl} alt={event.title} />
      <button
        onClick={onToggle}
        onPointerEnter={() => { if (!cachedDetail(event.id)) loadDetail(event.id).catch(() => {}); }}
        onTouchStart={() => { if (!cachedDetail(event.id)) loadDetail(event.id).catch(() => {}); }}
        onFocus={() => { if (!cachedDetail(event.id)) loadDetail(event.id).catch(() => {}); }}
        aria-expanded={expanded}
        className="w-full text-left p-5"
      >
        <div className="flex items-center gap-2 mb-2 h-6 overflow-hidden whitespace-nowrap">
          {isPast ? (
            <span className="tag text-[10px] flex-shrink-0" style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}>
              Vergangenes Event
            </span>
          ) : (
            event.badge && (
              <span className="tag text-[10px] flex-shrink-0" style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}>
                {event.badge}
              </span>
            )
          )}
          <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{formatDate(event.date)}</span>
        </div>
        <h3 className={`font-bold text-base leading-6 mb-1 lg:min-h-12 ${expanded ? "" : "line-clamp-2"}`}>{event.title}</h3>
        <div className="space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          <div className="flex items-center gap-1.5 h-4">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {event.time} Uhr
          </div>
          <div className="flex items-start gap-1.5 lg:min-h-8">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={expanded ? "" : "line-clamp-2"}>{event.location}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: "var(--accent-text)" }}>
          {expanded ? "Weniger anzeigen" : "Weiterlesen"}
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Nur dieser Bereich kommt beim Aufklappen dazu (wird erst jetzt geladen) */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-[color:var(--hairline)]">
          {(!state || state.status === "loading") && <Skeleton />}
          {state?.status === "error" && (
            <div className="pt-4 text-sm" role="alert">
              <p style={{ color: "var(--text-secondary)" }}>{state.message}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 text-sm font-semibold px-4 py-2 rounded-xl"
                style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}
              >
                Erneut versuchen
              </button>
            </div>
          )}
          {state?.status === "ok" && (
            state.detail.blocks && state.detail.blocks.length > 0 ? (
              <>
                <div className="pt-4"><NewsBlocks blocks={state.detail.blocks} /></div>
                <AddToCalendar event={{ ...event, description: state.detail.description }} />
              </>
            ) : (
              <>
                {state.detail.description && (
                  <p className="text-sm leading-relaxed pt-4 whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                    {state.detail.description}
                  </p>
                )}
                <AddToCalendar event={{ ...event, description: state.detail.description }} />
                <LegacyLinks detail={state.detail} />
              </>
            )
          )}
        </div>
      )}
    </article>
  );
}
