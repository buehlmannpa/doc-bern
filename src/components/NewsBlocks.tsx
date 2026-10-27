"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { NewsBlock } from "@/lib/types";
import { isSafeHref, isSafeImageUrl } from "@/lib/blocks";

// Stellt die Bausteine eines News-Beitrags im App-Design dar.
// Alles wird als normale React-Elemente gerendert (kein freies HTML), Links werden geprüft.

const GALLERY_TILES = 4; // so viele Kacheln zeigt das Raster, bei mehr Bildern "+N" auf der letzten

/* ───────────── Text mit minimaler, sicherer Formatierung ───────────── */

function SafeLink({ href, children }: { href: string; children: ReactNode }) {
  const style = { color: "var(--accent-text)" };
  const cls = "font-semibold underline-offset-2 hover:underline";
  if (href.startsWith("/")) return <Link href={href} className={cls} style={style}>{children}</Link>;
  const external = /^https:/i.test(href);
  return (
    <a href={href} className={cls} style={style} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

// **fett** und [Text](Link). Unsichere Links werden als normaler Text dargestellt.
function Inline({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={k++}>{m[1]}</strong>);
    } else if (isSafeHref(m[3])) {
      out.push(<SafeLink key={k++} href={m[3]}>{m[2]}</SafeLink>);
    } else {
      out.push(m[2]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out.map((n, i) => (typeof n === "string" ? <Fragment key={`t${i}`}>{n}</Fragment> : n))}</>;
}

type TextPart = { kind: "p"; lines: string[] } | { kind: "ul"; items: string[] };

function parseText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let cur: TextPart | null = null;
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.trim() === "") { cur = null; continue; }
    const li = line.match(/^\s*[-•]\s+(.*)$/);
    if (li) {
      if (!cur || cur.kind !== "ul") { cur = { kind: "ul", items: [] }; parts.push(cur); }
      cur.items.push(li[1]);
    } else {
      if (!cur || cur.kind !== "p") { cur = { kind: "p", lines: [] }; parts.push(cur); }
      cur.lines.push(line);
    }
  }
  return parts;
}

