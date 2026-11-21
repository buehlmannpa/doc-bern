import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const ADMIN = { username: "patrick", password: "test-passwort" };

let counter = 0;
export const uniq = (prefix: string) => `${prefix} ${Date.now().toString(36)}${counter++}`;

// Gültiges PNG (8x8, einfarbig), im Test erzeugt. Genügt für die Upload-Tests (Verkleinerung läuft trotzdem im Browser).
function makePng(size = 8): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0xc8)]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const idat = require("node:zlib").deflateSync(raw);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}
export const PNG = makePng();
const GIF = Buffer.from("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64");

/** Anmelden über die Weboberfläche (echter Login gegen die Test-Datenbank). */
export async function loginUi(page: Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("Benutzername").fill(ADMIN.username);
  await page.getByPlaceholder("Passwort").fill(ADMIN.password);
  await page.getByRole("button", { name: /Anmelden|Login/i }).click();
  // Die Anmeldeseite heisst ebenfalls "Admin-Bereich": erst die Weiterleitung abwarten, dann das Dashboard prüfen
  await page.waitForURL((url) => !url.pathname.includes("/admin/login"));
  await expect(page.getByText("Wähle einen Bereich")).toBeVisible();
}

/** Anmelden über die API (für das Anlegen von Testdaten). Das Cookie bleibt im Kontext. */
export async function apiLogin(request: APIRequestContext) {
  const res = await request.post("/api/auth/login", { data: ADMIN });
  expect(res.status()).toBe(200);
}

/** Datensatz über die Admin-API anlegen und die Antwort zurückgeben. */
export async function createVia(request: APIRequestContext, kind: "news" | "events", data: Record<string, unknown>) {
  const res = await request.post(`/api/admin/${kind}`, { data });
  expect(res.status(), await res.text()).toBe(200);
  const json = await res.json();
  return (kind === "news" ? json.item : json.event) as { id: string };
}

export async function removeVia(request: APIRequestContext, kind: "news" | "events", id: string) {
  await request.delete(`/api/admin/${kind}?id=${encodeURIComponent(id)}`);
}

/** Bild-Speicher simulieren: Upload liefert eine Adresse, Aufräum-Aufrufe werden mitgeschrieben. */
export async function mockStorage(page: Page) {
  const state = { uploads: [] as string[], discards: [] as string[][] };
  await page.route("**/api/admin/upload-file", (route) => {
    const url = `https://store.public.blob.vercel-storage.com/test-${state.uploads.length + 1}.webp`;
    state.uploads.push(url);
    return route.fulfill({ json: { url } });
  });
  await page.route("**/api/admin/discard-uploads", (route) => {
    state.discards.push(JSON.parse(route.request().postData() || "{}").urls);
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("https://store.public.blob.vercel-storage.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/gif", body: GIF })
  );
  return state;
}

/** Die Bausteine eines Test-Beitrags: Text, Tabelle, Button. */
export const sampleBlocks = (marker: string) => [
  { type: "text", text: `Programm ${marker} mit **fett**` },
  { type: "table", header: true, rows: [["Zeit", "Was"], ["09:00", `Start ${marker}`]] },
  { type: "button", label: "Anmelden", url: "https://example.org/anmeldung" },
];

export const modal = (page: Page) => page.locator("div.fixed.inset-0").last();
