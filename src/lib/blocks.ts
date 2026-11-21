import type { NewsBlock, NewsItem, NewsListItem, EventItem, EventListItem, CalloutTone } from "./types";

// Prüfung und Bereinigung der Bausteine eines News-Beitrags.
// Wird beim Speichern (API) verwendet, damit nur erlaubte, begrenzte Daten in der
// Datenbank landen. Die Anzeige prüft Links zusätzlich selbst (mehrfache Absicherung).

export const LIMITS = {
  blocks: 100,
  text: 20000,
  caption: 300,
  label: 120,
  tableRows: 50,
  tableCols: 8,
  cell: 500,
  galleryImages: 60,
  url: 2000,
} as const;

// Erlaubte Links: https, mailto, tel oder ein interner Pfad ("/events"). Nie javascript: o. ä.
export function isSafeHref(url: string): boolean {
  const u = url.trim();
  if (!u || u.length > LIMITS.url) return false;
  if (u.startsWith("/") && !u.startsWith("//")) return true;
  return /^(https:\/\/|mailto:|tel:)/i.test(u);
}

// Bilder nur über https (Vercel Blob oder externe https-Adresse) oder ein Pfad der eigenen Seite
export function isSafeImageUrl(url: string): boolean {
  const u = url.trim();
  if (u.length === 0 || u.length > LIMITS.url) return false;
  if (u.startsWith("/") && !u.startsWith("//")) return true;
  return /^https:\/\//i.test(u);
}

function str(v: unknown, max: number, field: string): string {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") throw new Error(`${field}: Text erwartet.`);
  if (v.length > max) throw new Error(`${field}: zu lang (max. ${max} Zeichen).`);
  return v;
}

function optStr(v: unknown, max: number, field: string): string | undefined {
  const s = str(v, max, field).trim();
  return s ? s : undefined;
}

function imageUrl(v: unknown, field: string): string {
  const s = str(v, LIMITS.url, field).trim();
  if (!isSafeImageUrl(s)) throw new Error(`${field}: ungültige Bildadresse (nur https erlaubt).`);
  return s;
}

// Wirft einen Error mit verständlicher deutscher Meldung bei ungültigen Daten.
export function sanitizeBlocks(input: unknown): NewsBlock[] {
  if (!Array.isArray(input)) throw new Error("Inhalt: Liste von Bausteinen erwartet.");
  if (input.length > LIMITS.blocks) throw new Error(`Inhalt: zu viele Bausteine (max. ${LIMITS.blocks}).`);

  return input.map((raw, i): NewsBlock => {
    const where = `Baustein ${i + 1}`;
    if (!raw || typeof raw !== "object") throw new Error(`${where}: ungültig.`);
    const b = raw as Record<string, unknown>;

    switch (b.type) {
      case "text":
        return { type: "text", text: str(b.text, LIMITS.text, `${where} (Text)`) };

      case "image": {
        const caption = optStr(b.caption, LIMITS.caption, `${where} (Bildunterschrift)`);
        return { type: "image", url: imageUrl(b.url, `${where} (Bild)`), ...(caption ? { caption } : {}) };
      }

      case "gallery": {
        if (!Array.isArray(b.images)) throw new Error(`${where} (Galerie): Bilderliste erwartet.`);
        if (b.images.length > LIMITS.galleryImages) {
          throw new Error(`${where} (Galerie): zu viele Bilder (max. ${LIMITS.galleryImages}).`);
        }
        const images = b.images.map((im, k) => {
          if (!im || typeof im !== "object") throw new Error(`${where} (Galerie): Bild ${k + 1} ungültig.`);
          const o = im as Record<string, unknown>;
          const caption = optStr(o.caption, LIMITS.caption, `${where} (Galerie, Bildunterschrift)`);
          const thumb = optStr(o.thumbUrl, LIMITS.url, `${where} (Galerie, Vorschau)`);
          if (thumb && !isSafeImageUrl(thumb)) throw new Error(`${where} (Galerie): ungültige Vorschau-Adresse.`);
          return {
            url: imageUrl(o.url, `${where} (Galerie, Bild ${k + 1})`),
            ...(thumb ? { thumbUrl: thumb } : {}),
            ...(caption ? { caption } : {}),
          };
        });
        return { type: "gallery", images };
      }

      case "table": {
        if (!Array.isArray(b.rows)) throw new Error(`${where} (Tabelle): Zeilen erwartet.`);
        if (b.rows.length > LIMITS.tableRows) throw new Error(`${where} (Tabelle): zu viele Zeilen (max. ${LIMITS.tableRows}).`);
        const rows = b.rows.map((r, k) => {
          if (!Array.isArray(r)) throw new Error(`${where} (Tabelle): Zeile ${k + 1} ungültig.`);
          if (r.length > LIMITS.tableCols) throw new Error(`${where} (Tabelle): zu viele Spalten (max. ${LIMITS.tableCols}).`);
          return r.map((c) => str(c, LIMITS.cell, `${where} (Tabelle, Zelle)`));
        });
        // Alle Zeilen auf gleiche Spaltenzahl bringen
        const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
        const padded = rows.map((r) => [...r, ...Array(cols - r.length).fill("")]);
        return { type: "table", header: b.header !== false, rows: padded };
      }

      case "button": {
        const label = str(b.label, LIMITS.label, `${where} (Button)`).trim();
        const url = str(b.url, LIMITS.url, `${where} (Button-Link)`).trim();
        if (!label) throw new Error(`${where} (Button): Beschriftung fehlt.`);
        if (!isSafeHref(url)) throw new Error(`${where} (Button): ungültiger Link (erlaubt: https, mailto, tel).`);
        return { type: "button", label, url };
      }

      case "callout": {
        const tone: CalloutTone = b.tone === "important" ? "important" : "info";
        return { type: "callout", tone, text: str(b.text, LIMITS.text, `${where} (Hinweis)`) };
      }

      case "divider":
        return { type: "divider" };

      default:
        throw new Error(`${where}: unbekannter Typ.`);
    }
  });
}

