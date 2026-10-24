"use client";

import { useEffect, useRef, useState } from "react";
import type { CalloutTone, NewsBlock } from "@/lib/types";
import { dropEmptyBlocks, isSafeHref } from "@/lib/blocks";
import ImageField from "./ImageField";
import { LIMITS } from "@/lib/blocks";
import { resizeImage } from "@/lib/image-resize";
import { uploadImage } from "@/lib/upload-image";

// Editor für die Bausteine eines News-Beitrags.
// Jeder Baustein ist eine Karte mit Pfeilen (verschieben) und ✕ (entfernen). Neue Bausteine
// kommen über die Auswahl unten dazu.

type Entry = { key: string; block: NewsBlock };
type Patch = (partial: Record<string, unknown>) => void;

let seq = 0;
const newKey = () => `blk${Date.now().toString(36)}${seq++}`;

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-black/[0.04]";
const labelCls = "text-xs font-semibold block mb-1.5";

type AddableType = "text" | "image" | "gallery" | "table" | "callout" | "button" | "divider";

const ADDABLE: { type: AddableType; label: string; icon: string }[] = [
  { type: "text", label: "Text", icon: "T" },
  { type: "image", label: "Bild", icon: "▣" },
  { type: "gallery", label: "Galerie", icon: "▦" },
  { type: "table", label: "Tabelle", icon: "▤" },
  { type: "callout", label: "Hinweis", icon: "!" },
  { type: "button", label: "Button", icon: "◉" },
  { type: "divider", label: "Trennlinie", icon: "—" },
];

const META: Record<NewsBlock["type"], { title: string; icon: string }> = {
  text: { title: "Text", icon: "T" },
  image: { title: "Bild", icon: "▣" },
  callout: { title: "Hinweis-Box", icon: "!" },
  button: { title: "Button", icon: "◉" },
  divider: { title: "Trennlinie", icon: "—" },
  gallery: { title: "Galerie", icon: "▦" },
  table: { title: "Tabelle", icon: "▤" },
};

function emptyBlock(type: AddableType): NewsBlock {
  switch (type) {
    case "text": return { type: "text", text: "" };
    case "image": return { type: "image", url: "", caption: "" };
    case "gallery": return { type: "gallery", images: [] };
    case "table": return { type: "table", header: true, rows: [["", ""], ["", ""], ["", ""]] };
    case "callout": return { type: "callout", tone: "important", text: "" };
    case "button": return { type: "button", label: "", url: "" };
    default: return { type: "divider" };
  }
}

/* ───────────── Text mit Knöpfen für Fett / Link / Liste ───────────── */

