import { test, expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";
import { ADMIN, apiLogin, createVia, loginUi, removeVia, uniq } from "./helpers";

// Protokoll (Admin → Protokoll, nur Super-Admins)

const DB = process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/doc_test";
type E = { id: number; ts: string; actor: string | null; action: string; entity: string; label: string | null; detail: string | null; ip: string | null; device: string | null };

async function audit(request: APIRequestContext, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const res = await request.get(`/api/admin/audit?${qs}`);
  expect(res.status()).toBe(200);
  return (await res.json()) as { entries: E[]; hasMore: boolean; facets?: { actors: string[]; total: number; oldest: string | null; retentionDays: number } };
}
const find = async (request: APIRequestContext, q: string, extra: Record<string, string | number> = {}) => (await audit(request, { q, limit: 200, ...extra })).entries;

async function db<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function newAdmin(request: APIRequestContext, playwright: { request: { newContext: (o: object) => Promise<APIRequestContext> } }, role: "admin" | "superadmin" = "admin") {
  const username = `u${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  const res = await request.post("/api/admin/users", { data: { username, name: "Test", role, password: "pw-12345" } });
  expect(res.status()).toBe(200);
  const ctx = await playwright.request.newContext({ baseURL: "http://localhost:3100" });
  expect((await ctx.post("/api/auth/login", { data: { username, password: "pw-12345" } })).status()).toBe(200);
  return { username, ctx };
}

test.describe("Protokoll", () => {
  test.describe.configure({ mode: "serial" });

  test("Nur Super-Admins: 401 ohne Login, 403 als normaler Admin, Menü nur für Super-Admins", async ({ request, playwright, page }) => {
    expect((await request.get("/api/admin/audit")).status()).toBe(401);
    await apiLogin(request);
    const { username, ctx } = await newAdmin(request, playwright);
    try {
      expect((await ctx.get("/api/admin/audit")).status()).toBe(403);
      // Normaler Admin sieht im Menü und auf der Übersicht keinen Eintrag «Protokoll»
      await page.goto("/admin/login");
      await page.getByPlaceholder("Benutzername").fill(username);
      await page.getByPlaceholder("Passwort").fill("pw-12345");
      await page.getByRole("button", { name: /Anmelden|Login/i }).click();
      await expect(page.getByText("Wähle einen Bereich")).toBeVisible();
      await expect(page.locator('a[href="/admin/log"]')).toHaveCount(0);
      await page.request.post("/api/auth/logout");
    } finally {
      await ctx.dispose();
      await request.delete(`/api/admin/users?username=${username}`);
    }
    // Super-Admin sieht ihn
    await loginUi(page);
    await expect(page.locator('a[href="/admin/log"]').first()).toBeVisible();
  });

  test("Anmeldungen: Erfolg mit Gerät und Adresse, Fehlversuch nur einmal, Abmeldung", async ({ page, request, playwright }) => {
    await apiLogin(request);
    const { username, ctx } = await newAdmin(request, playwright);
    try {
      // Anmeldung im Browser: Gerät wird erkannt
      await page.goto("/admin/login");
      await page.getByPlaceholder("Benutzername").fill(username);
      await page.getByPlaceholder("Passwort").fill("pw-12345");
      await page.getByRole("button", { name: /Anmelden|Login/i }).click();
      await page.waitForURL((u) => !u.pathname.includes("/admin/login"));
      const logins = (await find(request, username)).filter((e) => e.action === "login" && e.actor === username);
      expect(logins.length).toBeGreaterThanOrEqual(1);
      expect(logins[0].device).toMatch(/Chrome/);
      expect(logins[0].entity).toBe("login");
      expect(new Date(logins[0].ts).getTime()).toBeGreaterThan(Date.now() - 60_000);

      // Fehlversuch: gespeichert mit dem versuchten Namen, zweimal derselbe → ein Eintrag
      const ghost = `ghost${Date.now().toString(36)}`;
      for (let i = 0; i < 2; i++) expect((await ctx.post("/api/auth/login", { data: { username: ghost, password: "falsch" } })).status()).toBe(401);
      const failed = await find(request, ghost);
      expect(failed).toHaveLength(1);
      expect(failed[0]).toMatchObject({ action: "login_failed", label: ghost, actor: null });
      // Ein Fehlversuch mit einem Passwort darf das Passwort nie speichern
      expect(JSON.stringify(failed)).not.toContain("falsch");

      // Abmeldung
      expect((await ctx.post("/api/auth/logout")).status()).toBe(200);
      const outs = (await find(request, username)).filter((e) => e.action === "logout");
      expect(outs.length).toBe(1);
      expect(outs[0].actor).toBe(username);
    } finally {
      await ctx.dispose();
      await request.delete(`/api/admin/users?username=${username}`);
    }
  });

  test("Event: erstellen, ändern (welche Felder), Status, löschen – mit Person und Titel", async ({ request }) => {
    await apiLogin(request);
    const marker = uniq("Prot").replace(/\s/g, "");
    const ev = await createVia(request, "events", { title: `${marker} A`, date: "2098-05-01", time: "10:00", location: "Bern", status: "draft" });
    // ändern: Titel und Datum
    const get = async () => (await (await request.get("/api/admin/events")).json()).events.find((e: { id: string }) => e.id === ev.id);
    const first = await get();
    let res = await request.put("/api/admin/events", { data: { ...first, title: `${marker} B`, date: "2098-05-02" } });
    expect(res.status()).toBe(200);
    // Status
    const cur = await get();
    res = await request.put("/api/admin/events", { data: { ...cur, status: "published" } });
    expect(res.status()).toBe(200);
    // unverändert speichern
    const cur2 = await get();
    expect((await request.put("/api/admin/events", { data: cur2 })).status()).toBe(200);
    // Ungültige Änderung (Enddatum vor Start) wird abgelehnt und nicht protokolliert
    const before = (await find(request, marker)).length;
    expect((await request.put("/api/admin/events", { data: { ...cur2, endDate: "2098-04-01" } })).status()).toBe(400);
    expect((await find(request, marker)).length).toBe(before);
    // löschen
    expect((await request.delete(`/api/admin/events?id=${ev.id}`)).status()).toBe(200);

    const list = await find(request, marker); // neueste zuerst
    expect(list.map((e) => e.action)).toEqual(["delete", "update", "update", "update", "create"]);
    expect(list.every((e) => e.actor === ADMIN.username && e.entity === "event")).toBe(true);
    expect(list[4]).toMatchObject({ action: "create", label: `${marker} A` });
    expect(list[3].detail).toBe("Titel, Datum"); // Titel und Datum geändert
    expect(list[3].label).toBe(`${marker} B`);
    expect(list[2].detail).toContain("Status: Entwurf → Veröffentlicht");
    expect(list[1].detail).toBe("keine Änderung");
    expect(list[0]).toMatchObject({ action: "delete", label: `${marker} B` }); // Titel auch nach dem Löschen bekannt
    // Es werden keine Inhalte gespeichert: nur Feldnamen
    expect(list.map((e) => e.detail).join(" ")).not.toContain("Bern");
  });

  test("Weitere Bereiche: News, Partner, Rabattaktion, Vorstand, Benutzer, Einstellung, Reihenfolge", async ({ request, playwright }) => {
    await apiLogin(request);
    const m = uniq("Bereich").replace(/\s/g, "");
    const news = (await createVia(request, "news", { title: `${m} News`, summary: "s", blocks: [{ type: "text", text: "x" }] })) as Record<string, unknown> & { id: string };
    await request.put("/api/admin/news", { data: { ...news, summary: "neu", blocks: [{ type: "text", text: "y" }] } });
    await request.delete(`/api/admin/news?id=${news.id}`);
    const partner = (await (await request.post("/api/admin/partners", { data: { name: `${m} Partner`, category: "a" } })).json()).partner;
    await request.put("/api/admin/partners", { data: { ...partner, category: "b", discount: "10%" } });
    await request.delete(`/api/admin/partners?id=${partner.id}`);
    const action = (await (await request.post("/api/admin/actions", { data: { title: `${m} Aktion`, discount: "5%" } })).json()).action;
    await request.put("/api/admin/actions", { data: { ...action, discount: "7%" } });
    await request.delete(`/api/admin/actions?id=${action.id}`);
    const member = (await (await request.post("/api/admin/board", { data: { name: `${m} Mitglied`, role: "Kassier" } })).json()).member;
    await request.put("/api/admin/board", { data: { ...member, role: "Präsident" } });
    await request.delete(`/api/admin/board?id=${member.id}`);

    const by = async (entity: string) => (await find(request, m, { entity })).map((e) => `${e.action}:${e.detail ?? ""}`).reverse();
    expect(await by("news")).toEqual(["create:", "update:Kurztext, Inhalt", "delete:"]);
    expect(await by("partner")).toEqual(["create:", "update:Kategorie, Rabatt", "delete:"]);
    expect(await by("action")).toEqual(["create:", "update:Rabatt", "delete:"]);
    expect(await by("board")).toEqual(["create:", "update:Rolle", "delete:"]);

    // Benutzer: nie das Passwort, nur dass es geändert wurde
    const username = `${m}`.toLowerCase().slice(0, 18);
    expect((await request.post("/api/admin/users", { data: { username, name: "T", role: "admin", password: "geheim-98765" } })).status()).toBe(200);
    expect((await request.put("/api/admin/users", { data: { username, role: "superadmin", password: "neues-geheim-1" } })).status()).toBe(200);
    expect((await request.delete(`/api/admin/users?username=${username}`)).status()).toBe(200);
    const users = (await find(request, username, { entity: "user" })).reverse();
    expect(users.map((e) => `${e.action}:${e.detail}`)).toEqual(["create:Rolle: Admin", "update:Rolle: Admin → Super-Admin, Passwort geändert", "delete:Rolle: Super-Admin"]);
    expect(JSON.stringify(await audit(request, { limit: 200 }))).not.toMatch(/geheim-98765|neues-geheim-1/);

    // Wartungsmodus
    await request.put("/api/admin/settings", { data: { maintenance: true } });
    await request.put("/api/admin/settings", { data: { maintenance: false } });
    const settings = (await find(request, "Wartungsmodus", { entity: "settings" })).slice(0, 2);
    expect(settings.map((e) => e.detail)).toEqual(["ausgeschaltet", "eingeschaltet"]);

    // Reihenfolge
    const n1 = await createVia(request, "news", { title: `${m} R1`, summary: "s" });
    const n2 = await createVia(request, "news", { title: `${m} R2`, summary: "s" });
    expect((await request.patch("/api/admin/news", { data: { ids: [n2.id, n1.id] } })).status()).toBe(200);
    expect((await audit(request, { action: "reorder", entity: "news", limit: 5 })).entries[0]).toMatchObject({ actor: ADMIN.username, detail: expect.stringMatching(/Beiträge/) });
    await removeVia(request, "news", n1.id);
    await removeVia(request, "news", n2.id);
  });

  test("Bild verkleinern wird protokolliert", async ({ request }) => {
    await apiLogin(request);
    const name = `${uniq("img").replace(/\s/g, "")}.jpg`;
    const bytes = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 120, g: 90, b: 60 }, noise: { type: "gaussian", mean: 128, sigma: 40 } } }).blur(2.5).jpeg({ quality: 93 }).toBuffer();
    await request.post(`/api/e2e-blob?name=${encodeURIComponent(name)}`, { data: bytes, headers: { "content-type": "image/jpeg" } });
    const url = `/api/e2e-blob?name=${encodeURIComponent(name)}`;
    const ev = await createVia(request, "events", { title: uniq("Bildlog"), date: "2098-06-01", imageUrl: url });
    try {
      expect((await request.post("/api/admin/optimize-images", { data: { url } })).status()).toBe(200);
      const e = (await find(request, name.replace(".jpg", ""), { action: "optimize" }))[0];
      expect(e).toMatchObject({ entity: "image", actor: ADMIN.username });
      expect(e.detail).toMatch(/→/);
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Filter: Person, Bereich, Aktion, Text, Zeitraum, Nur Wichtiges", async ({ request, playwright }) => {
    await apiLogin(request);
    const bob = await newAdmin(request, playwright);
    const m = uniq("Filter").replace(/\s/g, "");
    try {
      const ev = await bob.ctx.post("/api/admin/events", { data: { title: `${m} von Bob`, date: "2098-07-01" } });
      const evId = (await ev.json()).event.id;
      const nw = await createVia(request, "news", { title: `${m} von Patrick`, summary: "s" });
      await bob.ctx.delete(`/api/admin/events?id=${evId}`);

      const all = await find(request, m);
      expect(all.map((e) => `${e.actor === bob.username ? "bob" : "patrick"}:${e.action}:${e.entity}`)).toEqual(["bob:delete:event", "patrick:create:news", "bob:create:event"]);
      expect((await find(request, m, { actor: bob.username })).map((e) => e.action)).toEqual(["delete", "create"]);
      expect((await find(request, m, { entity: "news" })).map((e) => e.entity)).toEqual(["news"]);
      expect((await find(request, m, { action: "create" })).map((e) => e.entity)).toEqual(["news", "event"]);
      expect((await find(request, m, { actor: bob.username, entity: "event", action: "delete" }))).toHaveLength(1);
      expect((await find(request, m.toUpperCase()))).toHaveLength(3); // Suche ohne Beachtung der Gross-/Kleinschreibung
      expect((await find(request, `${m} von bob`))).toHaveLength(2);
      expect((await find(request, bob.username)).length).toBeGreaterThanOrEqual(2); // Suche findet auch die Person

      // Nur Wichtiges: Löschen (und Fehlversuche, Benutzer, Einstellungen), keine normalen Änderungen
      const crit = await audit(request, { q: m, critical: 1 });
      expect(crit.entries.map((e) => e.action)).toEqual(["delete"]);

      // Zeitraum (Schweizer Tage)
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());
      const plus = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date(Date.now() + n * 86400000));
      expect((await find(request, m, { from: today, to: today }))).toHaveLength(3);
      expect((await find(request, m, { from: plus(1) }))).toHaveLength(0);
      expect((await find(request, m, { to: plus(-1) }))).toHaveLength(0);
      expect((await find(request, m, { from: "kaputt" }))).toHaveLength(3); // ungültiges Datum wird ignoriert

      // Filterauswahl enthält die Person
      expect((await audit(request, { limit: 1 })).facets!.actors).toContain(bob.username);
      await removeVia(request, "news", nw.id);
    } finally {
      await bob.ctx.dispose();
      await request.delete(`/api/admin/users?username=${bob.username}`);
    }
  });

  test("Blättern: viele Einträge in Seiten, ohne Doppelte, neueste zuerst", async ({ request }) => {
    await apiLogin(request);
    const actor = `bulk${Date.now().toString(36)}`;
    await db((c) => c.query(`INSERT INTO audit_log (actor, action, entity, label, ts) SELECT $1, 'update', 'event', 'Eintrag ' || g, now() - (g || ' seconds')::interval FROM generate_series(1, 130) g`, [actor]));
    const p1 = await audit(request, { actor, limit: 50 });
    expect(p1.entries).toHaveLength(50);
    expect(p1.hasMore).toBe(true);
    expect(p1.facets).toBeDefined();
    const p2 = await audit(request, { actor, limit: 50, before: p1.entries[49].id });
    const p3 = await audit(request, { actor, limit: 50, before: p2.entries[49].id });
    expect(p2.facets).toBeUndefined(); // Filterauswahl nur beim ersten Abruf
    expect(p2.entries).toHaveLength(50);
    expect(p3.entries).toHaveLength(30);
    expect(p3.hasMore).toBe(false);
    const ids = [...p1.entries, ...p2.entries, ...p3.entries].map((e) => e.id);
    expect(new Set(ids).size).toBe(130);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });

  test("Logrotate: Einträge älter als 3 Monate werden gelöscht, jüngere bleiben", async ({ request }) => {
    await apiLogin(request);
    const actor = `rot${Date.now().toString(36)}`;
    await db((c) => c.query(`INSERT INTO audit_log (actor, action, entity, label, ts) VALUES ($1,'update','event','alt 120 Tage', now() - interval '120 days'), ($1,'update','event','alt 91 Tage', now() - interval '91 days'), ($1,'update','event','jung 89 Tage', now() - interval '89 days'), ($1,'update','event','jung 5 Tage', now() - interval '5 days')`, [actor]));
    // Eine normale Aktion schreibt einen Eintrag und räumt dabei auf
    const ev = await createVia(request, "events", { title: uniq("Rotation"), date: "2098-08-01" });
    await removeVia(request, "events", ev.id);
    const left = (await find(request, "", { actor })).map((e) => e.label).sort();
    expect(left).toEqual(["jung 5 Tage", "jung 89 Tage"]);
    const facets = (await audit(request, { limit: 1 })).facets!;
    expect(facets.retentionDays).toBe(90);
    expect(new Date(facets.oldest!).getTime()).toBeGreaterThan(Date.now() - 91 * 86400000);
  });

  test("Oberfläche: gruppiert nach Tag, Sätze, Filter, Mehr anzeigen, Smartphone", async ({ page, request }) => {
    await apiLogin(request);
    const m = uniq("Seite").replace(/\s/g, "");
    const ev = await createVia(request, "events", { title: `${m} Event`, date: "2098-09-01" });
    const full = (await (await request.get("/api/admin/events")).json()).events.find((e: { id: string }) => e.id === ev.id);
    await request.put("/api/admin/events", { data: { ...full, date: "2098-09-02" } });
    await request.delete(`/api/admin/events?id=${ev.id}`);
    const bulk = `ui${Date.now().toString(36)}`;
    await db((c) => c.query(`INSERT INTO audit_log (actor, action, entity, label, ts) SELECT $1, 'create', 'news', 'Beitrag ' || g, now() - (g || ' minutes')::interval FROM generate_series(1, 70) g`, [bulk]));

    await loginUi(page);
    await page.goto("/admin/log");
    await expect(page.getByRole("heading", { name: "Protokoll" })).toBeVisible();
    await expect(page.getByText(/nach 3 Monaten automatisch gelöscht/)).toBeVisible();
    await expect(page.getByRole("region", { name: "Heute" })).toBeVisible();

    // Suche: Sätze in Alltagssprache, neueste zuerst
    await page.getByRole("searchbox", { name: "Suchen" }).fill(m);
    const rows = page.locator("li[data-action]");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText(`patrick hat das Event «${m} Event» gelöscht`);
    await expect(rows.nth(1)).toContainText("hat das Event");
    await expect(rows.nth(1)).toContainText("Geändert: Datum");
    await expect(rows.nth(2)).toContainText(`patrick hat das Event «${m} Event» erstellt`);
    await expect(rows.nth(0)).toHaveAttribute("data-action", "delete");

    // Weitere Filter
    await page.getByRole("combobox", { name: "Aktion" }).selectOption("create");
    await expect(rows).toHaveCount(1);
    await page.getByRole("button", { name: "Filter zurücksetzen" }).click();
    await page.getByRole("checkbox", { name: "Nur Wichtiges" }).check();
    await page.getByRole("searchbox", { name: "Suchen" }).fill(m);
    await expect(rows).toHaveCount(1); // nur das Löschen
    await page.getByRole("button", { name: "Filter zurücksetzen" }).click();

    // Blättern über die Oberfläche
    await page.getByRole("combobox", { name: "Person" }).selectOption(bulk);
    await expect(rows).toHaveCount(50);
    await page.getByRole("button", { name: "Mehr anzeigen" }).click();
    await expect(rows).toHaveCount(70);
    await expect(page.getByRole("button", { name: "Mehr anzeigen" })).toHaveCount(0);

    // Smartphone: kein seitliches Scrollen
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
});