function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {parseText(text).map((p, i) =>
        p.kind === "ul" ? (
          <ul key={i} className="list-disc pl-5 space-y-1">
            {p.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}
          </ul>
        ) : (
          <p key={i}>
            {p.lines.map((l, j) => (
              <Fragment key={j}>{j > 0 && <br />}<Inline text={l} /></Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}

/* ───────────── Galerie mit Grossansicht ───────────── */

type GalleryImage = { url: string; thumbUrl?: string; caption?: string };

function Lightbox({ images, index, onClose, onIndex }: { images: GalleryImage[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const touchX = useRef<number | null>(null);
  const n = images.length;
  const prev = useCallback(() => onIndex((index - 1 + n) % n), [index, n, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % n), [index, n, onIndex]);

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // Seite dahinter nicht scrollen
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  const img = images[index];
  const btn = "absolute w-11 h-11 rounded-full flex items-center justify-center text-white text-xl";
  const btnStyle = { background: "rgba(255,255,255,0.16)" };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bildergalerie"
      className="fixed inset-0 z-[120] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null || n < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      }}
    >
      <button ref={closeRef} type="button" aria-label="Schliessen" onClick={onClose} className={`${btn} top-4 right-4`} style={btnStyle}>✕</button>
      {n > 1 && (
        <>
          <button type="button" aria-label="Vorheriges Bild" onClick={(e) => { e.stopPropagation(); prev(); }} className={`${btn} left-3 top-1/2 -translate-y-1/2`} style={btnStyle}>‹</button>
          <button type="button" aria-label="Nächstes Bild" onClick={(e) => { e.stopPropagation(); next(); }} className={`${btn} right-3 top-1/2 -translate-y-1/2`} style={btnStyle}>›</button>
        </>
      )}
      <figure className="max-w-full px-14 text-center" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.caption || `Bild ${index + 1}`} className="max-h-[80vh] max-w-full mx-auto object-contain rounded-lg" />
        <figcaption className="mt-3 text-sm text-white/90">
          {img.caption && <span className="block mb-1">{img.caption}</span>}
          <span className="text-white/60 text-xs">{index + 1} / {n}</span>
        </figcaption>
      </figure>
    </div>,
    document.body
  );
}

function Gallery({ images }: { images: GalleryImage[] }) {
  const valid = images.filter((i) => isSafeImageUrl(i.url));
  const [open, setOpen] = useState<number | null>(null);
  if (valid.length === 0) return null;
  const shown = valid.slice(0, GALLERY_TILES);
  const more = valid.length - GALLERY_TILES;

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        {shown.map((im, i) => {
          const thumb = im.thumbUrl && isSafeImageUrl(im.thumbUrl) ? im.thumbUrl : im.url;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Bild ${i + 1} von ${valid.length} vergrössern`}
              className="relative block w-full aspect-[4/3] overflow-hidden rounded-xl"
              style={{ background: "var(--surface-subtle)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt={im.caption || ""} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
              {i === shown.length - 1 && more > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-2xl font-extrabold" style={{ background: "rgba(0,0,0,0.5)" }}>
                  +{more}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {open !== null && <Lightbox images={valid} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
    </>
  );
}

/* ───────────── Tabelle ───────────── */

function Table({ header, rows }: { header: boolean; rows: string[][] }) {
  if (rows.length === 0) return null;
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const head = header ? rows[0] : null;
  const body = header ? rows.slice(1) : rows;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse" style={cols > 3 ? { minWidth: `${cols * 7}rem` } : undefined}>
          {head && (
            <thead>
              <tr>
                {head.map((c, i) => (
                  <th key={i} scope="col" className="text-left font-semibold px-3 py-2" style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}>{c}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 1 ? "var(--surface-subtle)" : "transparent" }}>
                {r.map((c, ci) => (
                  <td key={ci} className="px-3 py-2 align-top" style={{ borderTop: "1px solid var(--hairline)" }}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────── Alle Bausteine ───────────── */

export default function NewsBlocks({ blocks }: { blocks: NewsBlock[] }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "text":
            return <RichText key={i} text={b.text} />;

          case "image":
            if (!isSafeImageUrl(b.url)) return null;
            return (
              <figure key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt={b.caption || ""} loading="lazy" className="w-full rounded-xl" />
                {b.caption && <figcaption className="text-xs text-center mt-1.5" style={{ color: "var(--text-secondary)" }}>{b.caption}</figcaption>}
              </figure>
            );

          case "gallery":
            return <Gallery key={i} images={b.images} />;

          case "table":
            return <Table key={i} header={b.header} rows={b.rows} />;

          case "button":
            if (!isSafeHref(b.url)) return null;
            return b.url.startsWith("/") ? (
              <Link key={i} href={b.url} className="block text-center font-semibold py-3 rounded-xl" style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}>{b.label}</Link>
            ) : (
              <a key={i} href={b.url} {...(/^https:/i.test(b.url) ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="block text-center font-semibold py-3 rounded-xl" style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}>{b.label}</a>
            );

          case "callout":
            return (
              <div
                key={i}
                role="note"
                className="rounded-xl px-3.5 py-3"
                style={{
                  background: b.tone === "important" ? "rgba(var(--accent), 0.08)" : "var(--surface-subtle)",
                  borderLeft: `4px solid ${b.tone === "important" ? "var(--accent-hex)" : "var(--text-secondary)"}`,
                }}
              >
                <RichText text={b.text} />
              </div>
            );

          case "divider":
            return <hr key={i} className="border-0 border-t" style={{ borderColor: "var(--hairline)" }} />;

          default:
            return null;
        }
      })}
    </div>
  );
}
