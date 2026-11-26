"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminNav from "@/components/AdminNav";

type Entry = {
  id: number;
  ts: string;
  actor: string | null;
  action: "login" | "login_failed" | "logout" | "create" | "update" | "delete" | "reorder" | "setting" | "optimize";
  entity: string;
  label: string | null;
  detail: string | null;
  ip: string | null;
  device: string | null;
};
type Facets = { actors: string[]; total: number; oldest: string | null; retentionDays: number };

const ENTITY: Record<string, { name: string; the: string }> = {
  event: { name: "Events", the: "das Event" },
  news: { name: "News", the: "den Beitrag" },
  action: { name: "Rabattaktionen", the: "die Rabattaktion" },
  partner: { name: "Partner", the: "den Partner" },
  board: { name: "Vorstand", the: "das Vorstandsmitglied" },
  user: { name: "Benutzer", the: "den Benutzer" },
  settings: { name: "Einstellungen", the: "die Einstellung" },
  image: { name: "Bilder", the: "das Bild" },
  login: { name: "Anmeldung", the: "" },
};
const ACTION_NAME: Record<Entry["action"], string> = {
  login: "Anmeldung",
  login_failed: "Anmeldung fehlgeschlagen",
  logout: "Abmeldung",
  create: "Erstellt",
  update: "Geändert",
  delete: "Gelöscht",
  reorder: "Reihenfolge",
  setting: "Einstellung",
  optimize: "Bilder verkleinert",
};
// Farbe und Zeichen pro Art der Aktion
const LOOK: Record<Entry["action"], { color: string; icon: string }> = {
  login: { color: "#007aff", icon: "→" },
  logout: { color: "#8e8e93", icon: "←" },
  login_failed: { color: "#ff3b30", icon: "!" },
  create: { color: "#34c759", icon: "+" },
  update: { color: "#ff9500", icon: "✎" },
  delete: { color: "#ff3b30", icon: "✕" },
  reorder: { color: "#8e8e93", icon: "⇅" },
  setting: { color: "#af52de", icon: "⚙" },
  optimize: { color: "#8e8e93", icon: "▣" },
};
const CRITICAL = (e: Entry) => e.action === "delete" || e.action === "login_failed" || e.entity === "user" || e.entity === "settings";

const zone = "Europe/Zurich";
const timeFmt = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: zone });
const fullFmt = new Intl.DateTimeFormat("de-CH", { dateStyle: "medium", timeStyle: "medium", timeZone: zone });
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date(iso)); // YYYY-MM-DD

function dayTitle(key: string): string {
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());
  if (key === today) return "Heute";
  if (key === yesterday) return "Gestern";
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function Sentence({ e }: { e: Entry }) {
  const who = <strong>{e.actor ?? "Unbekannt"}</strong>;
  const label = e.label ? <span className="font-semibold">«{e.label}»</span> : null;
  const the = ENTITY[e.entity]?.the ?? "";
  switch (e.action) {
    case "login": return <>{who} hat sich angemeldet</>;
    case "logout": return <>{who} hat sich abgemeldet</>;
    case "login_failed": return <>Anmeldung fehlgeschlagen für {label}</>;
    case "create": return <>{who} hat {the} {label} erstellt</>;
    case "update": return <>{who} hat {the} {label} geändert</>;
    case "delete": return <>{who} hat {the} {label} gelöscht</>;
    case "reorder": return <>{who} hat die Reihenfolge ({ENTITY[e.entity]?.name ?? e.entity}) geändert</>;
    case "setting": return <>{who} hat {label} {e.detail ?? "umgestellt"}</>;
    case "optimize": return <>{who} hat {the} {label} verkleinert</>;
  }
}

const PERIODS = [
  { id: "today", label: "Heute" },
  { id: "7", label: "7 Tage" },
  { id: "30", label: "30 Tage" },
  { id: "all", label: "Alles" },
] as const;

function periodRange(id: string): { from?: string; to?: string } {
  if (id === "all") return {};
  const today = dayKey(new Date().toISOString());
  if (id === "today") return { from: today, to: today };
  const from = dayKey(new Date(Date.now() - (Number(id) - 1) * 86400000).toISOString());
  return { from };
}

