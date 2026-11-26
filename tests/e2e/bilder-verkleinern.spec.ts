import { test, expect, type APIRequestContext } from "@playwright/test";
import sharp from "sharp";
import { apiLogin, createVia, loginUi, removeVia, uniq } from "./helpers";

// Einmalige Verkleinerung bereits hochgeladener Bilder (Admin → Bilder, nur Super-Admins).
// Der Bildspeicher ist im Test ein Speicher im Arbeitsspeicher (E2E_FAKE_BLOB), nie der echte.

const BASE = "/api/e2e-blob?name=";

/** Foto-ähnliches, grosses JPEG (weiches Rauschen: gross als Original, gut verkleinerbar). */
async function bigJpeg(w = 3200, h = 2200): Promise<Buffer> {
  const noise = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 90, b: 60 }, noise: { type: "gaussian", mean: 128, sigma: 40 } } })
    .blur(2.5)
    .jpeg({ quality: 93 })
    .toBuffer();
  return noise;
}

async function putFake(request: APIRequestContext, name: string, bytes: Buffer, type = "image/jpeg"): Promise<string> {
  const res = await request.post(`/api/e2e-blob?name=${encodeURIComponent(name)}`, { data: bytes, headers: { "content-type": type } });
  expect(res.status()).toBe(200);
  return BASE + encodeURIComponent(name);
}

const size = async (request: APIRequestContext, url: string) => {
  const res = await request.get(url);
  return { status: res.status(), bytes: res.status() === 200 ? (await res.body()).length : 0, type: res.headers()["content-type"] };
};

async function optimize(request: APIRequestContext, url: string, dryRun = false) {
  const res = await request.post("/api/admin/optimize-images", { data: { url, dryRun } });
  return { http: res.status(), body: await res.json() };
}

async function listEvent(request: APIRequestContext, id: string) {
  const all = (await (await request.get("/api/admin/events")).json()).events as { id: string; imageUrl: string | null; title: string; blocks: { type: string; url?: string; images?: { url: string; thumbUrl?: string }[] }[] | null }[];
  return all.find((e) => e.id === id)!;
}

