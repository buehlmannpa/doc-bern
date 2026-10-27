"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NewsDetail, NewsListItem } from "@/lib/types";
import TileGrid from "@/components/TileGrid";
import TileImage from "@/components/TileImage";
import NewsBlocks from "@/components/NewsBlocks";
import { isSafeHref } from "@/lib/blocks";

const categoryLabels: Record<string, string> = {
  news: "Neuigkeit", report: "Bericht", interview: "Interview", update: "Update",
};
const categoryColors: Record<string, string> = {
  news: "rgba(var(--accent), 0.12)", report: "rgba(52, 199, 89, 0.12)",
  interview: "rgba(0, 122, 255, 0.12)", update: "rgba(255, 149, 0, 0.12)",
};
const categoryTextColors: Record<string, string> = {
  news: "var(--accent-text)", report: "#34c759", interview: "#007aff", update: "#ff9500",
};

const PAGE_SIZE = 5;
const DETAIL_TTL_MS = 2 * 60 * 1000; // so lange wird ein geladener Beitrag im Browser gemerkt

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" });
}

/* ───────────── Inhalt erst beim Öffnen laden ───────────── */

const detailCache = new Map<string, { at: number; detail: NewsDetail }>();
const inflight = new Map<string, Promise<NewsDetail>>();

function cachedDetail(id: string): NewsDetail | null {
  const hit = detailCache.get(id);
  if (!hit) return null;
  if (Date.now() - hit.at > DETAIL_TTL_MS) { detailCache.delete(id); return null; }
  return hit.detail;
}

function loadDetail(id: string): Promise<NewsDetail> {
  const cached = cachedDetail(id);
  if (cached) return Promise.resolve(cached);
  const running = inflight.get(id);
  if (running) return running;
  const p = fetch(`/api/news?id=${encodeURIComponent(id)}`)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Dieser Beitrag ist nicht mehr verfügbar." : "Der Beitrag konnte nicht geladen werden.");
      }
      const data = (await res.json()) as { detail: NewsDetail };
      detailCache.set(id, { at: Date.now(), detail: data.detail });
      return data.detail;
    })
    .finally(() => { inflight.delete(id); });
  inflight.set(id, p);
  return p;
}

type DetailState = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; detail: NewsDetail };

function Skeleton() {
  return (
    <div className="pt-4 space-y-2.5 animate-pulse" aria-busy="true" aria-label="Beitrag wird geladen">
      {[100, 92, 96, 60].map((w, i) => (
        <div key={i} className="h-3.5 rounded-md" style={{ width: `${w}%`, background: "var(--field-bg)" }} />
      ))}
    </div>
  );
}

// Alte Beiträge (ohne Bausteine): Text + Link-Buttons wie bisher
function LegacyContent({ detail }: { detail: NewsDetail }) {
  return (
    <>
      {detail.content && (
        <div className="text-sm leading-relaxed pt-4 whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
          {detail.content}
        </div>
      )}
      {detail.links.filter((l) => isSafeHref(l.url)).length > 0 && (
        <div className="mt-4 space-y-2">
          {detail.links.filter((l) => isSafeHref(l.url)).map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              className="block text-center text-sm font-semibold py-2.5 rounded-xl"
              style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}>
              {link.label || link.url} →
            </a>
          ))}
        </div>
      )}
    </>
  );
}

