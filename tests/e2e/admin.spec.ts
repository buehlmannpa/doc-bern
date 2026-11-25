import { test, expect } from "@playwright/test";
import { ADMIN, PNG, apiLogin, createVia, loginUi, modal, mockStorage, removeVia, uniq } from "./helpers";

// Admin-Bereich (nur Desktop)

test.describe("Anmeldung und Schutz", () => {
  test("Ohne Login wird /admin auf die Anmeldung umgeleitet", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("Falsches Passwort wird abgelehnt", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder("Benutzername").fill(ADMIN.username);
    await page.getByPlaceholder("Passwort").fill("falsch");
    await page.getByRole("button", { name: /Anmelden|Login/i }).click();
    await expect(page.getByText(/falsch/i)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("Richtiger Login zeigt das Dashboard mit allen Bereichen", async ({ page }) => {
    await loginUi(page);
    for (const [label, href] of [["Events", "/admin/events"], ["News", "/admin/news"], ["Rabattaktion", "/admin/actions"], ["Partner", "/admin/partners"], ["Vorstand", "/admin/board"]]) {
      await expect(page.locator(`a.glass-card[href="${href}"]`)).toContainText(label);
    }
  });

  test("Admin-Schnittstellen verlangen eine Anmeldung", async ({ request }) => {
    for (const path of ["news", "events", "partners", "actions", "board", "users", "settings"]) {
      const res = await request.get(`/api/admin/${path}`, { maxRedirects: 0 });
      expect(res.status(), path).toBe(401);
    }
    const post = await request.post("/api/admin/news", { data: { title: "x" } });
    expect(post.status()).toBe(401);
    const upload = await request.post("/api/admin/upload-file", { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: PNG } } });
    expect(upload.status()).toBe(401);
    const discard = await request.post("/api/admin/discard-uploads", { data: { urls: [] } });
    expect(discard.status()).toBe(401);
  });
});

test.describe("News im Admin", () => {
  test("Beitrag mit Bausteinen anlegen, für Mitglieder sehen und löschen", async ({ page }) => {
    await loginUi(page);
    await mockStorage(page);
    const title = uniq("UI News");
    await page.goto("/admin/news");
    await page.getByRole("button", { name: /Neu/ }).first().click();
    const m = modal(page);
    await m.locator("input").first().fill(title);

    await m.getByRole("button", { name: "Text", exact: true }).click();
    await m.locator('[aria-label^="Baustein 1: Text"] textarea').fill("Hallo **Club**");
    await m.getByRole("button", { name: "Tabelle", exact: true }).click();
    await m.getByLabel("Zeile 1, Spalte 1").fill("Zeit");
    await m.getByLabel("Zeile 1, Spalte 2").fill("Was");
    await m.getByLabel("Zeile 2, Spalte 1").fill("09:00");
    await m.getByRole("button", { name: "Hinweis", exact: true }).click();
    await m.locator('[aria-label^="Baustein 3: Hinweis"] textarea').fill("Anmeldeschluss beachten");
    await m.getByRole("button", { name: "Button", exact: true }).click();
    const btn = m.locator('[aria-label^="Baustein 4: Button"] input');
    await btn.nth(0).fill("Jetzt anmelden");
    await btn.nth(1).fill("https://example.org/a");
    await m.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.locator("div.fixed.inset-0")).toHaveCount(0);
    await expect(page.getByText(title)).toBeVisible();

    // Für Mitglieder sichtbar
    await page.goto("/newsletter");
    const card = page.locator("article:visible", { hasText: title });
    await card.locator("button[aria-expanded]").click();
    await expect(card.getByText("Anmeldeschluss beachten")).toBeVisible();
    await expect(card.locator("table")).toHaveCount(1);
    await expect(card.getByRole("link", { name: /Jetzt anmelden/ })).toHaveAttribute("href", "https://example.org/a");

    // Löschen
    await page.goto("/admin/news");
    page.once("dialog", (d) => d.accept());
    await page.locator("div.glass-card", { hasText: title }).getByRole("button", { name: "Löschen" }).click();
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("Button mit unsicherem Link wird nicht gespeichert", async ({ page }) => {
    await loginUi(page);
    await page.goto("/admin/news");
    await page.getByRole("button", { name: /Neu/ }).first().click();
    const m = modal(page);
    await m.locator("input").first().fill(uniq("Unsicher"));
    await m.getByRole("button", { name: "Button", exact: true }).click();
    const btn = m.locator('[aria-label^="Baustein 1: Button"] input');
    await btn.nth(0).fill("Klick");
    await btn.nth(1).fill("javascript:alert(1)");
    await m.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.getByText(/https:\/\/, mailto: oder tel:/).first()).toBeVisible();
    await expect(page.locator("div.fixed.inset-0")).toHaveCount(1); // Editor bleibt offen
  });

  test("Server lehnt ungültige Bausteine ab", async ({ request }) => {
    await apiLogin(request);
    const bad = (blocks: unknown) => request.post("/api/admin/news", { data: { title: "t", blocks } });
    expect((await bad([{ type: "button", label: "x", url: "javascript:alert(1)" }])).status()).toBe(400);
    expect((await bad([{ type: "image", url: "http://unsicher.example/a.png" }])).status()).toBe(400);
    expect((await bad([{ type: "video", url: "https://x" }])).status()).toBe(400);
    expect((await bad([{ type: "text", text: "x".repeat(20001) }])).status()).toBe(400);
  });

  test("Altes Beitragsformat wird beim Bearbeiten in Bausteine umgewandelt", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Alter Beitrag");
    const item = await createVia(request, "news", {
      title, summary: "s", content: "Erste Zeile\n\nZweiter Absatz", links: [{ label: "Anmelden", url: "https://example.org/x" }],
    });
    try {
      await loginUi(page);
      await page.goto("/admin/news");
      await page.locator("div.glass-card", { hasText: title }).getByRole("button", { name: "Bearbeiten" }).click();
      const m = modal(page);
      await expect(m.getByText(/mit dem alten Textfeld erstellt/)).toBeVisible();
      await expect(m.locator('[aria-label^="Baustein 1: Text"] textarea')).toHaveValue(/Erste Zeile/);
      await expect(m.locator('[aria-label^="Baustein 2: Button"] input').first()).toHaveValue("Anmelden");
      await m.getByRole("button", { name: "Speichern", exact: true }).click();
      await expect(page.locator("div.fixed.inset-0")).toHaveCount(0);
      const saved = await request.get("/api/admin/news");
      const found = (await saved.json()).news.find((n: { id: string }) => n.id === item.id);
      expect(found.blocks.map((b: { type: string }) => b.type)).toEqual(["text", "button"]);
    } finally {
      await removeVia(request, "news", item.id);
    }
  });

  test("Hochgeladenes, nicht gespeichertes Bild wird beim Abbrechen aufgeräumt", async ({ page }) => {
    await loginUi(page);
    const storage = await mockStorage(page);
    await page.goto("/admin/news");
    await page.getByRole("button", { name: /Neu/ }).first().click();
    const m = modal(page);
    await m.locator("input[type=file]").first().setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
    await expect(m.locator('img[alt="Vorschau"]')).toBeVisible();
    expect(storage.uploads).toHaveLength(1);
    await m.getByRole("button", { name: "Abbrechen", exact: true }).click();
    await expect.poll(() => storage.discards.length).toBe(1);
    expect(storage.discards[0]).toEqual([storage.uploads[0]]);
  });

  test("Ersetztes Titelbild: zwischenzeitliches Bild wird beim Speichern aufgeräumt", async ({ page, request }) => {
    await loginUi(page);
    const storage = await mockStorage(page);
    const title = uniq("Bildwechsel");
    await page.goto("/admin/news");
    await page.getByRole("button", { name: /Neu/ }).first().click();
    const m = modal(page);
    await m.locator("input").first().fill(title);
    const file = m.locator("input[type=file]").first();
    await file.setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG });
    await expect(m.locator('img[alt="Vorschau"]')).toBeVisible();
    await file.setInputFiles({ name: "b.png", mimeType: "image/png", buffer: PNG });
    await expect.poll(() => storage.uploads.length).toBe(2);
    await expect(m.locator('img[alt="Vorschau"]')).toHaveAttribute("src", storage.uploads[1]);
    await m.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.locator("div.fixed.inset-0")).toHaveCount(0);
    await expect.poll(() => storage.discards.length).toBe(1);
    expect(storage.discards[0]).toEqual([storage.uploads[0]]);
    await apiLogin(request);
    const all = (await (await request.get("/api/admin/news")).json()).news as { id: string; title: string; imageUrl: string }[];
    const saved = all.find((n) => n.title === title)!;
    expect(saved.imageUrl).toBe(storage.uploads[1]);
    await removeVia(request, "news", saved.id);
  });
});

