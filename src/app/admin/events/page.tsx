"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import ImageField from "@/components/ImageField";
import LinksField from "@/components/LinksField";
import type { EventItem, EventLink } from "@/lib/types";

type Draft = Omit<EventItem, "id"> & { id?: string };

const emptyDraft: Draft = {
  title: "",
  date: "",
  time: "",
  location: "",
  description: "",
  imageUrl: null,
  links: [],
  badge: "",
};

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("de-CH", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/events");
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!draft) return;
    if (!draft.title || !draft.date) {
      setError("Titel und Datum sind erforderlich.");
      return;
    }
    setSaving(true);
    setError("");
    const isEdit = Boolean(draft.id);
    const url = isEdit ? `/api/admin/events/${draft.id}` : "/api/admin/events";
    const res = await fetch(url, {
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
    if (!confirm("Dieses Event wirklich löschen?")) return;
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <AdminNav />
      <div className="flex items-center justify-between mb-4 px-1">
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <button
          onClick={() => { setDraft({ ...emptyDraft }); setError(""); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--accent-hex)" }}
        >
          + Neu
        </button>
      </div>

      {loading ? (
        <p className="text-sm px-1" style={{ color: "var(--text-secondary)" }}>Lädt…</p>
      ) : (
        <div className="space-y-3">
          {events.length === 0 && (
            <p className="glass-card p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              Noch keine Events. Erstelle das erste!
            </p>
          )}
          {events.map((ev) => {
            const isPast = new Date(ev.date) < today;
            return (
              <div key={ev.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{ev.title}</h3>
                      {isPast && (
                        <span className="tag text-[10px]" style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}>
                          Vergangen
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {formatDate(ev.date)} · {ev.time} · {ev.location}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setDraft({ ...ev, badge: ev.badge || "" }); setError(""); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => remove(ev.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {draft && (
        <EditorModal
          title={draft.id ? "Event bearbeiten" : "Neues Event"}
          onClose={() => setDraft(null)}
          onSave={save}
          saving={saving}
          error={error}
        >
          <Field label="Titel *">
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum *">
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Zeit">
              <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Ort">
            <input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Beschreibung">
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} className={inputCls} />
          </Field>
          <Field label="Badge (optional, z.B. „Highlight")">
            <input value={draft.badge || ""} onChange={(e) => setDraft({ ...draft, badge: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Bild">
            <ImageField value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
          </Field>
          <Field label="Links">
            <LinksField links={draft.links} onChange={(links: EventLink[]) => setDraft({ ...draft, links })} />
          </Field>
        </EditorModal>
      )}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-black/[0.04]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</span>
      {children}
    </label>
  );
}

function EditorModal({
  title,
  children,
  onClose,
  onSave,
  saving,
  error,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        className="glass-strong w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-sm" style={{ color: "var(--text-secondary)" }}>Schliessen</button>
        </div>
        <div className="space-y-4">{children}</div>
        {error && <p className="text-xs mt-3" style={{ color: "#ff3b30" }}>{error}</p>}
        <div className="flex gap-2 mt-5 sticky bottom-0 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "rgba(0,0,0,0.05)" }}>
            Abbrechen
          </button>
          <button onClick={onSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: "var(--accent-hex)" }}>
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
