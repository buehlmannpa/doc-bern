"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import ImageField from "@/components/ImageField";
import type { BoardMemberItem } from "@/lib/types";

type Draft = Omit<BoardMemberItem, "sortOrder"> & { id?: string };

const emptyDraft: Draft = { name: "", role: "", description: "", imageUrl: null };
const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-black/[0.04]";

export default function BoardAdminPage() {
  const [items, setItems] = useState<BoardMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/board");
    const data = await res.json();
    setItems(data.board || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!draft) return;
    if (!draft.name) { setError("Name ist erforderlich."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/admin/board", {
      method: draft.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (res.ok) { setDraft(null); load(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Speichern fehlgeschlagen"); }
  }

  async function remove(id: string) {
    if (!confirm("Dieses Vorstandsmitglied wirklich löschen?")) return;
    const res = await fetch(`/api/admin/board?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const t = index + dir;
    if (t < 0 || t >= next.length) return;
    [next[index], next[t]] = [next[t], next[index]];
    setItems(next);
    await fetch("/api/admin/board", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((n) => n.id) }),
    });
  }

  return (
    <div>
      <AdminNav />
      <div className="flex items-center justify-between mb-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight">Vorstand</h1>
        <button onClick={() => { setDraft({ ...emptyDraft }); setError(""); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}>+ Neu</button>
      </div>
      <p className="text-xs mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
        Reihenfolge mit den Pfeilen anpassen. Wird auf der Startseite angezeigt.
      </p>

      {loading ? <p className="text-sm px-1" style={{ color: "var(--text-secondary)" }}>Lädt…</p> : (
        <div className="space-y-3">
          {items.length === 0 && (
            <p className="glass-card p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>Noch keine Mitglieder.</p>
          )}
          {items.map((m, i) => (
            <div key={m.id} className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg text-sm disabled:opacity-30" style={{ background: "var(--field-bg)" }} aria-label="Nach oben">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="w-7 h-7 rounded-lg text-sm disabled:opacity-30" style={{ background: "var(--field-bg)" }} aria-label="Nach unten">↓</button>
                </div>
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt={m.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: "var(--field-bg)" }} />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm">{m.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--accent-hex)" }}>{m.role}</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => { setDraft({ ...m }); setError(""); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}>Bearbeiten</button>
                  <button onClick={() => remove(m.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}>Löschen</button>
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
              <h2 className="text-lg font-bold">{draft.id ? "Mitglied bearbeiten" : "Neues Mitglied"}</h2>
              <button onClick={() => setDraft(null)} className="text-sm" style={{ color: "var(--text-secondary)" }}>Schliessen</button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Name *</span>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Rolle</span>
                <input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="z.B. Präsident" className={inputCls} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Kurztext (optional)</span>
                <textarea value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Foto</span>
                <ImageField value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
              </label>
            </div>
            {error && <p className="text-xs mt-3" style={{ color: "#ff3b30" }}>{error}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setDraft(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--field-bg)" }}>Abbrechen</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}>{saving ? "Speichern…" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
