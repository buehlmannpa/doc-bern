"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsItem } from "@/lib/types";

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

const PAGE_SIZE = 5;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" });
}

export default function NewsClient({ news }: { news: NewsItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight px-1">News</h1>

      {ordered.length === 0 && (
        <p className="glass-card p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Noch keine Beiträge vorhanden.
        </p>
      )}

      <div className="space-y-3">
        {shown.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <article key={item.id} className="glass-card overflow-hidden" style={{ opacity: item.isArchived ? 0.72 : 1 }}>
              {item.imageUrl && !isExpanded && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.title} className="w-full h-40 object-cover" loading="lazy" />
              )}
              <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="w-full text-left p-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="tag text-[10px]" style={{ background: categoryColors[item.category], color: categoryTextColors[item.category] }}>
                    {categoryLabels[item.category]}
                  </span>
                  {item.isArchived && (
                    <span className="tag text-[10px]" style={{ background: "rgba(255,59,48,0.12)", color: "#ff3b30" }}>
                      Ungültig
                    </span>
                  )}
                  <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{formatDate(item.publishedAt)}</span>
                </div>
                <h3 className="font-bold text-base mb-1">{item.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.summary}</p>
                <div className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: "var(--accent-hex)" }}>
                  {isExpanded ? "Weniger anzeigen" : "Weiterlesen"}
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-white/30">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.title} className="w-full rounded-2xl mt-4 mb-3" loading="lazy" />
                  )}
                  <div className="text-sm leading-relaxed pt-4 whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                    {item.content}
                  </div>
                  {item.links.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {item.links.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="block text-center text-sm font-semibold py-2.5 rounded-xl"
                          style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}>
                          {link.label || link.url} →
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="py-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Weitere Beiträge werden geladen…
        </div>
      )}
    </div>
  );
}