export default function NewsClient({ news }: { news: NewsListItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Aktuelle Beiträge zuerst (nach Sortierung), danach ältere/archivierte Beiträge
  const ordered = useMemo(() => {
    const active = news.filter((n) => !n.isArchived);
    const archived = news.filter((n) => n.isArchived);
    return [...active, ...archived];
  }, [news]);

  const shown = ordered.slice(0, visible);
  const hasMore = visible < ordered.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + PAGE_SIZE, ordered.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, ordered.length]);

  const fetchDetail = useCallback((id: string) => {
    const hit = cachedDetail(id);
    if (hit) {
      setDetails((d) => ({ ...d, [id]: { status: "ok", detail: hit } }));
      return;
    }
    setDetails((d) => ({ ...d, [id]: { status: "loading" } }));
    loadDetail(id)
      .then((detail) => setDetails((d) => ({ ...d, [id]: { status: "ok", detail } })))
      .catch((e: Error) => setDetails((d) => ({ ...d, [id]: { status: "error", message: e.message || "Der Beitrag konnte nicht geladen werden." } })));
  }, []);

  function toggle(item: NewsListItem) {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    fetchDetail(item.id);
  }

  // Schon beim Berühren/Darüberfahren vorladen, damit das Öffnen sich sofort anfühlt
  function prefetch(item: NewsListItem) {
    if (item.hasContent && !cachedDetail(item.id)) loadDetail(item.id).catch(() => {});
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight px-1">News</h1>

      {ordered.length === 0 && (
        <p className="glass-card p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Noch keine Beiträge vorhanden.
        </p>
      )}

      <TileGrid
        items={shown.map((item) => {
          const isExpanded = expandedId === item.id && item.hasContent;
          const state = details[item.id];

          const headInner = (
            <>
              <div className="flex items-center gap-2 mb-2 h-6 overflow-hidden whitespace-nowrap">
                <span className="tag text-[10px] flex-shrink-0" style={{ background: categoryColors[item.category], color: categoryTextColors[item.category] }}>
                  {categoryLabels[item.category]}
                </span>
                {item.isArchived && (
                  <span className="tag text-[10px] flex-shrink-0" style={{ background: "rgba(255,59,48,0.12)", color: "#ff3b30" }}>
                    Ungültig
                  </span>
                )}
                <span className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>{formatDate(item.publishedAt)}</span>
              </div>
              <h3 className={`font-bold text-base leading-6 mb-1 lg:min-h-12 ${isExpanded ? "" : "line-clamp-2"}`}>{item.title}</h3>
              <p className={`text-sm leading-5 lg:min-h-[3.75rem] ${isExpanded ? "" : "line-clamp-3"}`} style={{ color: "var(--text-secondary)" }}>{item.summary}</p>
              {item.hasContent ? (
                <div className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: "var(--accent-text)" }}>
                  {isExpanded ? "Weniger anzeigen" : "Weiterlesen"}
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              ) : (
                // Reine Kurzmeldung: kein "Weiterlesen". Platzhalter hält die Kachelhöhe gleich.
                <div className="mt-2 h-4" aria-hidden="true" />
              )}
            </>
          );

          return (
            <article key={item.id} className="glass-card overflow-hidden" style={{ opacity: item.isArchived ? 0.72 : 1 }}>
              {/* Kopfbereich (Bild + Titel + Vorschau): bleibt beim Aufklappen unverändert */}
              <TileImage src={item.imageUrl} alt={item.title} />
              {item.hasContent ? (
                <button
                  onClick={() => toggle(item)}
                  onPointerEnter={() => prefetch(item)}
                  onTouchStart={() => prefetch(item)}
                  onFocus={() => prefetch(item)}
                  aria-expanded={isExpanded}
                  className="w-full text-left p-5"
                >
                  {headInner}
                </button>
              ) : (
                <div className="w-full text-left p-5">{headInner}</div>
              )}

              {/* Nur dieser Bereich kommt beim Aufklappen dazu (wird erst jetzt geladen) */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[color:var(--hairline)]">
                  {(!state || state.status === "loading") && <Skeleton />}
                  {state?.status === "error" && (
                    <div className="pt-4 text-sm" role="alert">
                      <p style={{ color: "var(--text-secondary)" }}>{state.message}</p>
                      <button
                        type="button"
                        onClick={() => fetchDetail(item.id)}
                        className="mt-2 text-sm font-semibold px-4 py-2 rounded-xl"
                        style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}
                      >
                        Erneut versuchen
                      </button>
                    </div>
                  )}
                  {state?.status === "ok" && (
                    state.detail.blocks && state.detail.blocks.length > 0 ? (
                      <div className="pt-4"><NewsBlocks blocks={state.detail.blocks} /></div>
                    ) : (
                      <LegacyContent detail={state.detail} />
                    )
                  )}
                </div>
              )}
            </article>
          );
        })}
      />

      {hasMore && (
        <div ref={sentinelRef} className="py-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Weitere Beiträge werden geladen…
        </div>
      )}
    </div>
  );
}
