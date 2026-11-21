import { test, expect, type Page } from "@playwright/test";
import { ADMIN, apiLogin, loginUi, modal, uniq } from "./helpers";

// Weitere Admin-Bereiche: Partner, Rabattaktionen, Vorstand, Benutzer, Wartungsmodus (nur Desktop)

async function openNew(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("button", { name: /Neu/ }).first().click();
  return modal(page);
}

async function save(page: Page) {
  await modal(page).getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.locator("div.fixed.inset-0")).toHaveCount(0);
}

async function remove(page: Page, path: string, title: string) {
  await page.goto(path);
  page.once("dialog", (d) => d.accept());
  await page.locator("div.glass-card", { hasText: title }).getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText(title)).toHaveCount(0);
}

test.describe("Partner", () => {
  test("Partner anlegen, bearbeiten, öffentlich sehen und löschen", async ({ page }) => {
    await loginUi(page);
    const name = uniq("Partner");
    const m = await openNew(page, "/admin/partners");
    await m.getByLabel("Name *").fill(name);
    await m.getByLabel("Kategorie").fill("Werkstatt");
    await m.getByLabel("Rabatt (optional)").fill("12%");
    await save(page);
    await expect(page.getByText(name)).toBeVisible();

    await page.goto("/partners");
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText("12%").first()).toBeVisible();

    await page.goto("/admin/partners");
    await page.locator("div.glass-card", { hasText: name }).getByRole("button", { name: "Bearbeiten" }).click();
    await modal(page).getByLabel("Rabatt (optional)").fill("15%");
    await save(page);
    await page.goto("/partners");
    await expect(page.locator("body")).toContainText("15%");

    await remove(page, "/admin/partners", name);
    await page.goto("/partners");
    await expect(page.getByText(name)).toHaveCount(0);
  });

  test("Partner ohne Namen wird nicht gespeichert", async ({ page }) => {
    await loginUi(page);
    const m = await openNew(page, "/admin/partners");
    await m.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.locator("div.fixed.inset-0")).toHaveCount(1);
  });
});

test.describe("Rabattaktionen", () => {
  test("Aktion anlegen, unter Vorteile sehen und löschen", async ({ page }) => {
    await loginUi(page);
    const title = uniq("Aktion");
    const m = await openNew(page, "/admin/actions");
    await m.getByLabel("Titel *").fill(title);
    await m.getByLabel("Zeitraum").fill("Q4 2099");
    await m.getByLabel("Rabatt").fill("20%");
    await m.getByLabel("Beschreibung").fill("Nur für Mitglieder");
    await save(page);

    await page.goto("/rabatte");
    await expect(page.getByText("Aktuelle Aktion für Mitglieder")).toBeVisible();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Q4 2099")).toBeVisible();
    await expect(page.getByText("Nur für Mitglieder")).toBeVisible();

    await remove(page, "/admin/actions", title);
    await page.goto("/rabatte");
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  });
});

test.describe("Vorstand", () => {
  test("Mitglied anlegen, auf der Startseite sehen und löschen", async ({ page }) => {
    await loginUi(page);
    // Auf der Startseite wird nur der Vorname angezeigt: Name aus einem Wort wählen
    const name = `Vorst${Date.now().toString(36)}`;
    const m = await openNew(page, "/admin/board");
    await m.getByLabel("Name *").fill(name);
    await m.getByLabel("Rolle").fill("Kassier");
    await save(page);

    await page.goto("/");
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText("Kassier").first()).toBeVisible();

    await remove(page, "/admin/board", name);
    await page.goto("/");
    await expect(page.getByText(name)).toHaveCount(0);
  });
});

test.describe("Benutzer", () => {
  test("Super-Admin legt Admin an: Login möglich, aber ohne Zugriff auf die Benutzerverwaltung", async ({ page, browser, request }) => {
    await loginUi(page);
    const username = `test${Date.now().toString(36)}`;
    const m = await openNew(page, "/admin/users");
    await m.getByLabel("Benutzername *").fill(username);
    await m.getByLabel("Anzeigename").fill("Test Admin");
    await m.getByLabel("Passwort *").fill("geheim-123");
    await save(page);
    await expect(page.getByText(username)).toBeVisible();

    // Der neue Admin meldet sich in einem eigenen Browser an
    const ctx = await browser.newContext();
    const other = await ctx.newPage();
    await other.goto("/admin/login");
    await other.getByPlaceholder("Benutzername").fill(username);
    await other.getByPlaceholder("Passwort").fill("geheim-123");
    await other.getByRole("button", { name: /Anmelden|Login/i }).click();
    await expect(other.getByText("Wähle einen Bereich")).toBeVisible();
    await expect(other.locator('a.glass-card[href="/admin/users"]')).toHaveCount(0); // Kachel «Benutzer» nur für Super-Admins
    const forbidden = await other.request.get("/api/admin/users");
    expect(forbidden.status()).toBe(403);
    await ctx.close();

    // Super-Admin darf sich nicht selbst löschen, aber andere schon
    await apiLogin(request);
    expect((await request.delete(`/api/admin/users?username=${ADMIN.username}`)).status()).toBe(400);
    await remove(page, "/admin/users", username);
  });

  test("Neuer Benutzer braucht Passwort und Benutzername", async ({ request }) => {
    await apiLogin(request);
    expect((await request.post("/api/admin/users", { data: { username: "", password: "x" } })).status()).toBe(400);
    expect((await request.post("/api/admin/users", { data: { username: "ohne-pw" } })).status()).toBe(400);
  });
});

test.describe("Wartungsmodus", () => {
  test("Besucher sehen den Hinweis, Admins arbeiten weiter, danach wieder normal", async ({ page, browser, request }) => {
    await loginUi(page);
    try {
      await page.getByRole("button", { name: "Wartungsmodus umschalten" }).click();
      await expect(page.getByText(/Aktiv – Besucher sehen nur das Logo/)).toBeVisible();

      const visitor = await browser.newContext();
      const v = await visitor.newPage();
      await v.goto("/events");
      await expect(v.getByText("Wir sind gleich zurück")).toBeVisible();
      await expect(v.getByRole("heading", { name: "Events", exact: true })).toHaveCount(0);
      await visitor.close();

      await page.goto("/admin/news"); // Admin-Bereich bleibt erreichbar
      await expect(page.getByRole("heading", { name: "News", exact: true })).toBeVisible();
    } finally {
      await apiLogin(request);
      await request.put("/api/admin/settings", { data: { maintenance: false } });
    }
    await page.goto("/events");
    await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
    await expect(page.getByText("Wir sind gleich zurück")).toHaveCount(0);
  });
});
