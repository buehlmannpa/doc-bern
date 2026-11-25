import { sql } from "@vercel/postgres";
import { currentUsername } from "./session";

// Protokoll (nur für Super-Admins sichtbar): wer hat sich wann angemeldet, wer hat was erstellt, geändert oder gelöscht.
// Bewusst sparsam: eine schmale Tabelle, kurze Codes statt langer Texte, keine Inhalte und nie Passwörter.
// Einträge werden nach RETENTION_DAYS (3 Monate) automatisch gelöscht.

export const RETENTION_DAYS = 90;

export type AuditAction = "login" | "login_failed" | "logout" | "create" | "update" | "delete" | "reorder" | "setting" | "optimize";
export type AuditEntity = "event" | "news" | "action" | "partner" | "board" | "user" | "settings" | "image" | "login";

export type AuditEntry = {
  id: number;
  ts: string; // ISO
  actor: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  label: string | null; // z. B. Titel des Events
  detail: string | null; // z. B. "Titel, Datum" (geänderte Felder)
  ip: string | null;
  device: string | null; // z. B. "iPhone · Safari"
};

let tableReady: Promise<void> | null = null;
function ensureAuditTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS audit_log (
          id BIGSERIAL PRIMARY KEY,
          ts TIMESTAMPTZ NOT NULL DEFAULT now(),
          actor TEXT,
          action TEXT NOT NULL,
          entity TEXT NOT NULL,
          entity_id TEXT,
          label TEXT,
          detail TEXT,
          ip TEXT,
          device TEXT
        );
      `;
      await sql`CREATE INDEX IF NOT EXISTS audit_log_ts_idx ON audit_log (ts);`;
      await sql`CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor, id DESC);`;
    })().catch((e) => {
      tableReady = null; // beim nächsten Mal erneut versuchen
      throw e;
    });
  }
  return tableReady;
}

/* ───────────── Hilfen ───────────── */

function clip(s: string | null | undefined, n: number): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, n) : null;
}

export function clientIp(request: Request | null): string | null {
  if (!request) return null;
  const xf = request.headers.get("x-forwarded-for");
  const ip = (xf ? xf.split(",")[0] : request.headers.get("x-real-ip")) ?? "";
  return clip(ip, 45);
}

// Gerät kurz beschreiben ("iPhone · Safari"), ohne den langen User-Agent zu speichern
export function deviceLabel(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return clip([os, browser].filter(Boolean).join(" · "), 40);
}

/* ───────────── Schreiben ───────────── */

const failedSeen = new Map<string, number>();
let lastPurge = 0;

async function maybePurge() {
  const every = process.env.AUDIT_PURGE_MIN_INTERVAL_MS !== undefined ? Number(process.env.AUDIT_PURGE_MIN_INTERVAL_MS) : 6 * 60 * 60 * 1000;
  if (Date.now() - lastPurge < every) return;
  lastPurge = Date.now();
  await purgeAudit();
}

/** Löscht Einträge, die älter als 3 Monate sind (Logrotate). */
export async function purgeAudit(days = RETENTION_DAYS): Promise<number> {
  await ensureAuditTable();
  const res = await sql`DELETE FROM audit_log WHERE ts < now() - make_interval(days => ${days}::int);`;
  return res.rowCount ?? 0;
}

export type AuditInput = {
  action: AuditAction;
  entity: AuditEntity;
  id?: string | null;
  label?: string | null;
  detail?: string | null;
  actor?: string | null; // sonst der angemeldete Benutzer
};

/** Protokolleintrag schreiben. Wirft nie: Ein Fehler im Protokoll darf keine Aktion verhindern. */
export async function logAudit(request: Request | null, input: AuditInput): Promise<void> {
  try {
    const actor = input.actor !== undefined ? input.actor : await currentUsername();
    const ip = clientIp(request);
    // Wiederholte Fehlversuche derselben Person von derselben Adresse nur einmal pro 10 Minuten festhalten (Platz sparen)
    if (input.action === "login_failed") {
      const key = `${ip}|${(input.label ?? "").toLowerCase()}`;
      const last = failedSeen.get(key) ?? 0;
      if (Date.now() - last < 10 * 60 * 1000) return;
      failedSeen.set(key, Date.now());
      if (failedSeen.size > 500) failedSeen.clear();
    }
    await ensureAuditTable();
    await sql`
      INSERT INTO audit_log (actor, action, entity, entity_id, label, detail, ip, device)
      VALUES (${clip(actor, 60)}, ${input.action}, ${input.entity}, ${clip(input.id, 80)}, ${clip(input.label, 120)},
              ${clip(input.detail, 300)}, ${ip}, ${deviceLabel(request?.headers.get("user-agent"))});
    `;
    await maybePurge();
  } catch (e) {
    console.error("Protokoll konnte nicht geschrieben werden:", (e as Error).message);
  }
}

/* ───────────── Änderungen beschreiben ───────────── */

// Anzeigenamen der Felder. Mehrere technische Felder können zu einem Anzeigenamen gehören (z. B. Inhalt).
const FIELDS: Record<string, [string, string[]][]> = {
  event: [["Titel", ["title"]], ["Datum", ["date"]], ["Enddatum", ["endDate"]], ["Zeit", ["time"]], ["Ort", ["location"]], ["Badge", ["badge"]], ["Titelbild", ["imageUrl"]], ["Inhalt", ["description", "links", "blocks"]]],
  news: [["Titel", ["title"]], ["Kurztext", ["summary"]], ["Kategorie", ["category"]], ["Titelbild", ["imageUrl"]], ["Archiv", ["isArchived"]], ["Inhalt", ["content", "links", "blocks"]]],
  action: [["Titel", ["title"]], ["Beschreibung", ["description"]], ["Rabatt", ["discount"]], ["Zeitraum", ["periodLabel"]]],
  partner: [["Name", ["name"]], ["Kategorie", ["category"]], ["Beschreibung", ["description"]], ["Adresse", ["address"]], ["Telefon", ["phone"]], ["E-Mail", ["email"]], ["Website", ["website"]], ["Rabatt", ["discount"]]],
  board: [["Name", ["name"]], ["Rolle", ["role"]], ["Kurztext", ["description"]], ["Foto", ["imageUrl"]]],
};
const STATUS: Record<string, string> = { draft: "Entwurf", published: "Veröffentlicht" };

type Obj = Record<string, unknown>;
// Leer ist leer: null, "" und [] gelten als gleich (sonst würde "kein Inhalt" -> "leere Bausteine" als Änderung gemeldet)
const norm = (v: unknown) => (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) ? null : v);
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));

/** Welche Felder haben sich geändert? ("Titel, Datum, Status: Entwurf → Veröffentlicht") Es werden nie Inhalte oder Werte gespeichert, ausser dem Status. */
export function auditDiff(entity: keyof typeof FIELDS, before: Obj | null, after: Obj): string | null {
  if (!before) return null;
  const parts: string[] = [];
  for (const [label, keys] of FIELDS[entity]) {
    if (keys.some((k) => !same(before[k], after[k]))) parts.push(label);
  }
  if (before.status !== undefined && before.status !== after.status) {
    parts.push(`Status: ${STATUS[String(before.status)] ?? before.status} → ${STATUS[String(after.status)] ?? after.status}`);
  }
  if ((entity === "event" || entity === "news") && !same(before.publishAt ?? before.publishedAt, after.publishAt ?? after.publishedAt)) parts.push("Veröffentlichungszeit");
  return parts.length ? parts.join(", ") : "keine Änderung";
}

/* ───────────── Lesen (für die Super-Admin-Seite) ───────────── */

export type AuditFilter = {
  from?: string; // YYYY-MM-DD (Schweizer Zeit)
  to?: string; // YYYY-MM-DD, einschliesslich
  actor?: string;
  entity?: string;
  action?: string;
  q?: string;
  critical?: boolean; // nur Wichtiges: Löschen, Fehlversuche, Benutzer, Einstellungen
  before?: number; // Cursor: nur Einträge mit kleinerer id
  limit?: number;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const nul = (v: string | undefined | null) => (v ? v : null);

export async function queryAudit(f: AuditFilter): Promise<{ entries: AuditEntry[]; hasMore: boolean }> {
  await ensureAuditTable();
  await maybePurge().catch(() => {});
  const limit = Math.min(Math.max(f.limit ?? 50, 1), 200);
  const from = f.from && DAY.test(f.from) ? f.from : null;
  const to = f.to && DAY.test(f.to) ? f.to : null;
  const q = nul(f.q?.trim().slice(0, 80));
  const { rows } = await sql`
    SELECT id, ts, actor, action, entity, entity_id, label, detail, ip, device
    FROM audit_log
    WHERE (${from}::text IS NULL OR ts >= (${from}::date)::timestamp AT TIME ZONE 'Europe/Zurich')
      AND (${to}::text IS NULL OR ts < ((${to}::date + 1))::timestamp AT TIME ZONE 'Europe/Zurich')
      AND (${nul(f.actor)}::text IS NULL OR actor = ${nul(f.actor)})
      AND (${nul(f.entity)}::text IS NULL OR entity = ${nul(f.entity)})
      AND (${nul(f.action)}::text IS NULL OR action = ${nul(f.action)})
      AND (${q}::text IS NULL OR strpos(lower(coalesce(label, '') || ' ' || coalesce(detail, '') || ' ' || coalesce(actor, '')), lower(${q})) > 0)
      AND (NOT ${f.critical === true}::boolean OR action IN ('delete', 'login_failed') OR entity IN ('user', 'settings'))
      AND (${f.before ?? null}::bigint IS NULL OR id < ${f.before ?? null})
    ORDER BY id DESC
    LIMIT ${limit + 1};
  `;
  const entries: AuditEntry[] = rows.slice(0, limit).map((r: any) => ({
    id: Number(r.id),
    ts: (r.ts instanceof Date ? r.ts : new Date(r.ts)).toISOString(),
    actor: r.actor,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    label: r.label,
    detail: r.detail,
    ip: r.ip,
    device: r.device,
  }));
  return { entries, hasMore: rows.length > limit };
}

/** Für die Filterauswahl: alle vorkommenden Personen, Anzahl und ältester Eintrag. */
export async function auditFacets(): Promise<{ actors: string[]; total: number; oldest: string | null; retentionDays: number }> {
  await ensureAuditTable();
  const a = await sql`SELECT DISTINCT actor FROM audit_log WHERE actor IS NOT NULL ORDER BY actor;`;
  const t = await sql`SELECT COUNT(*)::int AS n, MIN(ts) AS oldest FROM audit_log;`;
  const oldest = t.rows[0].oldest;
  return {
    actors: a.rows.map((r: any) => r.actor as string),
    total: Number(t.rows[0].n),
    oldest: oldest ? (oldest instanceof Date ? oldest : new Date(oldest)).toISOString() : null,
    retentionDays: RETENTION_DAYS,
  };
}
