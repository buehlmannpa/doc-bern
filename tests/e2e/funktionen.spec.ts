import { test, expect } from "@playwright/test";
import { apiLogin, createVia, removeVia, uniq } from "./helpers";

// Funktionen für Mitglieder (läuft auf Desktop und Smartphone): Kalender, Darstellung, Startseite

test.describe("Kalender-Export", () => {
  test("Standard-Aktion lädt eine .ics-Datei mit den Event-Daten, weitere Optionen enthalten Google", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Kalender Event");
    const ev = await createVia(request, "events", {
      title, date: "2099-05-10", time: "14:30", location: "Thun, Schweiz", description: "Treffpunkt am See",
    });
    try {
      await page.goto("/events");
      const card = page.locator("article:visible", { hasText: title });
      await card.locator("button[aria-expanded]").click();
      await expect(card.getByText("Treffpunkt am See")).toBeVisible();

      const [download] = await Promise.all([
        page.waitForEvent("download"),
        card.getByRole("button", { name: /Zum Kalender hinzufügen/ }).click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/\.ics$/);
      const content = (await (await import("node:fs/promises")).readFile((await download.path())!, "utf8")).replace(/\r\n/g, "\n");
      expect(content).toContain("BEGIN:VEVENT");
      expect(content).toContain(`SUMMARY:${title}`);
      expect(content).toContain("DTSTART:20990510T143000");
      expect(content).toContain("Thun");

      await card.getByRole("button", { name: "Weitere Kalender-Optionen" }).click();
      const google = card.getByRole("link", { name: /Google/ });
      await expect(google).toHaveAttribute("href", /calendar\.google\.com\/calendar\/render/);
      await expect(google).toHaveAttribute("href", /20990510T143000/);
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });
});

test.describe("Darstellung", () => {
  test("Hell, Dunkel und Automatisch lassen sich wählen und bleiben nach dem Neuladen", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/settings");
    const theme = () => page.locator("html").getAttribute("data-theme");

    await page.getByRole("main").getByRole("button", { name: "Dunkel", exact: true }).click();
    await expect.poll(theme).toBe("dark");
    await page.reload();
    await expect.poll(theme).toBe("dark");

    await page.getByRole("main").getByRole("button", { name: "Hell", exact: true }).click();
    await expect.poll(theme).toBe("light");

    await page.getByRole("main").getByRole("button", { name: "Automatisch", exact: true }).click();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(theme).toBe("dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(theme).toBe("light");
  });

  test("Kontraste: Text und roter Text sind in beiden Modi gut lesbar, Ducati-Rot bleibt in Flächen", async ({ page }) => {
    type RGB = [number, number, number];
    const luminance = (c: RGB) => {
      const [r, g, b] = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: RGB, b: RGB) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    // Farbwerte so lesen, wie der Browser sie wirklich darstellt (rgb), unabhängig von der Schreibweise im CSS
    const read = () =>
      page.evaluate(() => {
        const probe = (name: string): [number, number, number] => {
          const el = document.createElement("span");
          el.style.color = `var(${name})`;
          document.body.appendChild(el);
          const m = getComputedStyle(el).color.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
          el.remove();
          return m as [number, number, number];
        };
        return { text: probe("--accent-text"), bg: probe("--bg-primary"), hex: probe("--accent-hex"), primary: probe("--text-primary"), secondary: probe("--text-secondary") };
      });

    await page.goto("/settings");
    await page.getByRole("main").getByRole("button", { name: "Dunkel", exact: true }).click();
    await expect.poll(() => page.locator("html").getAttribute("data-theme")).toBe("dark");
    const dark = await read();
    expect(ratio(dark.text, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(dark.primary, dark.bg)).toBeGreaterThanOrEqual(7);
    expect(ratio(dark.secondary, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(dark.hex).toEqual([227, 6, 19]); // Flächen und Buttons bleiben im originalen Ducati-Rot

    await page.getByRole("main").getByRole("button", { name: "Hell", exact: true }).click();
    await expect.poll(() => page.locator("html").getAttribute("data-theme")).toBe("light");
    const light = await read();
    expect(ratio(light.primary, light.bg)).toBeGreaterThanOrEqual(7);
    expect(ratio(light.secondary, light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(light.hex).toEqual([227, 6, 19]);
  });
});

test.describe("Startseite", () => {
  test("Zeigt das nächste Event und den neuesten Beitrag", async ({ page, request }) => {
    await apiLogin(request);
    const evTitle = uniq("Home Event");
    const newsTitle = uniq("Home News");
    const ev = await createVia(request, "events", { title: evTitle, date: "2098-01-01", time: "10:00", location: "Bern" });
    const nw = await createVia(request, "news", { title: newsTitle, summary: "Kurz", blocks: [{ type: "text", text: "Inhalt" }] });
    try {
      await page.goto("/");
      await expect(page.getByText(evTitle)).toBeVisible();
      await expect(page.getByText(newsTitle)).toBeVisible();
      // Die Startseite lädt keinen Inhalt der Beiträge vor (nur Titel/Kurztext)
      const html = await (await request.get("/")).text();
      expect(html).not.toContain("Inhalt\"");
    } finally {
      await removeVia(request, "events", ev.id);
      await removeVia(request, "news", nw.id);
    }
  });

  test("Entwürfe erscheinen nicht auf der Startseite", async ({ page, request }) => {
    await apiLogin(request);
    const title = uniq("Home Entwurf");
    const ev = await createVia(request, "events", { title, date: "2098-01-02", status: "draft" });
    try {
      await page.goto("/");
      await expect(page.getByText(title)).toHaveCount(0);
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });
});
