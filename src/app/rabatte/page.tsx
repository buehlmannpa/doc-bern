import { discounts, memberAction } from "@/data/content";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" });
}

export default function VorteilePage() {
  const sorted = [...discounts].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight px-1">Vorteile</h1>

      {/* Aktuelle Aktion für Mitglieder */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
          Aktuelle Aktion für Mitglieder
        </h2>
        <article className="glass-card p-5 relative overflow-hidden" style={{ borderLeft: "4px solid var(--accent-hex)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="tag text-[10px] text-white" style={{ background: "var(--accent-hex)" }}>
              {memberAction.quarter}
            </span>
            <span className="tag text-[10px]" style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}>
              Quartals-Aktion
            </span>
          </div>
          <h3 className="font-bold text-lg mb-1">{memberAction.title}</h3>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--accent-hex)" }}>{memberAction.partner}</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{memberAction.description}</p>
          {memberAction.validUntil && (
            <p className="text-[11px] mt-3" style={{ color: "var(--text-secondary)" }}>
              Gültig bis {formatDate(memberAction.validUntil)}
            </p>
          )}
        </article>
      </section>

      {/* DOC-Rabatte für Mitglieder */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
          DOC-Rabatte für Mitglieder
        </h2>
        <div className="space-y-3">
          {sorted.map((d) => (
            <article key={d.id} className="glass-card p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg"
                  style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}>
                  {d.percentage ? `${d.percentage}%` : "%"}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base mb-0.5">{d.title}</h3>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--accent-hex)" }}>{d.partner}</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{d.description}</p>
                  {d.validUntil && (
                    <p className="text-[11px] mt-2" style={{ color: "var(--text-secondary)" }}>
                      Gültig bis {formatDate(d.validUntil)}
                    </p>
                  )}
                  {d.code && (
                    <div className="mt-2 inline-block px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider"
                      style={{ background: "rgba(var(--accent), 0.08)", color: "var(--accent-hex)" }}>
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