function TextEditor({ value, onChange, rows = 5, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [link, setLink] = useState<null | { label: string; url: string; error: string; start: number; end: number }>(null);

  function apply(fn: (before: string, sel: string, after: string) => { text: string; selStart: number; selEnd: number }) {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const r = fn(value.slice(0, s), value.slice(s, e), value.slice(e));
    onChange(r.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.selStart, r.selEnd);
    });
  }

  const bold = () =>
    apply((b, sel, a) =>
      sel
        ? { text: `${b}**${sel}**${a}`, selStart: b.length + 2, selEnd: b.length + 2 + sel.length }
        : { text: `${b}**fett**${a}`, selStart: b.length + 2, selEnd: b.length + 6 }
    );

  const list = () =>
    apply((b, sel, a) => {
      const lineStart = b.lastIndexOf("\n") + 1;
      const head = b.slice(0, lineStart);
      const lines = (b.slice(lineStart) + sel).split("\n").map((l) => (l.startsWith("- ") ? l : `- ${l}`));
      const out = lines.join("\n");
      return { text: head + out + a, selStart: head.length, selEnd: head.length + out.length };
    });

  function openLink() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setLink({ label: value.slice(start, end), url: "", error: "", start, end });
  }

  function insertLink() {
    if (!link) return;
    const url = link.url.trim();
    const label = (link.label.trim() || url).replace(/[\[\]]/g, "");
    if (!isSafeHref(url) || /[\s)]/.test(url)) {
      setLink({ ...link, error: "Der Link muss mit https://, mailto: oder tel: beginnen und darf keine Leerzeichen enthalten." });
      return;
    }
    const insert = `[${label}](${url})`;
    onChange(value.slice(0, link.start) + insert + value.slice(link.end));
    setLink(null);
  }

  const tb = "px-3 py-1.5 rounded-lg text-xs font-bold";
  const tbStyle = { background: "var(--field-bg)" };

  return (
    <div>
      <div className="flex gap-1.5 mb-2" role="toolbar" aria-label="Textformat">
        <button type="button" className={tb} style={tbStyle} onMouseDown={(e) => e.preventDefault()} onClick={bold} aria-label="Fett">B</button>
        <button type="button" className={tb} style={tbStyle} onMouseDown={(e) => e.preventDefault()} onClick={openLink} aria-label="Link einfügen">🔗 Link</button>
        <button type="button" className={tb} style={tbStyle} onMouseDown={(e) => e.preventDefault()} onClick={list} aria-label="Aufzählung">• Liste</button>
      </div>
      {link && (
        <div className="rounded-xl p-3 mb-2 space-y-2" style={{ background: "var(--surface-subtle)" }}>
          <input value={link.label} onChange={(e) => setLink({ ...link, label: e.target.value })} placeholder="Angezeigter Text" className={inputCls} aria-label="Angezeigter Text" />
          <input value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value, error: "" })} placeholder="https://…" inputMode="url" className={inputCls} aria-label="Link-Adresse" />
          {link.error && <p className="text-xs" style={{ color: "#ff3b30" }} role="alert">{link.error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setLink(null)} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--field-bg)" }}>Abbrechen</button>
            <button type="button" onClick={insertLink} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}>Link einfügen</button>
          </div>
        </div>
      )}
      <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={`${inputCls} resize-y`} />
    </div>
  );
}

/* ───────────── Editor pro Baustein ───────────── */

function BlockBody({ block, patch }: { block: NewsBlock; patch: Patch }) {
  switch (block.type) {
    case "text":
      return <TextEditor value={block.text} onChange={(text) => patch({ text })} placeholder="Text eingeben…" />;

    case "image":
      return (
        <div className="space-y-3">
          <ImageField value={block.url || null} onChange={(url) => patch({ url: url ?? "" })} />
          <label className="block">
            <span className={labelCls} style={{ color: "var(--text-secondary)" }}>Bildunterschrift (optional)</span>
            <input value={block.caption ?? ""} onChange={(e) => patch({ caption: e.target.value })} className={inputCls} />
          </label>
        </div>
      );

    case "callout":
      return (
        <div className="space-y-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--field-bg)" }} role="group" aria-label="Art des Hinweises">
            {([["important", "Wichtig"], ["info", "Info"]] as [CalloutTone, string][]).map(([tone, label]) => (
              <button
                key={tone}
                type="button"
                onClick={() => patch({ tone })}
                aria-pressed={block.tone === tone}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: block.tone === tone ? "var(--accent-hex)" : "transparent",
                  color: block.tone === tone ? "var(--accent-foreground)" : "var(--text-secondary)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <TextEditor value={block.text} onChange={(text) => patch({ text })} rows={3} placeholder="Hinweistext, z. B. „Anmeldeschluss ist der 30. Mai.“" />
        </div>
      );

    case "button": {
      const urlBad = block.url.trim() !== "" && !isSafeHref(block.url);
      return (
        <div className="space-y-3">
          <label className="block">
            <span className={labelCls} style={{ color: "var(--text-secondary)" }}>Beschriftung</span>
            <input value={block.label} onChange={(e) => patch({ label: e.target.value })} placeholder="z. B. Jetzt anmelden" className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls} style={{ color: "var(--text-secondary)" }}>Link</span>
            <input value={block.url} onChange={(e) => patch({ url: e.target.value })} placeholder="https://…" inputMode="url" aria-invalid={urlBad} className={inputCls} />
            {urlBad && (
              <span className="text-xs block mt-1" style={{ color: "#ff3b30" }} role="alert">
                Der Link muss mit https://, mailto: oder tel: beginnen.
              </span>
            )}
          </label>
        </div>
      );
    }

    case "divider":
      return <div className="h-px my-2" style={{ background: "var(--hairline)" }} aria-hidden="true" />;

    case "gallery":
      return <GalleryEditor images={block.images} onChange={(images) => patch({ images })} />;

    case "table":
      return <TableEditor header={block.header} rows={block.rows} onChange={(rows, header) => patch({ rows, header })} />;
  }
}

