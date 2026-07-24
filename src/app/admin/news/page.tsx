"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import ImageField from "@/components/ImageField";
import LinksField from "@/components/LinksField";
import type { NewsItem, NewsCategory, EventLink } from "@/lib/types";

type Draft = Omit<NewsItem, "id" | "sortOrder"> & { id?: string };

const emptyDraft: Draft = {
  title: "",
  summary: "",
  content: "",
  imageUrl: null,
  links: [],
  category: "news",
  isArchived: false,
  publishedAt: new Date().toISOString(),
};

const categoryOptions: { value: NewsCategory; label: string }[] = [
  { value: "news", label: "Neuigkeit" },
  { value: "report", label: "Bericht" },
  { value: "interview", label: "Interview" },
  { value: "update", label: "Update" },
];

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-black/[0.04]";

export default function NewsAdminPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/news");
    const data = await res.json();
    setItems(data.news || []);
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
    const res = await fetch("/api/admin/news", {
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
    if (!confirm("Diesen Beitrag wirklich löschen?")) return;
    const res = await fetch(`/api/admin/news?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    await fetch("/api/admin/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((n) => n.id) }),
    });
  }

  return (
    <div>
      <AdminNav />
      <div className="flex items-center justify-between mb-2 px-1">
        <h1 className="text-2xl font-bold tracking-tight">News</h1>
        <button
          onClick={() => { setDraft({ ...emptyDraft, publishedAt: new Date().toISOString() }); setError(""); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--accent-hex)" }}
        >
          + Neu
        </button>
      </div>
      <p className="text-xs mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
        Reihenfolge mit den Pfeilen anpassen. Archivierte Beiträge erscheinen im Archiv der News-Seite.
      </p>

      {loading ? (
        <p className="text-sm px-1" style={{ color: "var(--text-secondary)" }}>Lädt…</p>
      ) : (
        <div className="space-y-3">
          {items.length === 0 && (
            <p className="glass-card p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              Noch keine Beiträge. Erstelle den ersten!
            </p>
          )}
          {items.map((n, i) => (
            <div key={n.id} className="glass-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="w-7 h-7 rounded-lg text-sm disabled:opacity-30"
                    style={{ background: "rgba(0,0,0,0.05)" }}
                    aria-label="Nach oben"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    className="w-7 h-7 rounded-lg text-sm disabled:opacity-30"
                    style={{ background: "rgba(0,0,0,0.05)" }}
                    aria-label="Nach unten"
                  >
                    ↓
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{n.title}</h3>
                    {n.isArchived && (
                      <span className="tag text-[10px]" style={{ background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}>
                        Ungültig
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-secondary)" }}>
                    {n.summary}
                  </p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => { setDraft({ ...n }); setError(""); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => remove(n.id)}
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
              <h2 className="text-lg font-bold">{draft.id ? "Beitrag bearbeiten" : "Neuer Beitrag"}</h2>
              <button onClick={() => setDraft(null)} className="text-sm" style={{ color: "var(--text-secondary)" }}>Schliessen</button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Titel *</span>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Kurzbeschreibung</span>
                <textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={2} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Inhalt</span>
                <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} rows={7} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Kategorie</span>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as NewsCategory })} className={inputCls}>
                  {categoryOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Bild</span>
                <ImageField value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Links</span>
                <LinksField links={draft.links} onChange={(links: EventLink[]) => setDraft({ ...draft, links })} />
              </label>
              <label className="flex items-center gap-3 py-2">
                <input type="checkbox" checked={draft.isArchived} onChange={(e) => setDraft({ ...draft, isArchived: e.target.checked })} className="w-5 h-5" />
                <span className="text-sm font-semibold">Als „Ungültig" archivieren</span>
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
