"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminNav from "@/components/AdminNav";
import { settleUploads } from "@/lib/upload-tracker";
import ImageField from "@/components/ImageField";
import BlocksEditor from "@/components/BlocksEditor";
import { collectImageUrls, dropEmptyBlocks, legacyToBlocks, sanitizeBlocks } from "@/lib/blocks";
import type { EventItem, NewsBlock } from "@/lib/types";
import { formatRange, groupByMonth, zurichToday } from "@/lib/event-dates";

type Draft = Omit<EventItem, "id"> & { id?: string };

const emptyDraft: Draft = {
  title: "",
  date: "",
  endDate: null,
  time: "",
  location: "",
  description: "",
  imageUrl: null,
  links: [],
  blocks: [],
  badge: "",
  status: "published",
  publishAt: new Date().toISOString(),
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

// ISO <-> datetime-local ("YYYY-MM-DDTHH:MM")
function isoToLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function localToIso(val: string): string {
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editorKey, setEditorKey] = useState(0); // neuer Schlüssel = Editor wird frisch aufgebaut
  const [legacyNote, setLegacyNote] = useState(false);
  // Frühere Jahre: nur Jahr und Anzahl, die Events werden erst beim Aufklappen geladen
  const [pastYears, setPastYears] = useState<{ year: number; count: number }[]>([]);
  const [openYears, setOpenYears] = useState<Record<number, boolean>>({});
  const [yearEvents, setYearEvents] = useState<Record<number, EventItem[] | "loading" | "error">>({});
  const openYearsRef = useRef(openYears);
  openYearsRef.current = openYears;

  const loadYear = useCallback(async (year: number) => {
    setYearEvents((d) => ({ ...d, [year]: d[year] && d[year] !== "error" ? d[year] : "loading" }));
    try {
      const res = await fetch(`/api/admin/events?year=${year}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setYearEvents((d) => ({ ...d, [year]: data.events || [] }));
    } catch {
      setYearEvents((d) => ({ ...d, [year]: "error" }));
    }
  }, []);

  function toggleYear(year: number) {
    const next = !openYears[year];
    setOpenYears((o) => ({ ...o, [year]: next }));
    if (next && !Array.isArray(yearEvents[year])) loadYear(year);
  }

  function openNew() {
    setDraft({ ...emptyDraft, publishAt: new Date().toISOString() });
    setLegacyNote(false);
    setEditorKey((k) => k + 1);
    setError("");
  }

  // Alte Events (nur Beschreibung + Links) werden beim Bearbeiten in Bausteine umgewandelt.
  function openEdit(ev: EventItem) {
    const hasBlocks = Boolean(ev.blocks && ev.blocks.length > 0);
    const blocks: NewsBlock[] = hasBlocks ? (ev.blocks as NewsBlock[]) : legacyToBlocks(ev.description, ev.links);
    setDraft({ ...ev, badge: ev.badge || "", blocks });
    setLegacyNote(!hasBlocks && blocks.length > 0);
    setEditorKey((k) => k + 1);
    setError("");
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/events");
    const data = await res.json();
    setEvents(data.events || []);
    setPastYears(data.pastYears || []);
    setLoading(false);
    // Bereits aufgeklappte frühere Jahre neu laden (nach Speichern/Löschen)
    for (const y of Object.keys(openYearsRef.current)) if (openYearsRef.current[Number(y)]) loadYear(Number(y));
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
    if (draft.endDate && draft.endDate < draft.date) {
      setError("Das Enddatum darf nicht vor dem Startdatum liegen.");
      return;
    }
    // Leere Bausteine entfernen und die übrigen prüfen, bevor etwas gesendet wird
    let blocks: NewsBlock[];
    try {
      blocks = sanitizeBlocks(dropEmptyBlocks(draft.blocks ?? []));
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setSaving(true);
    setError("");
    const isEdit = Boolean(draft.id);
    // Inhalt steckt jetzt in den Bausteinen: Der Server schreibt den Klartext selbst nach "description".
    const payload = { ...draft, blocks, description: "", links: [] };
    const res = await fetch("/api/admin/events", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      await settleUploads(collectImageUrls(payload.imageUrl, payload.blocks));
      setDraft(null);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Speichern fehlgeschlagen");
    }
  }

  async function remove(id: string) {
    if (!confirm("Dieses Event wirklich löschen?")) return;
    const res = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) load();
  }

  const today = zurichToday();
  const lastDayOf = (ev: EventItem) => (ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date);

  // Aufbau wie auf der Events-Seite: zuerst Entwürfe, dann anstehende Events nach Monaten (aufsteigend),
  // zuunterst die vergangenen nach Monaten (neueste zuerst).
  const drafts = events.filter((e) => e.status === "draft").sort((a, b) => a.date.localeCompare(b.date));
  const published = events.filter((e) => e.status !== "draft");
  const upcomingGroups = groupByMonth(published.filter((e) => lastDayOf(e) >= today), { direction: "asc" });
  const pastGroups = groupByMonth(published.filter((e) => lastDayOf(e) < today), { direction: "desc" });
  const sections: { title: string; groups: { key: string; label: string; events: EventItem[] }[] }[] = [
    ...(drafts.length ? [{ title: "Entwürfe", groups: [{ key: "drafts", label: "", events: drafts }] }] : []),
    ...(upcomingGroups.length ? [{ title: "Anstehend", groups: upcomingGroups }] : []),
    ...(pastGroups.length ? [{ title: "Vergangen", groups: pastGroups }] : []),
  ];

  const renderCard = (ev: EventItem) => {
    const isPast = lastDayOf(ev) < today;
    return (
      <div key={ev.id} className="glass-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{ev.title}</h3>
              {ev.status === "draft" && (
                <span className="tag text-[10px]" style={{ background: "rgba(142,142,147,0.18)", color: "var(--text-secondary)" }}>
                  Entwurf
                </span>
              )}
              {ev.status === "published" && new Date(ev.publishAt) > new Date() && (
                <span className="tag text-[10px]" style={{ background: "rgba(255,149,0,0.15)", color: "#ff9500" }}>
                  Geplant
                </span>
              )}
              {isPast && (
                <span className="tag text-[10px]" style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}>
                  Vergangen
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {formatRange(ev)} · {ev.time} · {ev.location}
            </p>
            {ev.updatedBy && (
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                zuletzt bearbeitet von {ev.updatedBy}
              </p>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => openEdit(ev)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}
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
  };

  return (
    <div>
      <AdminNav />
      <div className="flex items-center justify-between mb-4 px-1">
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}
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
          {sections.map((sec) => (
            <section key={sec.title} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider pt-2 px-1" style={{ color: "var(--text-secondary)" }}>{sec.title}</h2>
              {sec.groups.map((g) => (
                <div key={g.key} className="space-y-3">
                  {g.label && <h3 className="text-sm font-bold px-1 pt-1">{g.label}</h3>}
                  {g.events.map(renderCard)}
                </div>
              ))}
            </section>
          ))}

          {pastYears.length > 0 && (
            <section className="space-y-2" aria-labelledby="frueher">
              <h2 id="frueher" className="text-xs font-semibold uppercase tracking-wider pt-2 px-1" style={{ color: "var(--text-secondary)" }}>
                Frühere Jahre
              </h2>
              {pastYears.map(({ year, count }) => {
                const isOpen = Boolean(openYears[year]);
                const data = yearEvents[year];
                return (
                  <div key={year} className="glass-card no-press overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleYear(year)}
                      aria-expanded={isOpen}
                      aria-controls={`admin-past-${year}`}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-transform active:scale-[0.99]"
                    >
                      <span className="font-bold text-base">{year}</span>
                      <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                        {count} {count === 1 ? "Event" : "Events"}
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                    {isOpen && (
                      <div id={`admin-past-${year}`} className="px-2 pb-2 pt-2 space-y-3 border-t border-[color:var(--hairline)]">
                        {(data === undefined || data === "loading") && <p className="text-sm px-2 py-2" style={{ color: "var(--text-secondary)" }}>Lädt…</p>}
                        {data === "error" && (
                          <p className="text-sm px-2 py-2" role="alert" style={{ color: "#ff3b30" }}>
                            Konnte nicht geladen werden.{" "}
                            <button type="button" className="font-semibold underline" onClick={() => loadYear(year)}>Erneut versuchen</button>
                          </p>
                        )}
                        {Array.isArray(data) &&
                          groupByMonth(data, { direction: "desc" }).map((g) => (
                            <div key={g.key} className="space-y-2">
                              <h3 className="text-sm font-bold px-2 pt-1">{g.label}</h3>
                              {g.events.map(renderCard)}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </div>
      )}

      {draft && (
        <EditorModal
          title={draft.id ? "Event bearbeiten" : "Neues Event"}
          onClose={() => {
            void settleUploads([]);
            setDraft(null);
          }}
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
          <Field label="Enddatum (optional, für mehrtägige Events)">
            <div className="flex gap-2">
              <input
                type="date"
                value={draft.endDate || ""}
                min={draft.date || undefined}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value || null })}
                className={inputCls}
                aria-label="Enddatum"
              />
              {draft.endDate && (
                <button type="button" onClick={() => setDraft({ ...draft, endDate: null })} className="px-3 rounded-xl text-xs font-semibold" style={{ background: "var(--field-bg)" }}>
                  Entfernen
                </button>
              )}
            </div>
          </Field>
          <Field label="Ort">
            <input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Badge (optional, z.B. Highlight)">
            <input value={draft.badge || ""} onChange={(e) => setDraft({ ...draft, badge: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Titelbild">
            <ImageField value={draft.imageUrl} onChange={(url) => setDraft((d) => (d ? { ...d, imageUrl: url } : d))} />
          </Field>
          <div>
            <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Inhalt</span>
            {legacyNote && (
              <p className="text-xs rounded-xl p-3 mb-3" style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}>
                Dieses Event wurde mit dem alten Textfeld erstellt. Beschreibung und Links wurden in Bausteine umgewandelt.
                Beim Speichern wird das so übernommen.
              </p>
            )}
            <BlocksEditor
              key={editorKey}
              value={draft.blocks ?? []}
              onChange={(blocks) => setDraft((d) => (d ? { ...d, blocks } : d))}
            />
          </div>

          <div className="rounded-xl p-3" style={{ background: "var(--surface-subtle)" }}>
            <span className="text-xs font-semibold block mb-2" style={{ color: "var(--text-secondary)" }}>Sichtbarkeit</span>
            <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: "var(--field-bg)" }}>
              {(["published", "draft"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft({ ...draft, status: s })}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: draft.status === s ? "var(--accent-hex)" : "transparent",
                    color: draft.status === s ? "var(--accent-foreground)" : "var(--text-secondary)",
                  }}
                >
                  {s === "published" ? "Veröffentlicht" : "Entwurf"}
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Veröffentlichen am (in der Zukunft = geplant)
            </span>
            <input
              type="datetime-local"
              value={isoToLocal(draft.publishAt)}
              onChange={(e) => setDraft({ ...draft, publishAt: localToIso(e.target.value) })}
              className={inputCls}
            />
          </div>
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
        className="glass-strong modal-panel w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-sm" style={{ color: "var(--text-secondary)" }}>Schliessen</button>
        </div>
        <div className="space-y-4">{children}</div>
        {error && <p className="text-xs mt-3" style={{ color: "#ff3b30" }}>{error}</p>}
        <div className="modal-actions flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--hairline)" }}>
            Abbrechen
          </button>
          <button onClick={onSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}>
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