/* ───────────── Tabelle ───────────── */

// Tabelle aus Excel/Sheets: Zellen sind durch Tabulator, Zeilen durch Zeilenumbruch getrennt
export function parsePastedTable(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  const rows = lines.map((l) => l.split("\t").map((c) => c.trim().replace(/^"([\s\S]*)"$/, "$1")));
  return rows.slice(0, LIMITS.tableRows).map((r) => r.slice(0, LIMITS.tableCols));
}

function TableEditor({ header, rows, onChange }: { header: boolean; rows: string[][]; onChange: (rows: string[][], header: boolean) => void }) {
  const cols = Math.max(1, rows.reduce((m, r) => Math.max(m, r.length), 0));
  const [paste, setPaste] = useState("");
  const grid = rows.map((r) => [...r, ...Array(cols - r.length).fill("")]);

  const setCell = (ri: number, ci: number, v: string) => onChange(grid.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? v : c)) : r)), header);
  const addRow = () => onChange([...grid, Array(cols).fill("")], header);
  const addCol = () => onChange(grid.map((r) => [...r, ""]), header);
  const delRow = (ri: number) => onChange(grid.filter((_, i) => i !== ri), header);
  const delCol = (ci: number) => onChange(grid.map((r) => r.filter((_, j) => j !== ci)), header);

  function applyPaste(text: string) {
    const parsed = parsePastedTable(text);
    if (parsed.length === 0 || parsed.every((r) => r.every((c) => c === ""))) return;
    const w = parsed.reduce((m, r) => Math.max(m, r.length), 0);
    onChange(parsed.map((r) => [...r, ...Array(w - r.length).fill("")]), header);
    setPaste("");
  }

  const mini = "px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30";
  const miniStyle = { background: "var(--field-bg)" };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="text-sm border-separate" style={{ borderSpacing: 4 }}>
          <tbody>
            {grid.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci}>
                    <input
                      value={c}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      aria-label={`Zeile ${ri + 1}, Spalte ${ci + 1}`}
                      className={`${inputCls} min-w-[7rem] ${header && ri === 0 ? "font-bold" : ""}`}
                    />
                  </td>
                ))}
                <td>
                  <button type="button" className="w-8 h-8 rounded-lg text-sm disabled:opacity-30" style={miniStyle} onClick={() => delRow(ri)} disabled={grid.length <= 1} aria-label={`Zeile ${ri + 1} entfernen`}>✕</button>
                </td>
              </tr>
            ))}
            <tr>
              {Array.from({ length: cols }).map((_, ci) => (
                <td key={ci} className="text-center">
                  <button type="button" className="w-8 h-8 rounded-lg text-sm disabled:opacity-30" style={miniStyle} onClick={() => delCol(ci)} disabled={cols <= 1} aria-label={`Spalte ${ci + 1} entfernen`}>✕</button>
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={mini} style={miniStyle} onClick={addRow} disabled={grid.length >= LIMITS.tableRows}>+ Zeile</button>
        <button type="button" className={mini} style={miniStyle} onClick={addCol} disabled={cols >= LIMITS.tableCols}>+ Spalte</button>
        <label className="flex items-center gap-2 text-xs font-semibold ml-auto">
          <input type="checkbox" checked={header} onChange={(e) => onChange(grid, e.target.checked)} className="w-4 h-4" />
          Erste Zeile ist Kopfzeile
        </label>
      </div>

      <details className="rounded-xl p-3" style={{ background: "var(--surface-subtle)" }}>
        <summary className="text-xs font-semibold cursor-pointer">Aus Excel einfügen</summary>
        <p className="text-xs my-2" style={{ color: "var(--text-secondary)" }}>
          In Excel die Zellen markieren und kopieren, dann hier einfügen. Die bisherige Tabelle wird ersetzt (max. {LIMITS.tableRows} Zeilen, {LIMITS.tableCols} Spalten).
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            applyPaste(e.clipboardData.getData("text"));
          }}
          rows={3}
          aria-label="Tabelle aus Excel einfügen"
          placeholder="Hier einfügen (Strg+V / Cmd+V)"
          className={`${inputCls} resize-y`}
        />
        {paste.trim() !== "" && (
          <button type="button" className={`${mini} mt-2`} style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }} onClick={() => applyPaste(paste)}>
            Tabelle übernehmen
          </button>
        )}
      </details>
    </div>
  );
}

