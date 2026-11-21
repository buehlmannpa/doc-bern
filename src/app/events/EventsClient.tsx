"use client";

import { useCallback, useState } from "react";
import type { EventDetail, EventListItem } from "@/lib/types";
import AddToCalendar from "@/components/AddToCalendar";
import NewsBlocks from "@/components/NewsBlocks";
import { isSafeHref } from "@/lib/blocks";
import {
  dayNumber,
  formatRange,
  groupByMonth,
  isMultiDay,
  isOver,
  monthShort,
  monthStartOf,
  weekdayShort,
  type MonthGroup,
} from "@/lib/event-dates";

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

/* ───────────── Karte ───────────── */

// Tages-Zeichen: Wochentag und Tag, bei mehrtägigen Events der Bereich ("Sa–So", "16–17")
function DayChip({ event }: { event: EventListItem }) {
  const multi = isMultiDay(event);
  const end = event.endDate as string;
  const crossMonth = multi && event.date.slice(0, 7) !== end.slice(0, 7);
  return (
    <div
      className="flex-shrink-0 min-w-14 px-2 py-1.5 rounded-2xl flex flex-col items-center justify-center text-center leading-tight self-start"
      style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}
      aria-hidden="true"
    >
      <span className="text-[10px] font-semibold uppercase">{multi ? `${weekdayShort(event.date)}–${weekdayShort(end)}` : weekdayShort(event.date)}</span>
      <span className="text-lg font-bold">{multi ? `${dayNumber(event.date)}–${dayNumber(end)}` : dayNumber(event.date)}</span>
      {crossMonth && <span className="text-[9px] font-semibold uppercase">{monthShort(event.date)}–{monthShort(end)}</span>}
    </div>
  );
}

// Bildfläche: oben (Smartphone) bzw. links (breite Ansicht). Events ohne Bild haben keine Bildfläche (spart Platz).
function Thumb({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative overflow-hidden w-full h-36 sm:w-48 lg:w-60 sm:h-auto sm:min-h-[8.5rem] flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
    </div>
  );
}

function EventCard({
  event, expanded, onToggle, state, onRetry, today,
}: {
  event: EventListItem;
  expanded: boolean;
  onToggle: () => void;
  state?: DetailState;
  onRetry: () => void;
  today: string;
}) {
  const over = isOver(event, today);
  const prefetch = () => { if (!cachedDetail(event.id)) loadDetail(event.id).catch(() => {}); };
  return (
    <article className="glass-card overflow-hidden" style={{ opacity: over ? 0.72 : 1 }}>
      {/* Kopfbereich (Bild, Tages-Zeichen, Titel, Infos): bleibt beim Aufklappen unverändert */}
      <button
        onClick={onToggle}
        onPointerEnter={prefetch}
        onTouchStart={prefetch}
        onFocus={prefetch}
        aria-expanded={expanded}
        className="w-full text-left flex flex-col sm:flex-row sm:items-stretch"
      >
        {event.imageUrl && <Thumb src={event.imageUrl} alt={event.title} />}
        <div className="flex-1 min-w-0 flex gap-4 p-4 sm:p-5">
          <DayChip event={event} />
          <div className="min-w-0 flex-1">
            {(over || event.badge) && (
              <div className="flex items-center gap-2 mb-1.5 h-5 overflow-hidden whitespace-nowrap">
                {over ? (
                  <span className="tag text-[10px] flex-shrink-0" style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}>
                    Vergangenes Event
                  </span>
                ) : (
                  <span className="tag text-[10px] flex-shrink-0" style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}>
                    {event.badge}
                  </span>
                )}
              </div>
            )}
            <h3 className={`font-bold text-base leading-6 mb-1 ${expanded ? "" : "line-clamp-2"}`}>{event.title}</h3>
            <div className="space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              {isMultiDay(event) && (
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatRange(event)}
                </div>
              )}
              {event.time && (
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {event.time} Uhr
                </div>
              )}
              {event.location && (
                <div className="flex items-start gap-1.5">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 mt-0.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className={expanded ? "" : "line-clamp-1"}>{event.location}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: "var(--accent-text)" }}>
              {expanded ? "Weniger anzeigen" : "Weiterlesen"}
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
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

/* ───────────── Zeitstrahl ───────────── */