test.describe("Events im Admin", () => {
  test("Event mit Bausteinen anlegen, für Mitglieder sehen und löschen", async ({ page }) => {
    await loginUi(page);
    await mockStorage(page);
    const title = uniq("UI Event");
    await page.goto("/admin/events");
    await page.getByRole("button", { name: /Neu/ }).first().click();
    const m = modal(page);
    await m.locator("input").first().fill(title);
    await m.locator("input[type=date]").first().fill("2099-08-15");
    await m.locator("input[type=time]").first().fill("11:30");
    await m.getByRole("button", { name: "Text", exact: true }).click();
    await m.locator('[aria-label^="Baustein 1: Text"] textarea').fill("Treffpunkt beim Bärenplatz");
    await m.getByRole("button", { name: "Tabelle", exact: true }).click();
    await m.getByLabel("Zeile 2, Spalte 1").fill("12:00");
    await m.getByLabel("Zeile 2, Spalte 2").fill("Mittagessen");
    await m.getByRole("button", { name: "Galerie", exact: true }).click();
    await m.locator('[aria-label^="Baustein 3: Galerie"] input[type=file]').setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: PNG },
      { name: "b.png", mimeType: "image/png", buffer: PNG },
    ]);
    await expect(m.locator('[aria-label^="Baustein 3: Galerie"] li')).toHaveCount(2, { timeout: 30_000 });
    await m.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.locator("div.fixed.inset-0")).toHaveCount(0);

    await page.goto("/events");
    const card = page.locator("article:visible", { hasText: title });
    await card.locator("button[aria-expanded]").click();
    await expect(card.getByText("Treffpunkt beim Bärenplatz")).toBeVisible();
    await expect(card.getByText("Mittagessen")).toBeVisible();
    await expect(card.locator("img")).not.toHaveCount(0);

    await page.goto("/admin/events");
    page.once("dialog", (d) => d.accept());
    await page.locator("div.glass-card", { hasText: title }).getByRole("button", { name: "Löschen" }).click();
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("Altes Event wird beim Bearbeiten umgewandelt, Beschreibung bleibt als Klartext", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Altes Event Admin");
    const ev = await createVia(request, "events", {
      title, date: "2099-09-01", description: "Alte Beschreibung", links: [{ label: "Anmelden", url: "https://example.org/e" }],
    });
    try {
      await loginUi(page);
      await page.goto("/admin/events");
      await page.locator("div.glass-card", { hasText: title }).getByRole("button", { name: "Bearbeiten" }).click();
      const m = modal(page);
      await expect(m.getByText(/mit dem alten Textfeld erstellt/)).toBeVisible();
      await expect(m.locator('[aria-label^="Baustein 1: Text"] textarea')).toHaveValue("Alte Beschreibung");
      await m.locator('[aria-label^="Baustein 1: Text"] textarea').fill("Neue Beschreibung");
      await m.getByRole("button", { name: "Speichern", exact: true }).click();
      await expect(page.locator("div.fixed.inset-0")).toHaveCount(0);
      const all = (await (await request.get("/api/admin/events")).json()).events as { id: string; description: string; blocks: { type: string }[] }[];
      const saved = all.find((e) => e.id === ev.id)!;
      expect(saved.description).toContain("Neue Beschreibung"); // Klartext für Kalender-Export
      expect(saved.blocks.map((b) => b.type)).toEqual(["text", "button"]);
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Mehrtägiges Event mit Enddatum anlegen: Bereich in der Liste und im Zeitstrahl", async ({ page }) => {
    await loginUi(page);
    const title = uniq("UI Mehrtägig");
    await page.goto("/admin/events");
    await page.getByRole("button", { name: /Neu/ }).first().click();
    const m = modal(page);
    await m.locator("input").first().fill(title);
    await m.locator("input[type=date]").first().fill("2097-07-10");
    await m.getByLabel("Enddatum").fill("2097-07-12");
    await m.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.locator("div.fixed.inset-0")).toHaveCount(0);
    const card = page.locator("div.glass-card", { hasText: title });
    await expect(card).toContainText(/10\. – .*12\. Juli 2097/);

    await page.goto("/events");
    await expect(page.locator('section[data-month="2097-07"] article', { hasText: title })).toContainText("10–12");

    // Enddatum wieder entfernen: eintägig
    await page.goto("/admin/events");
    await page.locator("div.glass-card", { hasText: title }).getByRole("button", { name: "Bearbeiten" }).click();
    await modal(page).getByRole("button", { name: "Entfernen" }).click();
    await modal(page).getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.locator("div.fixed.inset-0")).toHaveCount(0);
    await expect(page.locator("div.glass-card", { hasText: title })).not.toContainText("12. Juli 2097");
    page.once("dialog", (d) => d.accept());
    await page.locator("div.glass-card", { hasText: title }).getByRole("button", { name: "Löschen" }).click();
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("Enddatum vor dem Startdatum wird abgelehnt (Oberfläche und Server)", async ({ page, request }) => {
    await loginUi(page);
    await page.goto("/admin/events");
    await page.getByRole("button", { name: /Neu/ }).first().click();
    const m = modal(page);
    await m.locator("input").first().fill(uniq("Falsches Ende"));
    await m.locator("input[type=date]").first().fill("2097-08-10");
    await m.getByLabel("Enddatum").fill("2097-08-09");
    await m.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(m.getByText(/Enddatum darf nicht vor dem Startdatum/)).toBeVisible();

    await apiLogin(request);
    const bad = await request.post("/api/admin/events", { data: { title: "x", date: "2097-08-10", endDate: "2097-08-09" } });
    expect(bad.status()).toBe(400);
    const invalid = await request.post("/api/admin/events", { data: { title: "x", date: "2097-08-10", endDate: "morgen" } });
    expect(invalid.status()).toBe(400);
    const same = await createVia(request, "events", { title: uniq("Gleicher Tag"), date: "2097-08-10", endDate: "2097-08-10" });
    const all = (await (await request.get("/api/admin/events")).json()).events as { id: string; endDate: string | null }[];
    expect(all.find((e) => e.id === same.id)!.endDate).toBeNull(); // gleicher Tag = eintägig
    await removeVia(request, "events", same.id);
  });

  test("Admin-Liste: aktuelles Jahr voll, frühere Jahre eingeklappt und erst beim Aufklappen geladen", async ({ page, request }) => {
    await apiLogin(request);
    const d = await createVia(request, "events", { title: uniq("Liste Entwurf"), date: "2097-09-01", status: "draft" });
    const f = await createVia(request, "events", { title: uniq("Liste Zukunft"), date: "2097-09-02" });
    const p = await createVia(request, "events", { title: uniq("Liste Alt"), date: "2018-02-02" });
    try {
      await loginUi(page);
      const yearCalls: string[] = [];
      page.on("request", (r) => { if (r.url().includes("/api/admin/events?year=")) yearCalls.push(r.url()); });
      await page.goto("/admin/events");
      await expect(page.getByRole("heading", { name: "Entwürfe" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Anstehend" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "September 2097" })).toBeVisible();
      // Frühere Jahre: eingeklappt, nichts nachgeladen
      await expect(page.getByRole("heading", { name: "Frühere Jahre" })).toBeVisible();
      const year = page.getByRole("button", { name: /^2018/ });
      await expect(year).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator("div.glass-card", { hasText: "Liste Alt" })).toHaveCount(0);
      expect(yearCalls).toHaveLength(0);
      // Aufklappen lädt die Events des Jahres
      await year.click();
      await expect(page.getByRole("heading", { name: "Februar 2018" })).toBeVisible();
      await expect(page.locator("div.glass-card", { hasText: "Liste Alt" }).getByRole("button", { name: "Bearbeiten" })).toBeVisible();
      expect(yearCalls).toHaveLength(1);
      // Ein Event aus einem früheren Jahr lässt sich bearbeiten und die Liste bleibt aufgeklappt
      await page.locator("div.glass-card", { hasText: "Liste Alt" }).getByRole("button", { name: "Bearbeiten" }).click();
      await modal(page).getByRole("button", { name: "Speichern", exact: true }).click();
      await expect(page.locator("div.fixed.inset-0")).toHaveCount(0);
      await expect(year).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByRole("heading", { name: "Februar 2018" })).toBeVisible();
    } finally {
      for (const e of [d, f, p]) await removeVia(request, "events", e.id);
    }
  });

  test("Admin-Schnittstelle für frühere Jahre: Prüfung und Inhalt", async ({ request }) => {
    expect((await request.get("/api/admin/events?year=abc")).status()).toBe(401); // ohne Login
    await apiLogin(request);
    expect((await request.get("/api/admin/events?year=abc")).status()).toBe(400);
    const old = await createVia(request, "events", { title: uniq("Alt API"), date: "2017-06-06" });
    try {
      const main = await (await request.get("/api/admin/events")).json();
      expect(main.events.map((e: { id: string }) => e.id)).not.toContain(old.id); // frühere Jahre nicht in der Hauptliste
      expect(main.pastYears.find((y: { year: number }) => y.year === 2017).count).toBeGreaterThanOrEqual(1);
      const year = await (await request.get("/api/admin/events?year=2017")).json();
      expect(year.events.map((e: { id: string }) => e.id)).toContain(old.id);
    } finally {
      await removeVia(request, "events", old.id);
    }
  });

  test("Abbrechen-Knopf im Editor ist gut sichtbar (hell und dunkel)", async ({ page }) => {
    await loginUi(page);
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/admin/events");
      await page.evaluate((m) => localStorage.setItem("doc-bern-theme", m), scheme);
      await page.reload();
      await page.getByRole("button", { name: /Neu/ }).first().click();
      const btn = modal(page).getByRole("button", { name: "Abbrechen", exact: true });
      const info = await btn.evaluate((el) => {
        const cs = getComputedStyle(el);
        const alpha = (c: string) => { const m = c.match(/[\d.]+/g)!.map(Number); return m.length > 3 ? m[3] : 1; };
        return { bgAlpha: alpha(cs.backgroundColor), border: cs.borderTopWidth, color: cs.color };
      });
      expect(info.bgAlpha, scheme).toBeGreaterThan(0.03); // nicht transparent
      expect(info.border, scheme).toBe("1px"); // sichtbarer Rand
      const expected = await page.evaluate(() => { const e = document.createElement("span"); e.style.color = "var(--text-primary)"; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; });
      expect(info.color, scheme).toBe(expected); // Textfarbe wie der Haupttext
      await btn.click();
    }
  });

  test("Textfelder wachsen mit dem Inhalt mit", async ({ page }) => {
    await loginUi(page);
    await page.goto("/admin/events");
    await page.getByRole("button", { name: /Neu/ }).first().click();
    const m = modal(page);
    await m.getByRole("button", { name: "Text", exact: true }).click();
    const ta = m.locator('[aria-label^="Baustein 1: Text"] textarea');
    const h0 = (await ta.boundingBox())!.height;
    await ta.fill(Array.from({ length: 14 }, (_, i) => `Zeile ${i + 1}`).join("\n"));
    await expect.poll(async () => (await ta.boundingBox())!.height).toBeGreaterThan(h0 + 100);
    const fits = await ta.evaluate((el) => el.scrollHeight <= el.clientHeight + 1); // kein innerer Scrollbalken
    expect(fits).toBe(true);
    await ta.fill("kurz");
    await expect.poll(async () => (await ta.boundingBox())!.height).toBeLessThan(h0 + 5); // schrumpft wieder
    // Auch die Knöpfe Fett/Liste passen die Höhe an
    await ta.fill("a\nb\nc\nd\ne");
    await ta.selectText();
    await m.getByRole("button", { name: "Aufzählung" }).click();
    await expect(ta).toHaveValue(/^- a\n- b/);
  });

  test("Event ohne Datum wird nicht gespeichert", async ({ page }) => {
    await loginUi(page);
    await page.goto("/admin/events");
    await page.getByRole("button", { name: /Neu/ }).first().click();
    const m = modal(page);
    await m.locator("input").first().fill(uniq("Ohne Datum"));
    await m.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(m.getByText(/Datum sind erforderlich/)).toBeVisible();
  });
});