/* ───────────── Galerie ───────────── */

type GImg = { url: string; thumbUrl?: string; caption?: string };

// Aus einem Foto zwei Dateien machen: Vorschau (klein, für das Raster) und Grossansicht
async function prepare(file: File): Promise<{ full: File; thumb: File }> {
  const full = await resizeImage(file, { maxEdge: 1280, targetKb: 180 });
  const thumb = await resizeImage(file, { maxEdge: 480, targetKb: 35 });
  return { full, thumb };
}

function GalleryEditor({ images, onChange }: { images: GImg[]; onChange: (images: GImg[]) => void }) {
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const latest = useRef(images);
  latest.current = images;

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length === 0) return;
    setErrors([]);
    const room = LIMITS.galleryImages - latest.current.length;
    const errs: string[] = [];
    if (files.length > room) errs.push(`Es passen höchstens ${LIMITS.galleryImages} Bilder in eine Galerie – ${files.length - Math.max(room, 0)} wurden nicht übernommen.`);
    let done = 0;
    for (const file of files.slice(0, Math.max(room, 0))) {
      setBusy(`Bild ${done + 1} von ${Math.min(files.length, room)} wird verarbeitet…`);
      try {
        const { full, thumb } = await prepare(file);
        const url = await uploadImage(full);
        const thumbUrl = await uploadImage(thumb);
        // Immer auf den aktuellen Stand aufsetzen (zwischenzeitlich kann etwas geändert worden sein)
        onChange([...latest.current, { url, thumbUrl }]);
        latest.current = [...latest.current, { url, thumbUrl }];
      } catch (err) {
        errs.push(`${file.name}: ${(err as Error).message}`);
      }
      done++;
    }
    setBusy("");
    setErrors(errs);
  }

  const patchAt = (i: number, partial: Partial<GImg>) => onChange(images.map((im, k) => (k === i ? { ...im, ...partial } : im)));
  const removeAt = (i: number) => onChange(images.filter((_, k) => k !== i));
  const moveAt = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const ctl = "w-8 h-8 rounded-lg text-sm disabled:opacity-30";
  const ctlStyle = { background: "var(--field-bg)" };

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {images.map((im, i) => (
            <li key={`${im.url}-${i}`} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.thumbUrl || im.url} alt={im.caption || `Bild ${i + 1}`} className="w-full h-24 object-cover" />
              <div className="p-1.5 space-y-1.5">
                <input
                  value={im.caption ?? ""}
                  onChange={(e) => patchAt(i, { caption: e.target.value })}
                  placeholder="Beschriftung"
                  aria-label={`Beschriftung Bild ${i + 1}`}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none bg-black/[0.04]"
                />
                <div className="flex gap-1 justify-between">
                  <button type="button" className={ctl} style={ctlStyle} onClick={() => moveAt(i, -1)} disabled={i === 0} aria-label={`Bild ${i + 1} nach vorne`}>←</button>
                  <button type="button" className={ctl} style={ctlStyle} onClick={() => moveAt(i, 1)} disabled={i === images.length - 1} aria-label={`Bild ${i + 1} nach hinten`}>→</button>
                  <button type="button" className={ctl} style={ctlStyle} onClick={() => removeAt(i)} aria-label={`Bild ${i + 1} entfernen`}>✕</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label
        className="block text-sm font-semibold py-2.5 px-4 rounded-xl text-center cursor-pointer"
        style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)", opacity: busy ? 0.6 : 1 }}
      >
        {busy || (images.length ? "Weitere Bilder hinzufügen" : "Bilder auswählen (mehrere möglich)")}
        <input type="file" accept="image/*" multiple onChange={onFiles} className="hidden" disabled={Boolean(busy)} />
      </label>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Die Bilder werden automatisch verkleinert{images.length ? ` (aktuell ${images.length} ${images.length === 1 ? "Bild" : "Bilder"})` : ""}.
      </p>
      {errors.map((m, i) => (
        <p key={i} className="text-xs" style={{ color: "#ff3b30" }} role="alert">{m}</p>
      ))}
    </div>
  );
}