export default function LogPage() {
  const [period, setPeriod] = useState<string>("7");
  const [actor, setActor] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [critical, setCritical] = useState(false);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const query = useCallback(
    (before?: number) => {
      const p = new URLSearchParams();
      const r = periodRange(period);
      if (r.from) p.set("from", r.from);
      if (r.to) p.set("to", r.to);
      if (actor) p.set("actor", actor);
      if (entity) p.set("entity", entity);
      if (action) p.set("action", action);
      if (q.trim()) p.set("q", q.trim());
      if (critical) p.set("critical", "1");
      if (before) p.set("before", String(before));
      return p.toString();
    },
    [period, actor, entity, action, q, critical]
  );

  const load = useCallback(async () => {
    const my = ++seq.current;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/audit?${query()}`);
      const data = await res.json();
      if (my !== seq.current) return; // eine neuere Anfrage läuft schon
      if (!res.ok) throw new Error(data.error || "Fehler");
      setEntries(data.entries);
      setHasMore(data.hasMore);
      if (data.facets) setFacets(data.facets);
    } catch (e) {
      if (my === seq.current) setError((e as Error).message);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [query]);

  // Suchtext leicht verzögert, alle anderen Filter sofort
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function more() {
    const last = entries[entries.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/audit?${query(last.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      setEntries((prev) => [...prev, ...data.entries]);
      setHasMore(data.hasMore);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  // Nach Tag gruppieren
  const groups: { key: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const k = dayKey(e.ts);
    const g = groups[groups.length - 1];
    if (g && g.key === k) g.items.push(e);
    else groups.push({ key: k, items: [e] });
  }

  const sel = "px-3 py-2 rounded-xl text-sm outline-none bg-black/[0.04] min-w-0";
  const hasFilter = actor || entity || action || q || critical || period !== "7";

  return (
    <div>
      <AdminNav />
      <h1 className="text-2xl font-bold tracking-tight mb-1 px-1">Protokoll</h1>
      <p className="text-sm mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
        Wer hat sich angemeldet, wer hat was erstellt, geändert oder gelöscht. Es werden nie Inhalte oder Passwörter gespeichert.
        {facets && <> Einträge werden nach {Math.round(facets.retentionDays / 30)} Monaten automatisch gelöscht.</>}
      </p>

      <div className="glass-card no-press p-3 mb-4 space-y-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Zeitraum">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              aria-pressed={period === p.id}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: period === p.id ? "var(--accent-hex)" : "var(--bg-secondary)", color: period === p.id ? "var(--accent-foreground)" : "var(--text-primary)", border: "1px solid var(--hairline)" }}
            >
              {p.label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-xs font-semibold">
            <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} className="w-4 h-4" />
            Nur Wichtiges
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select aria-label="Person" value={actor} onChange={(e) => setActor(e.target.value)} className={sel}>
            <option value="">Alle Personen</option>
            {facets?.actors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select aria-label="Bereich" value={entity} onChange={(e) => setEntity(e.target.value)} className={sel}>
            <option value="">Alle Bereiche</option>
            {Object.entries(ENTITY).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
          <select aria-label="Aktion" value={action} onChange={(e) => setAction(e.target.value)} className={sel}>
            <option value="">Alle Aktionen</option>
            {(Object.keys(ACTION_NAME) as Entry["action"][]).map((k) => <option key={k} value={k}>{ACTION_NAME[k]}</option>)}
          </select>
          <input aria-label="Suchen" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen…" className={sel} />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span data-testid="count">
            {loading ? "Lädt…" : `${entries.length}${hasMore ? "+" : ""} ${entries.length === 1 ? "Eintrag" : "Einträge"}`}
            {facets?.oldest && <> · ältester vom {new Date(facets.oldest).toLocaleDateString("de-CH", { timeZone: zone })}</>}
          </span>
          <span className="flex gap-3">
            {hasFilter && (
              <button type="button" className="font-semibold underline" onClick={() => { setPeriod("7"); setActor(""); setEntity(""); setAction(""); setQ(""); setCritical(false); }}>
                Filter zurücksetzen
              </button>
            )}
            <button type="button" className="font-semibold underline" onClick={load}>Aktualisieren</button>
          </span>
        </div>
      </div>

      {error && <div className="glass-card p-4 mb-3 text-sm" role="alert" style={{ background: "rgba(255,59,48,0.1)" }}>{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <p className="glass-card p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>Keine Einträge für diese Auswahl.</p>
      )}

      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.key} aria-label={dayTitle(g.key)}>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: "var(--text-secondary)" }}>{dayTitle(g.key)}</h2>
            <ul className="glass-card no-press overflow-hidden divide-y divide-[color:var(--hairline)]">
              {g.items.map((e) => {
                const look = LOOK[e.action];
                return (
                  <li key={e.id} data-action={e.action} data-entity={e.entity} className="flex gap-3 px-3.5 py-2.5" style={CRITICAL(e) ? { background: "rgba(255,59,48,0.05)" } : undefined}>
                    <span className="mt-0.5 w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${look.color}22`, color: look.color }} aria-label={ACTION_NAME[e.action]} title={ACTION_NAME[e.action]}>
                      {look.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug break-words"><Sentence e={e} /></p>
                      {e.detail && e.action !== "setting" && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {e.action === "update" ? "Geändert: " : ""}{e.detail}
                        </p>
                      )}
                      {(e.device || e.ip) && (
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{[e.device, e.ip].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                    <time dateTime={e.ts} title={fullFmt.format(new Date(e.ts))} className="text-xs font-semibold flex-shrink-0 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {timeFmt.format(new Date(e.ts))}
                    </time>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {hasMore && (
        <button type="button" onClick={more} disabled={loadingMore} className="w-full mt-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ background: "var(--bg-secondary)", border: "1px solid var(--hairline)", color: "var(--text-primary)" }}>
          {loadingMore ? "Lädt…" : "Mehr anzeigen"}
        </button>
      )}
    </div>
  );
}
