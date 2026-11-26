import { unstable_cache } from "next/cache";
import { hostettlerInfo } from "@/data/content";

// Öffnungszeiten von hostettler moto ag – Bern. Quelle ist die öffentliche Seite des Händlers
// (hostettler-moto.ch/bern): Sie wird von hostettler gepflegt und ändert sich mit den Jahreszeiten, Feiertagen und
// Betriebsferien. Die App liest sie höchstens alle 6 Stunden und zeigt immer den aktuellen Stand.
// Lässt sich die Seite nicht lesen oder hat sie sich verändert, bleiben die zuletzt bekannten Zeiten stehen (Hinweis auf der Seite).

export type HoursDay = { day: string; time: string };
export type Closure = { notice: string; from: string | null; until: string | null }; // Betriebsferien (Tage als YYYY-MM-DD)
export type Hours = {
  shop: HoursDay[];
  workshop: HoursDay[];
  closure: Closure | null;
  source: "live" | "fallback";
  workshopSource: "live" | "fallback";
  fetchedAt: string | null;
};

const SOURCE_URL = process.env.HOSTETTLER_HOURS_URL || "https://www.hostettler-moto.ch/bern/";
const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MONTHS: Record<string, number> = { januar: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };

function text(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, " · ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&ndash;|&#8211;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/\s+/g, " ")
    .replace(/ · $/, "")
    .trim();
}

// "09:00 – 12:00 · 13:00 – 18:00" einheitlich schreiben
function normTime(t: string): string {
  return t
    .replace(/\s*Uhr/g, "")
    .replace(/\s*\/\s*/g, " · ")
    .replace(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g, "$1 – $2")
    .replace(/\s+/g, " ")
    .trim();
}

const pad = (n: number) => String(n).padStart(2, "0");

function parseClosure(html: string): Closure | null {
  const m = html.match(/Betriebsferien:?\s*(?:<\/strong>)?\s*([^<]{3,160})/i);
  if (!m) return null;
  const raw = text(m[1]);
  const dates = [...raw.matchAll(/(\d{1,2})\.\s*([A-Za-zäöüÄÖÜ]+)\s*(\d{4})?/g)];
  let from: string | null = null;
  let until: string | null = null;
  if (dates.length >= 2) {
    const mon = (s: string) => MONTHS[s.toLowerCase()];
    const [a, b] = [dates[0], dates[dates.length - 1]];
    const yEnd = Number(b[3] ?? new Date().getFullYear());
    const yStart = Number(a[3] ?? yEnd);
    if (mon(a[2]) && mon(b[2])) {
      from = `${yStart}-${pad(mon(a[2]))}-${pad(Number(a[1]))}`;
      until = `${yEnd}-${pad(mon(b[2]))}-${pad(Number(b[1]))}`;
    }
  }
  return { notice: `Betriebsferien: ${raw}`, from, until };
}

function parseWorkshop(html: string): HoursDay[] | null {
  const i = html.search(/ANNAHME\s*\/\s*ABHOLUNG\s*WERKSTATT/i);
  if (i < 0) return null;
  const after = html.slice(i);
  const end = after.indexOf("</p>"); // Ende der Überschrift, danach folgt der Absatz mit den Zeiten
  const m = end >= 0 ? after.slice(end + 4).match(/<p[^>]*>([\s\S]*?)<\/p>/) : null;
  const block = m ? m[1] : null;
  if (!block) return null;
  const lines = block.split(/<br\s*\/?>/i).map(text).filter(Boolean);
  const out = new Map<string, string>();
  for (const line of lines) {
    const m = line.match(/^([A-Za-zäöü]+)(?:\s*[–-]\s*([A-Za-zäöü]+))?\s*:\s*(.+)$/);
    if (!m) continue;
    const a = DAYS.indexOf(m[1]);
    const b = m[2] ? DAYS.indexOf(m[2]) : a;
    if (a < 0 || b < a) continue;
    const time = /geschlossen/i.test(m[3]) ? "Geschlossen" : normTime(m[3]);
    for (let d = a; d <= b; d++) out.set(DAYS[d], time);
  }
  if (out.size !== 7) return null;
  return DAYS.map((day) => ({ day, time: out.get(day)! }));
}

/** Liest die Öffnungszeiten aus der Händler-Seite. null = Seite sieht nicht wie erwartet aus. */
export function parseHostettlerHours(html: string): { shop: HoursDay[]; workshop: HoursDay[] | null; closure: Closure | null } | null {
  const rows = [...html.matchAll(/<tr[^>]*hmoto-opening-hours__row[^>]*>\s*<th[^>]*>([^<]+)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g)];
  if (rows.length < 7) return null;
  const shop: HoursDay[] = [];
  for (const r of rows.slice(0, 7)) {
    const day = text(r[1]);
    const t = text(r[2]);
    if (!DAYS.includes(day) || !t) return null;
    shop.push({ day, time: /geschlossen/i.test(t) ? "Geschlossen" : normTime(t) });
  }
  if (shop.map((d) => d.day).join() !== DAYS.join()) return null; // Reihenfolge Montag bis Sonntag erwartet
  if (!shop.every((d) => d.time === "Geschlossen" || /\d{1,2}:\d{2}/.test(d.time))) return null;
  return { shop, workshop: parseWorkshop(html), closure: parseClosure(html) };
}

async function fetchLive(): Promise<Hours> {
  const res = await fetch(SOURCE_URL, {
    headers: { "user-agent": "DOC-Bern-App/1.0 (+https://doc-bern.ch)", accept: "text/html" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Händler-Seite antwortet mit ${res.status}`);
  const parsed = parseHostettlerHours(await res.text());
  if (!parsed) throw new Error("Händler-Seite hat sich verändert (Öffnungszeiten nicht gefunden)");
  return {
    shop: parsed.shop,
    workshop: parsed.workshop ?? hostettlerInfo.hoursWorkshop,
    closure: parsed.closure,
    source: "live",
    workshopSource: parsed.workshop ? "live" : "fallback",
    fetchedAt: new Date().toISOString(),
  };
}

// Erfolgreiche Antworten 6 Stunden zwischenspeichern. Fehler werden nie zwischengespeichert (unstable_cache speichert keine Fehler).
const cached = unstable_cache(fetchLive, ["hostettler-hours-v1"], { revalidate: 6 * 60 * 60, tags: ["hostettler-hours"] });

let lastFailure = 0;

export async function getHostettlerHours(): Promise<Hours> {
  const fallback: Hours = { shop: hostettlerInfo.hoursShop, workshop: hostettlerInfo.hoursWorkshop, closure: null, source: "fallback", workshopSource: "fallback", fetchedAt: null };
  // Nach einem Fehler 2 Minuten lang nicht erneut versuchen (die Händler-Seite nicht belasten, Seite bleibt schnell)
  if (!process.env.HOSTETTLER_HOURS_URL && Date.now() - lastFailure < 2 * 60 * 1000) return fallback;
  try {
    // Im Testlauf (eigene Quelle) nie zwischenspeichern, damit jede Änderung der Testseite sofort sichtbar ist
    return process.env.HOSTETTLER_HOURS_URL ? await fetchLive() : await cached();
  } catch (e) {
    lastFailure = Date.now();
    console.error("Öffnungszeiten konnten nicht gelesen werden:", (e as Error).message);
    return fallback;
  }
}

/** Heute geschlossen wegen Betriebsferien? (Am ersten Tag gelten die normalen Zeiten, der Hinweis bleibt.) */
export function isClosureToday(c: Closure | null, today: string): boolean {
  return Boolean(c?.from && c.until && today > c.from && today <= c.until);
}
