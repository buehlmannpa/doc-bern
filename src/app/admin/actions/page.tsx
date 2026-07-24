"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import type { ActionItem } from "@/lib/types";

type Draft = Omit<ActionItem, "id" | "createdAt"> & { id?: string };

const emptyDraft: Draft = { title: "", periodLabel: "", discount: "", description: "" };
const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-black/[0.04]";

export default function ActionsAdminPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/actions");
    const data = await res.json();
    setActions(data.actions || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!draft) return;
    if (!draft.title) {
      setError("Titel ist erforderlich.");
      return;
    }
    setSaving(true);
    setError("");
    const isEdit = Boolean(draft.id);
    const res = await fetch("/api/admin/actions", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (res.ok) {
      setDraft(null);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Speichern fehlgeschlagen");
    }
  }

  async function remove(id: string) {
    if (!confirm("Diese Aktion wirklich löschen?")) return;
    const res = await fetch(`/api/admin/actions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <AdminNav />
      <div className="flex items-center justify-between mb-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight">Rabattaktion</h1>
        <button
          onClick={() => { setDraft({ ...emptyDraft }); setError(""); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--accent-hex)" }}
        >
          + Neu
        </button>
      </div>
      <p className="text-xs mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
        Die neueste Aktion wird den Mitgliedern auf der Seite „Vorteile" angezeigt. Ältere Aktionen kannst du löschen. Hier siehst du die letzten 4.
      </p>

      {loading ? (
        <p className="text-sm px-1" style={{ color: "var(--text-secondary)" }}>Lädt…</p>
      ) : (
        <div className="space-y-3">
          {actions.length === 0 && (
            <p className="glass-card p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              Noch keine Aktion. Erstelle die erste!
            </p>
          )}
          {actions.map((a, i) => (
            <div key={a.id} className="glass-card p-4">
              <div className="flex items-start gap-3">
                {a.discount && (
                  <div
                    className="flex-shrink-0 min-w-12 h-12 px-2 rounded-2xl flex items-center justify-center font-bold text-sm"
                    style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
                  >
                    {a.discount}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{a.title}</h3>
                    {i === 0 && (
                      <span className="tag text-[10px]" style={{ background: "rgba(52,199,89,0.12)", color: "#34c759" }}>
                        Aktiv
                      </span>
                    )}
                  </div>
                  {a.periodLabel && (
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--accent-hex)" }}>{a.periodLabel}</p>
                  )}
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{a.description}</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => { setDraft({ ...a }); setError(""); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDraft(null)}>
          <div className="glass-strong w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{draft.id ? "Aktion bearbeiten" : "Neue Aktion"}</h2>
              <button onClick={() => setDraft(null)} className="text-sm" style={{ color: "var(--text-secondary)" }}>Schliessen</button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Titel *</span>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Zeitraum</span>
                  <input value={draft.periodLabel} onChange={(e) => setDraft({ ...draft, periodLabel: e.target.value })} placeholder="z.B. Q3 2026 oder Juli–Sept." className={inputCls} />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Rabatt</span>
                  <input value={draft.discount} onChange={(e) => setDraft({ ...draft, discount: e.target.value })} placeholder="z.B. 15%" className={inputCls} />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Beschreibung</span>
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={5} className={inputCls} />
              </label>
            </div>
            {error && <p className="text-xs mt-3" style={{ color: "#ff3b30" }}>{error}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setDraft(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "rgba(0,0,0,0.05)" }}>Abbrechen</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: "var(--accent-hex)" }}>
                {saving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