/* ───────────── Der Editor ───────────── */

export default function BlocksEditor({ value, onChange }: { value: NewsBlock[]; onChange: (blocks: NewsBlock[]) => void }) {
  const [entries, setEntries] = useState<Entry[]>(() => value.map((block) => ({ key: newKey(), block })));
  const initial = useRef(entries);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Änderungen nach aussen melden (nicht beim ersten Anzeigen)
  useEffect(() => {
    if (entries !== initial.current) onChangeRef.current(entries.map((e) => e.block));
  }, [entries]);

  // Immer auf den AKTUELLEN Stand aufsetzen (z. B. wenn ein Bild-Upload fertig wird, während
  // in einem anderen Feld weitergetippt wurde)
  const patchBlock = (key: string, partial: Record<string, unknown>) =>
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, block: { ...e.block, ...partial } as NewsBlock } : e)));

  function move(i: number, dir: -1 | 1) {
    setEntries((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function remove(i: number) {
    const e = entries[i];
    const isEmpty = e.block.type === "divider" || dropEmptyBlocks([e.block]).length === 0;
    if (!isEmpty && !window.confirm("Diesen Baustein wirklich entfernen?")) return;
    setEntries((prev) => prev.filter((x) => x.key !== e.key));
  }

  function add(type: AddableType) {
    const entry: Entry = { key: newKey(), block: emptyBlock(type) };
    setEntries((prev) => [...prev, entry]);
    // Zum neuen Baustein scrollen – ohne Animation, wenn das Gerät "Bewegung reduzieren" eingestellt hat
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => document.getElementById(entry.key)?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }));
  }

  const ctl = "w-8 h-8 rounded-lg text-sm disabled:opacity-30";
  const ctlStyle = { background: "var(--field-bg)" };

  return (
    <div>
      {entries.length === 0 && (
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Noch keine Bausteine. Wähle unten, womit du beginnen möchtest.
        </p>
      )}

      <div className="space-y-2.5">
        {entries.map((e, i) => {
          const meta = META[e.block.type];
          return (
            <div
              key={e.key}
              id={e.key}
              role="group"
              aria-label={`Baustein ${i + 1}: ${meta.title}`}
              className="rounded-2xl"
              style={{ border: "1px solid var(--hairline)", background: "var(--bg-primary)" }}
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-t-2xl text-sm font-bold" style={{ background: "var(--surface-subtle)", borderBottom: "1px solid var(--hairline)" }}>
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background: "rgba(var(--accent), 0.12)", color: "var(--accent-text)" }} aria-hidden="true">
                  {meta.icon}
                </span>
                <span className="flex-1">{meta.title}</span>
                <button type="button" className={ctl} style={ctlStyle} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Baustein nach oben">↑</button>
                <button type="button" className={ctl} style={ctlStyle} onClick={() => move(i, 1)} disabled={i === entries.length - 1} aria-label="Baustein nach unten">↓</button>
                <button type="button" className={ctl} style={ctlStyle} onClick={() => remove(i)} aria-label="Baustein entfernen">✕</button>
              </div>
              <div className="p-3">
                <BlockBody block={e.block} patch={(partial) => patchBlock(e.key, partial)} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs font-semibold mt-4 mb-2" style={{ color: "var(--text-secondary)" }}>Baustein hinzufügen</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {ADDABLE.map((a) => (
          <button
            key={a.type}
            type="button"
            onClick={() => add(a.type)}
            className="rounded-2xl py-2.5 text-xs font-semibold"
            style={{ border: "1px solid var(--hairline)", background: "var(--bg-primary)" }}
          >
            <span className="block text-lg leading-none mb-1" style={{ color: "var(--accent-text)" }} aria-hidden="true">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