// Reiner Text aus den Bausteinen. Wird beim Speichern zusätzlich in "content" geschrieben,
// damit alte Ansichten/Rückbau weiterhin einen lesbaren Beitrag haben.
export function blocksToPlainText(blocks: NewsBlock[]): string {
  const plain = (t: string) =>
    t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "text" || b.type === "callout") parts.push(plain(b.text));
    else if (b.type === "table") parts.push(b.rows.map((r) => r.join(" | ")).join("\n"));
    else if (b.type === "button") parts.push(`${b.label}: ${b.url}`);
    else if (b.type === "image" && b.caption) parts.push(b.caption);
  }
  return parts.map((p) => p.trim()).filter(Boolean).join("\n\n");
}

// Leichte Listenform eines Beitrags (ohne Inhalt) – für Beispieldaten ohne Datenbank.
export function toEventListItem(e: EventItem): EventListItem {
  const { description, links, blocks, ...rest } = e;
  void description; void links; void blocks;
  return rest;
}

export function toNewsListItem(n: NewsItem): NewsListItem {
  const { content, links, blocks, ...rest } = n;
  return {
    ...rest,
    hasContent: Boolean(content?.trim()) || (links?.length ?? 0) > 0 || (blocks?.length ?? 0) > 0,
  };
}

// Alter Beitrag (nur Text + Link-Liste) -> Bausteine. Wird beim ersten Bearbeiten im Editor angewendet.
// Text wird bei Bedarf an Absatzgrenzen in mehrere Text-Bausteine geteilt (Längenlimit).
export function legacyToBlocks(content: string, links: { label: string; url: string }[]): NewsBlock[] {
  const blocks: NewsBlock[] = [];
  let rest = (content || "").trim();
  const max = LIMITS.text - 2000;
  while (rest) {
    if (rest.length <= max) { blocks.push({ type: "text", text: rest }); break; }
    let cut = rest.lastIndexOf("\n\n", max);
    if (cut < max / 2) cut = rest.lastIndexOf("\n", max);
    if (cut < max / 2) cut = max;
    blocks.push({ type: "text", text: rest.slice(0, cut).trim() });
    rest = rest.slice(cut).trim();
  }
  for (const l of links || []) {
    const url = (l.url || "").trim();
    if (!isSafeHref(url)) continue; // unsichere Links wurden schon bisher nicht angezeigt
    blocks.push({ type: "button", label: (l.label || "").trim() || url, url });
  }
  return blocks;
}

// Leere Bausteine vor dem Speichern entfernen (z. B. ein Textfeld, in das nichts geschrieben wurde).
export function dropEmptyBlocks(blocks: NewsBlock[]): NewsBlock[] {
  return blocks.filter((b) => {
    switch (b.type) {
      case "text":
      case "callout":
        return b.text.trim() !== "";
      case "image":
        return b.url.trim() !== "";
      case "button":
        return b.label.trim() !== "" || b.url.trim() !== ""; // halb ausgefüllt: Fehler beim Speichern zeigen
      case "gallery":
        return b.images.length > 0;
      case "table":
        return b.rows.some((r) => r.some((c) => c.trim() !== ""));
      default:
        return true; // Trennlinie
    }
  });
}

// Alle Bildadressen eines Beitrags: Titelbild sowie Bild- und Galerie-Bausteine (inkl. Vorschaubilder)
export function collectImageUrls(cover: unknown, blocks: unknown): string[] {
  const urls = new Set<string>();
  const add = (u: unknown) => {
    if (typeof u === "string" && u.trim()) urls.add(u.trim());
  };
  add(cover);
  if (Array.isArray(blocks)) {
    for (const b of blocks as Record<string, unknown>[]) {
      if (!b || typeof b !== "object") continue;
      if (b.type === "image") add(b.url);
      if (b.type === "gallery" && Array.isArray(b.images)) {
        for (const im of b.images as Record<string, unknown>[]) {
          add(im?.url);
          add(im?.thumbUrl);
        }
      }
    }
  }
  return [...urls];
}

// Bausteine aus einem Request prüfen. undefined = nicht mitgeschickt (bestehende bleiben unverändert),
// null = Bausteine entfernen. Ungültige Daten lösen einen verständlichen Fehler aus.
export function parseBlocks(v: unknown): NewsBlock[] | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return sanitizeBlocks(v);
}