// Linie links, pro Monat ein Punkt mit Monatsname, rechts davon (am Smartphone darunter) die Events untereinander.
function Timeline({
  groups, renderEvent, muted,
}: {
  groups: MonthGroup<EventListItem>[];
  renderEvent: (e: EventListItem) => React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="relative" data-testid="timeline">
      <div aria-hidden="true" className="absolute top-2 bottom-4 left-[0.9rem] w-0.5 rounded-full" style={{ background: "var(--hairline)" }} />
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`m-${g.key}`} data-month={g.key} className="relative pl-10 lg:pl-[12rem] pb-7 last:pb-2">
          <span
            aria-hidden="true"
            className="absolute left-[0.4rem] top-0.5 w-[1.1rem] h-[1.1rem] rounded-full"
            style={{
              background: muted ? "var(--field-bg)" : "rgba(var(--accent), 0.25)",
              border: `2px solid ${muted ? "var(--text-secondary)" : "var(--accent-hex)"}`,
            }}
          />
          <h2
            id={`m-${g.key}`}
            className="text-lg font-bold tracking-tight mb-3 leading-snug lg:absolute lg:left-10 lg:top-0 lg:mb-0 lg:w-[9.5rem]"
          >
            {g.label}
          </h2>
          <div className="space-y-3">{g.events.map((e) => <div key={e.id}>{renderEvent(e)}</div>)}</div>
        </section>
      ))}
    </div>
  );
}

/* ───────────── Vergangene Jahre (werden erst auf Klick geladen) ───────────── */

type YearState = { status: "loading" } | { status: "error" } | { status: "ok"; events: EventListItem[] };

function PastYears({
  years, today, renderEvent,
}: {
  years: { year: number; count: number }[];
  today: string;
  renderEvent: (e: EventListItem) => React.ReactNode;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [data, setData] = useState<Record<number, YearState>>({});

  const load = useCallback((year: number) => {
    setData((d) => ({ ...d, [year]: { status: "loading" } }));
    fetch(`/api/events/past?year=${year}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { events: EventListItem[] };
        setData((d) => ({ ...d, [year]: { status: "ok", events: json.events } }));
      })
      .catch(() => setData((d) => ({ ...d, [year]: { status: "error" } })));
  }, []);

  function toggle(year: number) {
    const next = !open[year];
    setOpen((o) => ({ ...o, [year]: next }));
    if (next && !data[year]) load(year);
  }

  if (years.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="past-events">
      <h2 id="past-events" className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
        Vergangene Events
      </h2>
      <div className="space-y-2">
        {years.map(({ year, count }) => {
          const isOpen = Boolean(open[year]);
          const state = data[year];
          return (
            <div key={year} className="glass-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(year)}
                aria-expanded={isOpen}
                aria-controls={`past-${year}`}
                className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left"
              >
                <span className="font-bold text-base">
                  {year}
                </span>
                <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {count} {count === 1 ? "Event" : "Events"}
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              {isOpen && (
                <div id={`past-${year}`} className="px-4 pb-4 pt-2 border-t border-[color:var(--hairline)]">
                  {(!state || state.status === "loading") && <Skeleton />}
                  {state?.status === "error" && (
                    <div className="py-3 text-sm" role="alert">
                      <p style={{ color: "var(--text-secondary)" }}>Die Events konnten nicht geladen werden.</p>
                      <button
                        type="button"
                        onClick={() => load(year)}
                        className="mt-2 text-sm font-semibold px-4 py-2 rounded-xl"
                        style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}
                      >
                        Erneut versuchen
                      </button>
                    </div>
                  )}
                  {state?.status === "ok" && (
                    state.events.length === 0
                      ? <p className="py-3 text-sm" style={{ color: "var(--text-secondary)" }}>Keine Events.</p>
                      : <div className="pt-3"><Timeline groups={groupByMonth(state.events, { direction: "desc" })} renderEvent={renderEvent} muted /></div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────── Seite ───────────── */

export default function EventsClient({
  events, pastYears, today,
}: {
  events: EventListItem[];
  pastYears: { year: number; count: number }[];
  today: string;
}) {
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

  const renderEvent = (event: EventListItem) => (
    <EventCard
      event={event}
      expanded={expandedId === event.id}
      onToggle={() => toggle(event.id)}
      state={details[event.id]}
      onRetry={() => fetchDetail(event.id)}
      today={today}
    />
  );

  // Aktueller Monat zuoberst, danach die kommenden Monate. Leere Monate entstehen nicht.
  const groups = groupByMonth(events, { floorMonth: monthStartOf(today), direction: "asc" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight px-1">Events</h1>

      {groups.length > 0 ? (
        <Timeline groups={groups} renderEvent={renderEvent} />
      ) : (
        <p className="glass-card p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Zurzeit sind keine Events geplant. Schau bald wieder vorbei!
        </p>
      )}

      <PastYears years={pastYears} today={today} renderEvent={renderEvent} />
    </div>
  );
}
