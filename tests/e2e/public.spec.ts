import { test, expect } from "@playwright/test";
import { apiLogin, createVia, removeVia, sampleBlocks, uniq } from "./helpers";

// Mitglieder-Ansicht (läuft auf Desktop und Smartphone)

const PAGES: [string, RegExp][] = [
  ["/", /Ducati Official Club Bern/],
  ["/events", /Events/],
  ["/newsletter", /News/],
  ["/rabatte", /./],
  ["/partners", /./],
  ["/settings", /./],
];

for (const [path, heading] of PAGES) {
  test(`Seite ${path} lädt ohne Fehler und ohne seitliches Scrollen`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(heading);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test("Navigation ist vorhanden", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("nav:visible").first()).toBeVisible();
});

test.describe("Events", () => {
  test("Inhalt wird erst beim Aufklappen geladen und zeigt Bausteine und Kalender", async ({ page, request }) => {
    await apiLogin(request);
    const marker = uniq("Ev").replace(/\s/g, "");
    const title = `Event ${marker}`;
    const ev = await createVia(request, "events", {
      title, date: "2099-06-01", time: "10:00", location: "Bern", blocks: sampleBlocks(marker),
    });
    try {
      const detailCalls: string[] = [];
      page.on("request", (r) => { if (r.url().includes("/api/events?id=")) detailCalls.push(r.url()); });
      const html = await (await request.get("/events")).text();
      expect(html).not.toContain(`Start ${marker}`); // Liste enthält den Inhalt nicht
      await page.goto("/events");
      const card = page.locator("article:visible", { hasText: title });
      await expect(card).toBeVisible();
      expect(detailCalls).toHaveLength(0);
      await card.locator("button[aria-expanded]").click();
      await expect(card.getByText(`Start ${marker}`)).toBeVisible();
      await expect(card.locator("table")).toHaveCount(1);
      await expect(card.getByRole("link", { name: /Anmelden/ })).toHaveAttribute("href", "https://example.org/anmeldung");
      await expect(card.getByText(/Kalender/i).first()).toBeVisible();
      expect(detailCalls.length).toBeGreaterThanOrEqual(1);
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Entwurf ist für Mitglieder weder sichtbar noch abrufbar", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Entwurf Event");
    const ev = await createVia(request, "events", { title, date: "2099-06-02", status: "draft", description: "geheim" });
    try {
      await page.goto("/events");
      await expect(page.locator("article:visible", { hasText: title })).toHaveCount(0);
      const anon = await page.request.get(`/api/events?id=${ev.id}`);
      expect(anon.status()).toBe(404);
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Altes Event (nur Beschreibung und Links) zeigt weiter Text und Link", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Altes Event");
    const ev = await createVia(request, "events", {
      title, date: "2099-06-03", description: "Alte Beschreibung hier",
      links: [{ label: "Mehr", url: "https://example.org/mehr" }],
    });
    try {
      await page.goto("/events");
      const card = page.locator("article:visible", { hasText: title });
      await card.locator("button[aria-expanded]").click();
      await expect(card.getByText("Alte Beschreibung hier")).toBeVisible();
      await expect(card.getByRole("link", { name: /Mehr/ })).toHaveAttribute("href", "https://example.org/mehr");
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Ungültige oder unbekannte Event-ID", async ({ request }) => {
    expect((await request.get("/api/events?id=a b")).status()).toBe(400);
    expect((await request.get("/api/events?id=gibt-es-nicht")).status()).toBe(404);
  });
});

test.describe("News", () => {
  test("Inhalt wird erst beim Aufklappen geladen und zeigt Bausteine", async ({ page, request }) => {
    await apiLogin(request);
    const marker = uniq("Nw").replace(/\s/g, "");
    const title = `News ${marker}`;
    const item = await createVia(request, "news", {
      title, summary: "Kurztext", category: "news", blocks: [...sampleBlocks(marker), { type: "callout", tone: "important", text: `Wichtig ${marker}` }],
    });
    try {
      const html = await (await request.get("/newsletter")).text();
      expect(html).not.toContain(`Start ${marker}`);
      await page.goto("/newsletter");
      const card = page.locator("article:visible", { hasText: title });
      await expect(card).toBeVisible();
      await card.locator("button[aria-expanded]").click();
      await expect(card.getByText(`Start ${marker}`)).toBeVisible();
      await expect(card.getByText(`Wichtig ${marker}`)).toBeVisible();
      await expect(card.locator("table")).toHaveCount(1);
      await expect(card.getByRole("link", { name: /Anmelden/ })).toBeVisible();
    } finally {
      await removeVia(request, "news", item.id);
    }
  });

  test("Entwurf ist für Mitglieder weder sichtbar noch abrufbar", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Entwurf News");
    const item = await createVia(request, "news", { title, summary: "x", status: "draft", blocks: [{ type: "text", text: "geheim" }] });
    try {
      await page.goto("/newsletter");
      await expect(page.locator("article:visible", { hasText: title })).toHaveCount(0);
      expect((await page.request.get(`/api/news?id=${item.id}`)).status()).toBe(404);
    } finally {
      await removeVia(request, "news", item.id);
    }
  });

  test("Galerie öffnet die Grossansicht und lässt sich schliessen", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Galerie News");
    const img = (n: number) => `https://store.public.blob.vercel-storage.com/g${n}.webp`;
    const item = await createVia(request, "news", {
      title, summary: "Bilder", blocks: [{ type: "gallery", images: [{ url: img(1) }, { url: img(2) }, { url: img(3) }] }],
    });
    const gif = Buffer.from("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64");
    await page.route("https://store.public.blob.vercel-storage.com/**", (r) => r.fulfill({ contentType: "image/gif", body: gif }));
    try {
      await page.goto("/newsletter");
      const card = page.locator("article:visible", { hasText: title });
      await card.locator("button[aria-expanded]").click();
      await card.locator("button:has(img)").first().click();
      await expect(page.locator("div.fixed.inset-0 img")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("div.fixed.inset-0 img")).toHaveCount(0);
    } finally {
      await removeVia(request, "news", item.id);
    }
  });

  test("Ungültige oder unbekannte News-ID", async ({ request }) => {
    expect((await request.get("/api/news?id=a b")).status()).toBe(400);
    expect((await request.get("/api/news?id=gibt-es-nicht")).status()).toBe(404);
  });
});
