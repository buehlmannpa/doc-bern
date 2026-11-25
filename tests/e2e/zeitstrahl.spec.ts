import { test, expect } from "@playwright/test";
import { lastDay, zurichToday } from "../../src/lib/event-dates";
import { apiLogin, createVia, removeVia, uniq } from "./helpers";

// Events-Zeitstrahl (läuft auf Desktop und Smartphone)

const today = zurichToday();
const [Y, M] = today.split("-").map(Number);
const pad = (n: number) => String(n).padStart(2, "0");

/** Tag `day` (1-28) des Monats, der `offset` Monate vom aktuellen Monat entfernt ist. */
function monthDay(offset: number, day: number): string {
  const d = new Date(Date.UTC(Y, M - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(day)}`;
}
const monthKey = (offset: number) => monthDay(offset, 1).slice(0, 7);
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}

test.describe("Zeitstrahl", () => {
  test("Aktueller Monat zuoberst, kommende Monate darunter, leere Monate fehlen", async ({ page, request }) => {
    await apiLogin(request);
    const ids: string[] = [];
    const t = { now: uniq("Jetzt"), later: uniq("Später"), far: uniq("Weit") };
    try {
      ids.push((await createVia(request, "events", { title: t.far, date: monthDay(15, 5) })).id);
      ids.push((await createVia(request, "events", { title: t.later, date: monthDay(13, 20) })).id);
      ids.push((await createVia(request, "events", { title: t.now, date: monthDay(0, 28) })).id);
      await page.goto("/events");
      const months = await page.locator("section[data-month]").evaluateAll((els) => els.map((e) => e.getAttribute("data-month")));
      expect(months[0]).toBe(monthKey(0)); // aktueller Monat zuoberst
      expect(months).toEqual([...months].sort()); // dann aufsteigend
      expect(months).toContain(monthKey(13));
      expect(months).toContain(monthKey(15));
      expect(months).not.toContain(monthKey(14)); // leerer Monat dazwischen wird ausgeblendet
      // Events sind automatisch dem richtigen Monat zugeordnet
      await expect(page.locator(`section[data-month="${monthKey(13)}"]`).getByText(t.later)).toBeVisible();
      await expect(page.locator(`section[data-month="${monthKey(15)}"]`).getByText(t.far)).toBeVisible();
      await expect(page.locator(`section[data-month="${monthKey(0)}"]`).getByText(t.now)).toBeVisible();
    } finally {
      for (const id of ids) await removeVia(request, "events", id);
    }
  });

  test("Events eines Monats stehen untereinander auf voller Breite", async ({ page, request }) => {
    await apiLogin(request);
    const ids: string[] = [];
    const a = uniq("Erster");
    const b = uniq("Zweiter");
    try {
      ids.push((await createVia(request, "events", { title: a, date: monthDay(20, 3) })).id);
      ids.push((await createVia(request, "events", { title: b, date: monthDay(20, 9) })).id);
      await page.goto("/events");
      const group = page.locator(`section[data-month="${monthKey(20)}"]`);
      const boxA = (await group.locator("article", { hasText: a }).boundingBox())!;
      const boxB = (await group.locator("article", { hasText: b }).boundingBox())!;
      expect(boxB.y).toBeGreaterThanOrEqual(boxA.y + boxA.height - 1); // untereinander, nicht nebeneinander
      expect(Math.abs(boxA.x - boxB.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(boxA.width - boxB.width)).toBeLessThanOrEqual(1);
      const viewport = page.viewportSize()!;
      expect(boxA.width).toBeGreaterThan(viewport.width * 0.55); // nutzt die Breite
      // Reihenfolge im Monat nach Datum
      expect(boxA.y).toBeLessThan(boxB.y);
    } finally {
      for (const id of ids) await removeVia(request, "events", id);
    }
  });

  test("Auf- und Zuklappen funktioniert im Zeitstrahl, es ist immer nur ein Event offen", async ({ page, request }) => {
    await apiLogin(request);
    const ids: string[] = [];
    const a = uniq("Offen A");
    const b = uniq("Offen B");
    try {
      ids.push((await createVia(request, "events", { title: a, date: monthDay(21, 1), description: "Text A" })).id);
      ids.push((await createVia(request, "events", { title: b, date: monthDay(21, 2), description: "Text B" })).id);
      await page.goto("/events");
      const cardA = page.locator("article", { hasText: a });
      const cardB = page.locator("article", { hasText: b });
      await cardA.locator("button[aria-expanded]").click();
      await expect(cardA.getByText("Text A")).toBeVisible();
      await cardB.locator("button[aria-expanded]").click();
      await expect(cardB.getByText("Text B")).toBeVisible();
      await expect(cardA.getByText("Text A")).toHaveCount(0);
      await cardB.locator("button[aria-expanded]").click();
      await expect(cardB.getByText("Text B")).toHaveCount(0);
    } finally {
      for (const id of ids) await removeVia(request, "events", id);
    }
  });

  test("Mehrtägiges Event: Bereich im Tages-Zeichen, im Startmonat, Kalender ganztägig", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Wochenende");
    const start = monthDay(22, 10);
    const end = monthDay(22, 12);
    const ev = await createVia(request, "events", { title, date: start, endDate: end, time: "08:00", location: "Lugano" });
    try {
      await page.goto("/events");
      const card = page.locator(`section[data-month="${monthKey(22)}"] article`, { hasText: title });
      await expect(card).toBeVisible();
      await expect(card).toContainText("10–12");
      await card.locator("button[aria-expanded]").click();
      const [download] = await Promise.all([page.waitForEvent("download"), card.getByRole("button", { name: /Zum Kalender hinzufügen/ }).click()]);
      const ics = (await (await import("node:fs/promises")).readFile((await download.path())!, "utf8")).replace(/\r\n/g, "\n");
      expect(ics).toContain(`DTSTART;VALUE=DATE:${start.replace(/-/g, "")}`);
      expect(ics).toContain(`DTEND;VALUE=DATE:${addDays(end, 1).replace(/-/g, "")}`); // Ende = Tag nach dem letzten Tag
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Noch laufendes Event aus dem Vormonat erscheint im aktuellen Monat", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Laufend");
    const ev = await createVia(request, "events", { title, date: monthDay(-1, 27), endDate: monthDay(0, 1) });
    try {
      await page.goto("/events");
      await expect(page.locator(`section[data-month="${monthKey(0)}"] article`, { hasText: title })).toBeVisible();
      await expect(page.locator(`section[data-month="${monthKey(-1)}"]`)).toHaveCount(0);
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Vergangene Events: Jahre eingeklappt, Inhalt wird erst beim Aufklappen geladen", async ({ page, request }) => {
    await apiLogin(request);
    const ids: string[] = [];
    const t1 = uniq("Alt A");
    const t2 = uniq("Alt B");
    try {
      ids.push((await createVia(request, "events", { title: t1, date: "2020-03-14" })).id);
      ids.push((await createVia(request, "events", { title: t2, date: "2020-09-05" })).id);
      const pastCalls: string[] = [];
      page.on("request", (r) => { if (r.url().includes("/api/events/past")) pastCalls.push(r.url()); });
      await page.goto("/events");
      await expect(page.getByText("Vergangene Events", { exact: true })).toBeVisible();
      await expect(page.getByText(t1)).toHaveCount(0); // eingeklappt: nicht im Dokument, nichts nachgeladen
      expect(pastCalls).toHaveLength(0);

      const year = page.getByRole("button", { name: /^2020/ });
      await expect(year).toHaveAttribute("aria-expanded", "false");
      await expect(year).toContainText("2 Events");
      await year.click();
      await expect(page.getByText(t1)).toBeVisible();
      await expect(page.getByText(t2)).toBeVisible();
      expect(pastCalls).toHaveLength(1);
      // Monate des alten Jahres: neueste zuerst
      const months = await page.locator("#past-2020 section[data-month]").evaluateAll((els) => els.map((e) => e.getAttribute("data-month")));
      expect(months).toEqual(["2020-09", "2020-03"]);
      // Alte Events lassen sich aufklappen
      await page.locator("article", { hasText: t2 }).locator("button[aria-expanded]").click();
      await expect(page.locator("article", { hasText: t2 }).getByText(/Kalender/i).first()).toBeVisible();
      // Zuklappen und wieder öffnen: kein zweiter Abruf
      await year.click();
      await expect(page.getByText(t1)).toHaveCount(0);
      await year.click();
      await expect(page.getByText(t1)).toBeVisible();
      expect(pastCalls).toHaveLength(1);
    } finally {
      for (const id of ids) await removeVia(request, "events", id);
    }
  });

  test("Event vom Vormonat steht bei den vergangenen Events, nicht im Zeitstrahl", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Vormonat");
    const date = monthDay(-1, 10);
    const ev = await createVia(request, "events", { title, date });
    try {
      await page.goto("/events");
      await expect(page.locator("[data-testid=timeline]").first().getByText(title)).toHaveCount(0);
      await page.getByRole("button", { name: new RegExp(`^${date.slice(0, 4)}`) }).click();
      await expect(page.getByText(title)).toBeVisible();
      await expect(page.locator(`section[data-month="${date.slice(0, 7)}"]`).last()).toBeVisible();
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Schnittstelle für vergangene Jahre: Prüfung, nur veröffentlicht, nur Vergangenes", async ({ request }) => {
    expect((await request.get("/api/events/past?year=abc")).status()).toBe(400);
    expect((await request.get("/api/events/past")).status()).toBe(400);
    expect((await request.get("/api/events/past?year=1800")).status()).toBe(400);
    await apiLogin(request);
    const draft = await createVia(request, "events", { title: uniq("Alter Entwurf"), date: "2019-04-04", status: "draft" });
    const future = await createVia(request, "events", { title: uniq("Zukunft"), date: monthDay(30, 4) });
    const published = await createVia(request, "events", { title: uniq("Alt veröffentlicht"), date: "2019-05-05" });
    try {
      const anon = await (await request.get(`/api/events/past?year=2019`)).json();
      const ids = anon.events.map((e: { id: string }) => e.id);
      expect(ids).toContain(published.id);
      expect(ids).not.toContain(draft.id);
      const futureYear = Number(monthDay(30, 4).slice(0, 4));
      const f = await (await request.get(`/api/events/past?year=${futureYear}`)).json();
      expect(f.events.map((e: { id: string }) => e.id)).not.toContain(future.id);
    } finally {
      for (const e of [draft, future, published]) await removeVia(request, "events", e.id);
    }
  });

  test("Startseite zeigt ein laufendes mehrtägiges Event weiterhin als nächstes Event", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Läuft gerade");
    const ev = await createVia(request, "events", { title, date: addDays(today, -1), endDate: addDays(today, 2) });
    try {
      expect(lastDay({ date: addDays(today, -1), endDate: addDays(today, 2) })).toBe(addDays(today, 2));
      await page.goto("/");
      await expect(page.getByText(title)).toBeVisible();
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Klick auf ein Event in einem Jahr löst keinen Druck-Effekt auf dem ganzen Jahr aus", async ({ page, request, isMobile }) => {
    test.skip(isMobile, "Mausdruck nur am Desktop prüfbar");
    await apiLogin(request);
    const title = uniq("Druck");
    const ev = await createVia(request, "events", { title, date: "2016-04-04" });
    try {
      await page.goto("/events");
      await page.getByRole("button", { name: /^2016/ }).click();
      const wrapper = page.locator("#past-2016").locator("xpath=..");
      await expect(wrapper).toHaveClass(/no-press/);
      const btn = page.locator("article", { hasText: title }).locator("button[aria-expanded]");
      const box = (await btn.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const transform = await wrapper.evaluate((el) => getComputedStyle(el).transform);
      await page.mouse.up();
      expect(transform).toBe("none"); // das Jahr bleibt unverändert, solange man auf das Event drückt
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Aufgeklapptes Event in einem Jahr: Kalender-Knopf hat genug Platz (auch am Smartphone)", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Platz");
    const ev = await createVia(request, "events", { title, date: "2015-05-05", description: "Beschreibung" });
    try {
      await page.goto("/events");
      await page.getByRole("button", { name: /^2015/ }).click();
      const card = page.locator("article", { hasText: title });
      await card.locator("button[aria-expanded]").click();
      const btn = card.getByRole("button", { name: /Zum Kalender hinzufügen/ });
      await expect(btn).toBeVisible();
      const box = (await btn.boundingBox())!;
      const card_ = (await card.boundingBox())!;
      expect(box.height).toBeLessThanOrEqual(56); // höchstens zwei Zeilen
      expect(box.width).toBeGreaterThanOrEqual(Math.min(220, card_.width * 0.6));
      // Am Smartphone nutzt die Karte die Breite: wenig Abstand links/rechts zum Jahresrahmen
      if (page.viewportSize()!.width < 500) {
        const wrapper = (await page.locator("#past-2015").boundingBox())!;
        expect(wrapper.width - card_.width).toBeLessThan(56);
      }
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });
});
