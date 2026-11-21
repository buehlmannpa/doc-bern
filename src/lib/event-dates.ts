// Datums-Hilfen für den Zeitstrahl der Events.
// Alle Daten sind reine Kalendertage ("YYYY-MM-DD"), ohne Uhrzeit und ohne Zeitzonen-Rechnerei.
// "Heute" wird in Schweizer Zeit bestimmt (der Server läuft in UTC).

type Ranged = { date: string; endDate?: string | null };

/** Heutiges Datum in Schweizer Zeit als "YYYY-MM-DD". */
export function zurichToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Erster Tag des Monats von `date` ("2026-11-21" -> "2026-11-01"). */
export function monthStartOf(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** Letzter Tag des Events: das Enddatum, sonst der Starttag. */
export function lastDay(e: Ranged): string {
  return e.endDate && e.endDate > e.date ? e.endDate : e.date;
}

export function isMultiDay(e: Ranged): boolean {
  return Boolean(e.endDate && e.endDate > e.date);
}

/** Ist das Event vor `today` zu Ende? (Ein laufendes mehrtägiges Event gilt nicht als vorbei.) */
export function isOver(e: Ranged, today: string): boolean {
  return lastDay(e) < today;
}

function utc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  utc(date).toLocaleDateString("de-CH", { ...opts, timeZone: "UTC" });

export const weekdayShort = (date: string) => fmt(date, { weekday: "short" }).replace(".", "");
export const dayNumber = (date: string) => String(Number(date.slice(8, 10)));
export const monthShort = (date: string) => fmt(date, { month: "short" }).replace(".", "");
export const monthLong = (key: string) => fmt(`${key}-01`, { month: "long" });

/** Ausgeschriebenes Datum: "Sa, 16. Mai 2026" oder "Sa, 16. – So, 17. Mai 2026" oder "Fr, 30. Okt – Mo, 2. Nov 2026". */
export function formatRange(e: Ranged): string {
  if (!isMultiDay(e)) return fmt(e.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  const end = e.endDate as string;
  const sameMonth = e.date.slice(0, 7) === end.slice(0, 7);
  const sameYear = e.date.slice(0, 4) === end.slice(0, 4);
  const a = fmt(e.date, { weekday: "short", day: "numeric", ...(sameMonth ? {} : { month: "short" }), ...(sameYear ? {} : { year: "numeric" }) });
  const b = fmt(end, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  return `${a} – ${b}`;
}

export type MonthGroup<T> = { key: string; year: number; label: string; events: T[] };

/**
 * Ordnet Events automatisch Monaten zu (nach dem Starttag). Ein Event, das schon vor `floorMonth`
 * begonnen hat, aber noch läuft, wird im Monat `floorMonth` (dem aktuellen Monat) eingeordnet.
 * Monate ohne Events entstehen nicht. Reihenfolge der Monate: `direction` (aufsteigend oder absteigend),
 * innerhalb eines Monats immer nach Datum und Zeit aufsteigend.
 */
export function groupByMonth<T extends Ranged & { time?: string }>(
  events: T[],
  opts: { floorMonth?: string; direction?: "asc" | "desc" } = {}
): MonthGroup<T>[] {
  const floor = opts.floorMonth ? opts.floorMonth.slice(0, 7) : null;
  const map = new Map<string, T[]>();
  for (const e of events) {
    let key = e.date.slice(0, 7);
    if (floor && key < floor) key = floor;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  const keys = [...map.keys()].sort();
  if (opts.direction === "desc") keys.reverse();
  return keys.map((key) => ({
    key,
    year: Number(key.slice(0, 4)),
    label: `${monthLong(key)} ${key.slice(0, 4)}`,
    events: map.get(key)!.sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))),
  }));
}
