"use client";

import { useState } from "react";
import { newsletters } from "@/data/content";

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

type Category = "all" | "news" | "report" | "interview" | "update";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NewsletterPage() {
  const [filter, setFilter] = useState<Category>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? newsletters
      : newsletters.filter((n) => n.category === filter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filters: { key: Category; label: string }[] = [
    { key: "all", label: "Alle" },
    { key: "news", label: "News" },
    { key: "report", label: "Berichte" },
    { key: "interview", label: "Interviews" },
    { key: "update", label: "Updates" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight px-1">Newsletter</h1>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 px-1 -mx-1 scrollbar-none">
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

      {/* Articles */}
      <div className="space-y-3">
        {sorted.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <article
              key={item.id}
              id={item.id}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full text-left p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="tag text-[10px]"
                    style={{
                      background: categoryColors[item.category],
                      color: categoryTextColors[item.category],
                    }}
                  >
                    {categoryLabels[item.category]}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(item.date)}
                  </span>
                </div>
                <h3 className="font-bold text-base mb-1">{item.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {item.summary}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: "var(--accent-hex)" }}>
                  {isExpanded ? "Weniger anzeigen" : "Weiterlesen"}
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-white/30">
                  <div
                    className="text-sm leading-relaxed pt-4 whitespace-pre-line"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.content}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
