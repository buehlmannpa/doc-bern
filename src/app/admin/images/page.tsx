"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminNav from "@/components/AdminNav";
import { formatKb } from "@/lib/image-resize";

type Item = { url: string; role: "standard" | "galerie" | "vorschau"; bytes: number; type: string; candidate: boolean; note?: string };
type Row = { state: "wartet" | "läuft" | "vorschau" | "fertig" | "übersprungen" | "fehler"; before?: number; after?: number; note?: string };

const ROLE_LABEL: Record<Item["role"], string> = { standard: "Bild", galerie: "Galerie", vorschau: "Galerie-Vorschau" };

function fileName(url: string): string {
  try {
    const u = new URL(url, "http://x");
    return decodeURIComponent(u.searchParams.get("name") || u.pathname.split("/").pop() || url).slice(0, 48);
  } catch {
    return url.slice(0, 48);
  }
}

export default function ImagesAdminPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [busy, setBusy] = useState<"" | "vorschau" | "verkleinern">("");
  const stopRef = useRef(false);

  const scan = useCallback(async () => {
    setLoading(true);
    setError("");
    setRows({});
    try {
      const res = await fetch("/api/admin/optimize-images");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prüfung fehlgeschlagen");
      setItems(data.images);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  const candidates = (items ?? []).filter((i) => i.candidate);
  const totalAll = (items ?? []).reduce((s, i) => s + i.bytes, 0);
  const totalCand = candidates.reduce((s, i) => s + i.bytes, 0);

  async function run(dryRun: boolean) {
    if (!dryRun && !window.confirm(`${candidates.length} Bild(er) werden verkleinert. Die Originale werden danach endgültig gelöscht und lassen sich nicht wiederherstellen. Fortfahren?`)) return;
    stopRef.current = false;
    setBusy(dryRun ? "vorschau" : "verkleinern");
    setRows(Object.fromEntries(candidates.map((c) => [c.url, { state: "wartet" } as Row])));
    for (const c of candidates) {
      if (stopRef.current) break;
      setRows((r) => ({ ...r, [c.url]: { state: "läuft" } }));
      try {
        const res = await fetch("/api/admin/optimize-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: c.url, dryRun }) });
        const d = await res.json();
        const row: Row =
          d.status === "verkleinert" ? { state: "fertig", before: d.before, after: d.after, note: d.note }
          : d.status === "vorschau" ? { state: "vorschau", before: d.before, after: d.after }
          : d.status === "übersprungen" ? { state: "übersprungen", before: d.before, note: d.note }
          : { state: "fehler", note: d.message || d.error || "Fehlgeschlagen" };
        setRows((r) => ({ ...r, [c.url]: row }));
      } catch (e) {
        setRows((r) => ({ ...r, [c.url]: { state: "fehler", note: (e as Error).message } }));
      }
    }
    setBusy("");
  }

  const done = Object.values(rows).filter((r) => r.state === "fertig");
  const saved = done.reduce((s, r) => s + ((r.before ?? 0) - (r.after ?? 0)), 0);
  const preview = Object.values(rows).filter((r) => r.state === "vorschau");
  const previewSaved = preview.reduce((s, r) => s + ((r.before ?? 0) - (r.after ?? 0)), 0);
  const btn = "px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50";

  return (
    <div>
      <AdminNav />
      <h1 className="text-2xl font-bold tracking-tight mb-1 px-1">Bilder verkleinern</h1>
      <p className="text-sm mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
        Ältere Bilder wurden unverkleinert hochgeladen und belegen viel Platz. Hier werden sie so verkleinert, wie es neue Uploads automatisch werden.
        Das Original wird erst gelöscht, wenn das neue Bild gespeichert und überall eingesetzt ist.
      </p>

      {loading && <p className="text-sm px-1" style={{ color: "var(--text-secondary)" }}>Bilder werden geprüft…</p>}
      {error && (
        <div className="glass-card p-4 text-sm" role="alert" style={{ background: "rgba(255,59,48,0.1)" }}>{error}</div>
      )}

      {items && (
        <>
          <div className="glass-card p-4 mb-4" data-testid="summary">
            <p className="text-sm">
              <strong>{items.length}</strong> {items.length === 1 ? "Bild" : "Bilder"} in Verwendung, zusammen <strong>{formatKb(totalAll)}</strong>.
            </p>
            <p className="text-sm mt-1">
              {candidates.length === 0
                ? "Nichts zu verkleinern: alle Bilder sind bereits klein."
                : <><strong>{candidates.length}</strong> {candidates.length === 1 ? "Bild lässt" : "Bilder lassen"} sich verkleinern ({formatKb(totalCand)}).</>}
            </p>
            {preview.length > 0 && !busy && (
              <p className="text-sm mt-1" style={{ color: "var(--accent-text)" }}>Vorschau: etwa <strong>{formatKb(previewSaved)}</strong> weniger Speicher.</p>
            )}
            {done.length > 0 && (
              <p className="text-sm mt-1" style={{ color: "var(--accent-text)" }}>Erledigt: <strong>{formatKb(saved)}</strong> Speicher gespart ({done.length} {done.length === 1 ? "Bild" : "Bilder"}).</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" className={btn} style={{ background: "var(--bg-secondary)", border: "1px solid var(--hairline)" }} onClick={() => run(true)} disabled={!candidates.length || Boolean(busy)}>
                Vorschau berechnen
              </button>
              <button type="button" className={btn} style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }} onClick={() => run(false)} disabled={!candidates.length || Boolean(busy)}>
                Jetzt verkleinern
              </button>
              {busy && (
                <button type="button" className={btn} style={{ background: "var(--bg-secondary)", border: "1px solid var(--hairline)" }} onClick={() => { stopRef.current = true; }}>
                  Anhalten
                </button>
              )}
              {!busy && (
                <button type="button" className={btn} style={{ background: "var(--bg-secondary)", border: "1px solid var(--hairline)" }} onClick={scan}>
                  Neu prüfen
                </button>
              )}
            </div>
          </div>

          <ul className="space-y-2" aria-label="Bilder">
            {items.map((i) => {
              const r = rows[i.url];
              return (
                <li key={i.url} className="glass-card p-3 text-sm" data-candidate={i.candidate}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{fileName(i.url)}</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {ROLE_LABEL[i.role]} · {i.bytes ? formatKb(i.bytes) : "–"}
                        {i.note ? ` · ${i.note}` : ""}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-right flex-shrink-0" style={{ color: r?.state === "fehler" ? "#ff3b30" : "var(--accent-text)" }}>
                      {!r && (i.candidate ? "kann verkleinert werden" : "in Ordnung")}
                      {r?.state === "wartet" && "wartet…"}
                      {r?.state === "läuft" && "läuft…"}
                      {r?.state === "vorschau" && `${formatKb(r.before ?? 0)} → ${formatKb(r.after ?? 0)}`}
                      {r?.state === "fertig" && `✓ ${formatKb(r.before ?? 0)} → ${formatKb(r.after ?? 0)}`}
                      {r?.state === "übersprungen" && "übersprungen"}
                      {r?.state === "fehler" && "Fehler"}
                    </div>
                  </div>
                  {r?.note && <p className="text-xs mt-1" style={{ color: r.state === "fehler" ? "#ff3b30" : "var(--text-secondary)" }}>{r.note}</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