test.describe("Bilder verkleinern", () => {
  test.describe.configure({ mode: "serial" });
  let big: Buffer;
  test.beforeAll(async () => {
    big = await bigJpeg();
  });

  test("Nur Super-Admins: ohne Login 401, als normaler Admin 403", async ({ request, playwright }) => {
    expect((await request.get("/api/admin/optimize-images")).status()).toBe(401);
    await apiLogin(request);
    const username = `normal${Date.now().toString(36)}`;
    expect((await request.post("/api/admin/users", { data: { username, name: "Normal", role: "admin", password: "pw-12345" } })).status()).toBe(200);
    const other = await playwright.request.newContext({ baseURL: "http://localhost:3100" });
    try {
      expect((await other.post("/api/auth/login", { data: { username, password: "pw-12345" } })).status()).toBe(200);
      expect((await other.get("/api/admin/optimize-images")).status()).toBe(403);
      expect((await other.post("/api/admin/optimize-images", { data: { url: BASE + "x" } })).status()).toBe(403);
    } finally {
      await other.dispose();
      await request.delete(`/api/admin/users?username=${username}`);
    }
  });

  test("Prüfung: grosse Bilder sind Kandidaten, kleine, GIF und fremde Adressen nicht; Rolle je nach Verwendung", async ({ request }) => {
    await apiLogin(request);
    const n = uniq("scan").replace(/\s/g, "");
    const cover = await putFake(request, `${n}-cover.jpg`, big);
    const small = await putFake(request, `${n}-small.jpg`, await sharp({ create: { width: 400, height: 300, channels: 3, background: "#c33" } }).jpeg({ quality: 70 }).toBuffer());
    const gif = await putFake(request, `${n}-anim.gif`, Buffer.alloc(400 * 1024, 1), "image/gif");
    const gFull = await putFake(request, `${n}-gfull.jpg`, big);
    const gThumb = await putFake(request, `${n}-gthumb.jpg`, await sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 9, g: 9, b: 9 }, noise: { type: "gaussian", mean: 100, sigma: 50 } } }).jpeg({ quality: 90 }).toBuffer());
    const ev = await createVia(request, "events", { title: uniq("Scan"), date: "2098-03-03", imageUrl: cover, blocks: [{ type: "gallery", images: [{ url: gFull, thumbUrl: gThumb }] }, { type: "image", url: small }, { type: "image", url: gif }, { type: "image", url: "https://example.org/extern.jpg" }] });
    try {
      const { images } = await (await request.get("/api/admin/optimize-images")).json();
      const by = (u: string) => images.find((i: { url: string }) => i.url === u);
      expect(by(cover)).toMatchObject({ role: "standard", candidate: true });
      expect(by(cover).bytes).toBeGreaterThan(300 * 1024);
      expect(by(small)).toMatchObject({ candidate: false });
      expect(by(gif)).toMatchObject({ candidate: false, note: expect.stringMatching(/GIF/) });
      expect(by(gFull)).toMatchObject({ role: "galerie", candidate: true });
      expect(by(gThumb)).toMatchObject({ role: "vorschau", candidate: true }); // Vorschau hat ein tiefes Ziel (35 KB)
      expect(by("https://example.org/extern.jpg")).toMatchObject({ candidate: false });
      expect(by("https://example.org/extern.jpg").note).toMatch(/nicht in diesem Bildspeicher/);
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Vorschau berechnet nur: nichts wird verändert", async ({ request }) => {
    await apiLogin(request);
    const url = await putFake(request, `${uniq("vor").replace(/\s/g, "")}.jpg`, big);
    const ev = await createVia(request, "events", { title: uniq("Vorschau"), date: "2098-03-04", imageUrl: url });
    try {
      const r = await optimize(request, url, true);
      expect(r.http).toBe(200);
      expect(r.body.status).toBe("vorschau");
      expect(r.body.after).toBeLessThan(r.body.before * 0.5);
      expect((await listEvent(request, ev.id)).imageUrl).toBe(url); // Adresse unverändert
      expect((await size(request, url)).status).toBe(200); // Original noch da
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Verkleinern: neues kleines WebP, Adresse überall ersetzt, Original gelöscht, anderes bleibt", async ({ request }) => {
    await apiLogin(request);
    const n = uniq("opt").replace(/\s/g, "");
    const shared = await putFake(request, `${n}-shared.jpg`, big);
    const other = await putFake(request, `${n}-other.jpg`, await sharp({ create: { width: 300, height: 200, channels: 3, background: "#369" } }).jpeg({ quality: 60 }).toBuffer());
    const origSize = (await size(request, shared)).bytes;
    // Dasselbe Bild in Titelbild eines Events, Bild-Baustein einer News und einem Galerie-Baustein
    const ev = await createVia(request, "events", { title: uniq("Opt Event"), date: "2098-03-05", imageUrl: shared, time: "11:11", location: "Thun", blocks: [{ type: "gallery", images: [{ url: shared }, { url: other }] }, { type: "text", text: "bleibt" }] });
    const nw = await createVia(request, "news", { title: uniq("Opt News"), summary: "s", imageUrl: other, blocks: [{ type: "image", url: shared, caption: "Unterschrift" }] });
    try {
      const r = await optimize(request, shared);
      expect(r.http).toBe(200);
      expect(r.body).toMatchObject({ status: "verkleinert", deletedOriginal: true });
      expect(r.body.changedRows).toBe(3); // Event-Titelbild, Event-Galerie, News-Bild-Baustein
      expect(r.body.after).toBeLessThan(150 * 1024);
      expect(r.body.after).toBeLessThan(origSize * 0.3);

      const e = await listEvent(request, ev.id);
      expect(e.imageUrl).toBe(r.body.newUrl);
      expect(e.blocks![0].images![0].url).toBe(r.body.newUrl);
      expect(e.blocks![0].images![1].url).toBe(other); // anderes Bild unverändert
      expect(e.blocks![1]).toMatchObject({ type: "text" });
      expect(e.title).toContain("Opt Event");
      const news = ((await (await request.get("/api/admin/news")).json()).news as { id: string; imageUrl: string; blocks: { url?: string; caption?: string }[] }[]).find((x) => x.id === nw.id)!;
      expect(news.blocks[0].url).toBe(r.body.newUrl);
      expect(news.blocks[0].caption).toBe("Unterschrift");
      expect(news.imageUrl).toBe(other);

      const fresh = await size(request, r.body.newUrl);
      expect(fresh.status).toBe(200);
      expect(fresh.type).toBe("image/webp");
      expect(fresh.bytes).toBe(r.body.after);
      expect((await size(request, shared)).status).toBe(404); // Original gelöscht
      expect((await size(request, other)).status).toBe(200);
    } finally {
      await removeVia(request, "events", ev.id);
      await removeVia(request, "news", nw.id);
    }
  });

  test("Hochformat (EXIF-Drehung) bleibt Hochformat, Grösse höchstens 960 px", async ({ request }) => {
    await apiLogin(request);
    const portrait = await sharp(await bigJpeg(3000, 2000)).withMetadata({ orientation: 6 }).jpeg({ quality: 93 }).toBuffer(); // Drehung um 90°
    const url = await putFake(request, `${uniq("hoch").replace(/\s/g, "")}.jpg`, portrait);
    const ev = await createVia(request, "events", { title: uniq("Hoch"), date: "2098-03-06", imageUrl: url });
    try {
      const r = await optimize(request, url);
      expect(r.body.status).toBe("verkleinert");
      const meta = await sharp(Buffer.from(await (await request.get(r.body.newUrl)).body())).metadata();
      expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(960);
      expect(meta.height!).toBeGreaterThan(meta.width!); // Hochformat
      expect(meta.format).toBe("webp");
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Abgelehnt: Bild ohne Verwendung, fremde Adresse; unlesbares Bild lässt alles unverändert", async ({ request }) => {
    await apiLogin(request);
    const unused = await putFake(request, `${uniq("unbenutzt").replace(/\s/g, "")}.jpg`, big);
    const a = await optimize(request, unused);
    expect(a.http).toBe(422);
    expect(a.body.message).toMatch(/nirgends verwendet/);
    expect((await size(request, unused)).status).toBe(200); // nichts gelöscht

    const ev0 = await createVia(request, "events", { title: uniq("Fremd"), date: "2098-03-07", imageUrl: "https://example.org/fremd.jpg" });
    const b = await optimize(request, "https://example.org/fremd.jpg");
    expect(b.http).toBe(422);
    expect(b.body.message).toMatch(/nicht in diesem Bildspeicher/);
    await removeVia(request, "events", ev0.id);

    const corrupt = await putFake(request, `${uniq("kaputt").replace(/\s/g, "")}.jpg`, Buffer.alloc(600 * 1024, 7));
    const ev = await createVia(request, "events", { title: uniq("Kaputt"), date: "2098-03-08", imageUrl: corrupt });
    try {
      const c = await optimize(request, corrupt);
      expect(c.http).toBe(422);
      expect(c.body.status).toBe("fehler");
      expect((await listEvent(request, ev.id)).imageUrl).toBe(corrupt); // Datenbank unverändert
      expect((await size(request, corrupt)).status).toBe(200); // Original bleibt
    } finally {
      await removeVia(request, "events", ev.id);
    }
    expect((await request.post("/api/admin/optimize-images", { data: {} })).status()).toBe(400);
  });

  test("Bereits kleines Bild wird übersprungen und nicht angefasst", async ({ request }) => {
    await apiLogin(request);
    const tiny = await putFake(request, `${uniq("klein").replace(/\s/g, "")}.webp`, await sharp({ create: { width: 500, height: 300, channels: 3, background: "#a22" } }).webp({ quality: 70 }).toBuffer(), "image/webp");
    const ev = await createVia(request, "events", { title: uniq("Klein"), date: "2098-03-09", imageUrl: tiny });
    try {
      const r = await optimize(request, tiny);
      expect(r.body.status).toBe("übersprungen");
      expect((await listEvent(request, ev.id)).imageUrl).toBe(tiny);
      expect((await size(request, tiny)).status).toBe(200);
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });

  test("Oberfläche: Prüfen, Vorschau, Verkleinern mit Bestätigung, Ergebnis", async ({ page, request }) => {
    await apiLogin(request);
    const urls = [await putFake(request, `${uniq("ui1").replace(/\s/g, "")}.jpg`, big), await putFake(request, `${uniq("ui2").replace(/\s/g, "")}.jpg`, big)];
    const evs = [
      await createVia(request, "events", { title: uniq("UI 1"), date: "2098-04-01", imageUrl: urls[0] }),
      await createVia(request, "events", { title: uniq("UI 2"), date: "2098-04-02", blocks: [{ type: "image", url: urls[1] }] }),
    ];
    try {
      await loginUi(page);
      await page.goto("/admin/images");
      await expect(page.getByTestId("summary")).toContainText(/lassen sich verkleinern/);
      await expect(page.locator('li[data-candidate="true"]')).toHaveCount(2);

      await page.getByRole("button", { name: "Vorschau berechnen" }).click();
      await expect(page.getByTestId("summary")).toContainText(/Vorschau: etwa/);
      expect((await size(request, urls[0])).status).toBe(200); // Vorschau ändert nichts

      page.once("dialog", (d) => { expect(d.message()).toMatch(/endgültig gelöscht/); void d.accept(); });
      await page.getByRole("button", { name: "Jetzt verkleinern" }).click();
      await expect(page.getByTestId("summary")).toContainText(/Erledigt: .* gespart \(2 Bilder\)/, { timeout: 60_000 });
      await expect(page.locator("li", { hasText: "✓" })).toHaveCount(2);
      expect((await size(request, urls[0])).status).toBe(404);
      expect((await size(request, urls[1])).status).toBe(404);
      expect((await listEvent(request, evs[0].id)).imageUrl).not.toBe(urls[0]);

      await page.getByRole("button", { name: "Neu prüfen" }).click();
      await expect(page.getByTestId("summary")).toContainText(/Nichts zu verkleinern/);
    } finally {
      for (const e of evs) await removeVia(request, "events", e.id);
    }
  });

  test("Abbruch der Bestätigung verändert nichts", async ({ page, request }) => {
    await apiLogin(request);
    const url = await putFake(request, `${uniq("abbr").replace(/\s/g, "")}.jpg`, big);
    const ev = await createVia(request, "events", { title: uniq("Abbruch"), date: "2098-04-03", imageUrl: url });
    try {
      await loginUi(page);
      await page.goto("/admin/images");
      await expect(page.locator('li[data-candidate="true"]').first()).toBeVisible();
      page.once("dialog", (d) => void d.dismiss());
      await page.getByRole("button", { name: "Jetzt verkleinern" }).click();
      await page.waitForTimeout(500);
      expect((await size(request, url)).status).toBe(200);
      expect((await listEvent(request, ev.id)).imageUrl).toBe(url);
    } finally {
      await removeVia(request, "events", ev.id);
    }
  });
});
