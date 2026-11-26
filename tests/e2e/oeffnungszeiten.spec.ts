import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";

// Öffnungszeiten des Vertragshändlers: Die App liest sie von der Händler-Seite (hier eine Testseite, E2E_FAKE_HOURS=1).
const FIXTURE = fs.readFileSync("tests/fixtures/hostettler-bern.html", "utf8");

const setSource = (request: APIRequestContext, html: string, status = 200) => request.post("/api/e2e-hours", { data: { html, status } });

// Wochentag in Schweizer Zeit, wie die App ihn bestimmt
const zurichWeekday = () => new Intl.DateTimeFormat("de-CH", { weekday: "long", timeZone: "Europe/Zurich" }).format(new Date());
const dmy = (d: Date) => new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Zurich" }).format(d);
const withClosure = (html: string, from: Date, until: Date) =>
  html.replace(/24\. Dezember 2026 ab 12:00 Uhr &#8211; 04\. Januar 2027/, `${dmy(from)} ab 12:00 Uhr &#8211; ${dmy(until)}`);
const DAY = 86400000;

test.describe("Öffnungszeiten Vertragshändler", () => {
  test("Testseite ist nur mit Test-Konfiguration aktiv und sonst nicht erreichbar", async ({ request }) => {
    const r = await setSource(request, FIXTURE);
    expect(r.ok()).toBeTruthy();
  });

  test("Zeiten von der Händler-Seite werden auf Partner-Seite angezeigt, heute markiert", async ({ page, request }) => {
    await setSource(request, FIXTURE.replace("Dienstag</th><td class=\"hmoto-opening-hours__times\">09:00&nbsp;&ndash;&nbsp;12:00", "Dienstag</th><td class=\"hmoto-opening-hours__times\">10:15&nbsp;&ndash;&nbsp;12:00"));
    await page.goto("/partners");
    await expect(page.getByText("10:15 – 12:00").first()).toBeVisible();
    await expect(page.getByTestId("hours-source")).toContainText("hostettler-moto.ch");
    await expect(page.getByText("· heute")).toHaveCount(2); // Shop und Werkstatt
    const today = zurichWeekday();
    await expect(page.getByText(`${today} · heute`).first()).toBeVisible();
  });

  test("Sommerzeiten: Änderung auf der Händler-Seite erscheint ohne Anpassung der App", async ({ page, request }) => {
    await setSource(request, FIXTURE.replace(/09:00&nbsp;&ndash;&nbsp;12:00/g, "08:30&nbsp;&ndash;&nbsp;12:00"));
    await page.goto("/partners");
    await expect(page.getByText("08:30 – 12:00").first()).toBeVisible();
  });

  test("Händler-Seite nicht erreichbar: Ersatzzeiten und Hinweis, Seite lädt trotzdem", async ({ page, request }) => {
    await setSource(request, "", 500);
    const res = await page.goto("/partners");
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("hours-source")).toContainText("nicht geladen");
    await expect(page.getByText("Öffnungszeiten Shop")).toBeVisible();
  });

  test("Händler-Seite verändert (keine Zeiten gefunden): Ersatzzeiten statt Fehler", async ({ page, request }) => {
    await setSource(request, "<html><body>Neue Seite ohne Tabelle</body></html>");
    const res = await page.goto("/partners");
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("hours-source")).toContainText("nicht geladen");
  });

  test("Betriebsferien laufen heute: Hinweis und «Betriebsferien» bei heute", async ({ page, request }) => {
    await setSource(request, withClosure(FIXTURE, new Date(Date.now() - 2 * DAY), new Date(Date.now() + 5 * DAY)));
    await page.goto("/partners");
    await expect(page.getByRole("note")).toContainText("Betriebsferien");
    await expect(page.getByText("Betriebsferien", { exact: true })).toHaveCount(2);
  });

  test("Betriebsferien liegen in der Zukunft: Hinweis, aber heute normal", async ({ page, request }) => {
    await setSource(request, withClosure(FIXTURE, new Date(Date.now() + 10 * DAY), new Date(Date.now() + 20 * DAY)));
    await page.goto("/partners");
    await expect(page.getByRole("note")).toContainText("Betriebsferien");
    await expect(page.getByText("Betriebsferien", { exact: true })).toHaveCount(0);
  });

  test("Betriebsferien vorbei: kein Hinweis mehr", async ({ page, request }) => {
    await setSource(request, withClosure(FIXTURE, new Date(Date.now() - 20 * DAY), new Date(Date.now() - 10 * DAY)));
    await page.goto("/partners");
    await expect(page.getByRole("note")).toHaveCount(0);
  });

  test("Startseite lädt mit Live-Zeiten und mit Ersatzzeiten", async ({ page, request }) => {
    await setSource(request, FIXTURE);
    expect((await page.goto("/"))?.status()).toBe(200);
    await setSource(request, "", 503);
    expect((await page.goto("/"))?.status()).toBe(200);
  });
});
