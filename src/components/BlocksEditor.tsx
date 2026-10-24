"use client";

import { useEffect, useRef, useState } from "react";
import type { CalloutTone, NewsBlock } from "@/lib/types";
import { dropEmptyBlocks, isSafeHref } from "@/lib/blocks";
import ImageField from "./ImageField";

// Editor für die Bausteine eines News-Beitrags.
// Jeder Baustein ist eine Karte mit Pfeilen (verschieben) und ✕ (entfernen). Neue Bausteine
// kommen über die Auswahl unten dazu. Baustein-Typen, die noch keinen Editor haben (Galerie,
// Tabelle), bleiben beim Bearbeiten unverändert erhalten.

type Entry = { key: string; block: NewsBlock };
type Patch = (partial: Record<string, unknown>) => void;

let seq = 0;
const newKey = () => `blk${Date.now().toString(36)}${seq++}`;

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-black/[0.04]";
const labelCls = "text-xs font-semibold block mb-1.5";

type AddableType = "text" | "image" | "callout" | "button" | "divider";

const ADDABLE: { type: AddableType; label: string; icon: string }[] = [
  { type: "text", label: "Text", icon: "T" },
  { type: "image", label: "Bild", icon: "▣" },
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
      const n = block.images.length;
      return <Unsupported text={`${n} ${n === 1 ? "Bild" : "Bilder"}`} />;

    case "table": {
      const cols = block.rows.reduce((m, r) => Math.max(m, r.length), 0);
      return <Unsupported text={`${block.rows.length} ${block.rows.length === 1 ? "Zeile" : "Zeilen"} × ${cols} ${cols === 1 ? "Spalte" : "Spalten"}`} />;
    }
  }
}

function Unsupported({ text }: { text: string }) {
  return (
    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
      {text}. Die Bearbeitung dieses Bausteins folgt in einer späteren Version. Er bleibt unverändert erhalten und lässt sich
      verschieben oder entfernen.
    </p>
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
