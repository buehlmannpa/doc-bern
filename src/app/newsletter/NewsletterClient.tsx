"use client";

import { useState } from "react";
import type { SanityNewsletter } from "../../../sanity/lib/queries";
import type { NewsletterEntry } from "@/data/content";
import { urlFor } from "../../../sanity/lib/image";
import PortableTextRenderer from "@/components/PortableTextRenderer";

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

type Tab = "aktuelle" | "archiv";
type Category = "all" | "news" | "report" | "interview" | "update";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString("de-CH", { month: "long", year: "numeric" });
}

function groupByMonth<T extends { publishedAt?: string; date?: string }>(items: T[]) {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const dateStr = item.publishedAt || item.date || "";
    const key = getMonthKey(dateStr);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

type Props = {
  articles: SanityNewsletter[];
  fallbackArticles: NewsletterEntry[] | null;
};

export default function NewsletterClient({ articles, fallbackArticles }: Props) {
  const [tab, setTab] = useState<Tab>("aktuelle");
  const [filter, setFilter] = useState<Category>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const usingSanity = articles.length > 0;
  const filters: { key: Category; label: string }[] = [
    { key: "all", label: "Alle" },
    { key: "news", label: "News" },
    { key: "report", label: "Berichte" },
    { key: "interview", label: "Interviews" },
    { key: "update", label: "Updates" },
  ];

  // Sanity mode
  if (usingSanity) {
    const active = articles.filter((a) => !a.isArchived);
    const archived = articles.filter((a) => a.isArchived);
    const currentList = tab === "aktuelle" ? active : archived;
    const filtered = filter === "all" ? currentList : currentList.filter((a) => a.category === filter);
    const archivedGrouped = groupByMonth(archived.filter((a) => filter === "all" || a.category === filter));

    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight px-1">Newsletter</h1>

        {/* Tab switch */}
        <div className="glass-card p-1 flex gap-1">
          {(["aktuelle", "archiv"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setExpandedId(null); }}
              className="flex-1 py-2 rounded-2xl text-sm font-semibold transition-all"
              style={{
                background: tab === t ? "var(--accent-hex)" : "transparent",
                color: tab === t ? "#fff" : "var(--text-secondary)",
              }}
            >
              {t === "aktuelle" ? "Aktuell" : "Archiv"}
              {t === "archiv" && archived.length > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({archived.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 px-1 -mx-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="tag whitespace-nowrap transition-all"
              style={{
                background: filter === f.key ? "rgba(var(--accent), 0.15)" : "rgba(0,0,0,0.04)",
                color: filter === f.key ? "var(--accent-hex)" : "var(--text-secondary)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Current tab */}
        {tab === "aktuelle" ? (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="glass-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                Keine aktuellen Beiträge in dieser Kategorie.
              </div>
            )}
            {filtered.map((item) => (
              <SanityArticleCard
                key={item._id}
                item={item}
                isExpanded={expandedId === item._id}
                onToggle={() => setExpandedId(expandedId === item._id ? null : item._id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {archivedGrouped.length === 0 && (
              <div className="glass-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                Keine archivierten Beiträge vorhanden.
              </div>
            )}
            {archivedGrouped.map(([monthKey, items]) => (
              <div key={monthKey}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: "var(--text-secondary)" }}>
                  {getMonthLabel(monthKey)}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <SanityArticleCard
                      key={item._id}
                      item={item}
                      isExpanded={expandedId === item._id}
                      onToggle={() => setExpandedId(expandedId === item._id ? null : item._id)}
                      showArchiveBadge
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback mode (static data)
  const fallback = fallbackArticles || [];
  const fallbackFiltered = filter === "all" ? fallback : fallback.filter((n) => n.category === filter);
  const sorted = [...fallbackFiltered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight px-1">Newsletter</h1>

      <div className="glass-card p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        CMS wird eingerichtet. Vorschau mit Beispieldaten.
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 px-1 -mx-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="tag whitespace-nowrap transition-all"
            style={{
              background: filter === f.key ? "rgba(var(--accent), 0.15)" : "rgba(0,0,0,0.04)",
              color: filter === f.key ? "var(--accent-hex)" : "var(--text-secondary)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.map((item) => (
          <article key={item.id} className="glass-card overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full text-left p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="tag text-[10px]" style={{ background: categoryColors[item.category], color: categoryTextColors[item.category] }}>
                  {categoryLabels[item.category]}
                </span>
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{formatDate(item.date)}</span>
              </div>
              <h3 className="font-bold text-base mb-1">{item.title}</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.summary}</p>
              <div className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: "var(--accent-hex)" }}>
                {expandedId === item.id ? "Weniger anzeigen" : "Weiterlesen"}
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${expandedId === item.id ? "rotate-180" : ""}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {expandedId === item.id && (
              <div className="px-5 pb-5 border-t border-white/30">
                <div className="text-sm leading-relaxed pt-4 whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                  {item.content}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function SanityArticleCard({
  item,
  isExpanded,
  onToggle,
  showArchiveBadge,
}: {
  item: SanityNewsletter;
  isExpanded: boolean;
  onToggle: () => void;
  showArchiveBadge?: boolean;
}) {
  const coverUrl = item.coverImage?.asset
    ? urlFor(item.coverImage).width(700).quality(80).url()
    : null;

  return (
    <article className="glass-card overflow-hidden" style={{ opacity: showArchiveBadge ? 0.75 : 1 }}>
      {coverUrl && !isExpanded && (
        <img
          src={coverUrl}
          alt={item.coverImage?.alt || item.title}
          className="w-full h-40 object-cover"
          loading="lazy"
        />
      )}
      <button onClick={onToggle} className="w-full text-left p-5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="tag text-[10px]"
            style={{
              background: categoryColors[item.category],
              color: categoryTextColors[item.category],
            }}
          >
            {categoryLabels[item.category]}
          </span>
          {showArchiveBadge && (
            <span
              className="tag text-[10px]"
              style={{ background: "rgba(255, 59, 48, 0.12)", color: "#ff3b30" }}
            >
              Ungültig
            </span>
          )}
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {formatDate(item.publishedAt)}
          </span>
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
          {coverUrl && (
            <img
              src={coverUrl}
              alt={item.coverImage?.alt || item.title}
              className="w-full rounded-2xl mt-4 mb-3"
              loading="lazy"
            />
          )}
          <div className="pt-4">
            <PortableTextRenderer content={item.content} />
          </div>
        </div>
      )}
    </article>
  );
}
