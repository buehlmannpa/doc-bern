import { discounts } from "@/data/content";
import { getLatestAction } from "@/lib/db";
import type { ActionItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" });
}

export default async function VorteilePage() {
  let action: ActionItem | null = null;
  try {
    action = await getLatestAction();
  } catch {
    // keine aktuelle Aktion verfügbar
  }

  const sorted = [...discounts].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight px-1">Vorteile</h1>

      {/* Aktuelle Aktion für Mitglieder */}
      {action && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
            Aktuelle Aktion für Mitglieder
          </h2>
          <article className="glass-card p-5 relative overflow-hidden" style={{ borderLeft: "4px solid var(--accent-hex)" }}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {action.periodLabel && (
                <span className="tag text-[10px] text-white" style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}>
                  {action.periodLabel}
                </span>
              )}
              {action.discount && (
                <span className="tag text-[10px]" style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}>
                  {action.discount}
                </span>
              )}
            </div>
            <h3 className="font-bold text-lg mb-1">{action.title}</h3>
            <p className="text-sm whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>{action.description}</p>
          </article>
        </section>
      )}

      {/* DOC-Rabatte für Mitglieder */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
          DOC-Rabatte für Mitglieder
        </h2>
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 lg:items-stretch">
          {sorted.map((d) => (
            <article key={d.id} className="glass-card p-5 lg:h-full">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg"
                  style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}>
                  {d.percentage ? `${d.percentage}%` : "%"}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base mb-0.5">{d.title}</h3>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--accent-text)" }}>{d.partner}</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{d.description}</p>
                  {d.validUntil && (
                    <p className="text-[11px] mt-2" style={{ color: "var(--text-secondary)" }}>
                      Gültig bis {formatDate(d.validUntil)}
                    </p>
                  )}
                  {d.code && (
                    <div className="mt-2 inline-block px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider"
                      style={{ background: "rgba(var(--accent), 0.08)", color: "var(--accent-text)" }}>
                      {d.code}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
