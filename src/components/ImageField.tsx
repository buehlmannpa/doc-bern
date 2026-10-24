"use client";

import { useState } from "react";
import { uploadImage } from "@/lib/upload-image";
import { formatKb, resizeImage, type ResizeOptions } from "@/lib/image-resize";

export default function ImageField({
  value,
  onChange,
  maxEdge,
  targetKb,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
} & ResizeOptions) {
  const [status, setStatus] = useState<"" | "resizing" | "uploading">("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const busy = status !== "";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    setInfo("");
    try {
      // 1) Foto im Browser verkleinern (spart Speicher und Ladezeit; entfernt auch den GPS-Standort)
      setStatus("resizing");
      const small = await resizeImage(file, { maxEdge, targetKb });
      setInfo(small === file ? "" : `Verkleinert: ${formatKb(file.size)} → ${formatKb(small.size)}`);

      // 2) Hochladen (kleine Dateien über den Server, sonst direkt zu Vercel Blob)
      setStatus("uploading");
      const url = await uploadImage(small);
      onChange(url);
    } catch (err) {
      setInfo("");
      setError(
        err instanceof Error
          ? err.message.startsWith("Das Foto")
            ? err.message
            : `Upload fehlgeschlagen: ${err.message}`
          : "Upload fehlgeschlagen"
      );
    } finally {
      setStatus("");
      // Input zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
      input.value = "";
    }
  }

  return (
    <div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <div className="relative mb-2">
          <img src={value} alt="Vorschau" className="w-full h-40 object-cover rounded-xl" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Bild entfernen"
            className="absolute top-2 right-2 w-8 h-8 rounded-full text-white text-sm font-bold"
            style={{ background: "rgba(0,0,0,0.6)" }}
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label
          className="text-sm font-semibold py-2.5 px-4 rounded-xl text-center cursor-pointer"
          style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}
        >
          {status === "resizing"
            ? "Wird verkleinert…"
            : status === "uploading"
              ? "Wird hochgeladen…"
              : value
                ? "Bild ersetzen"
                : "Bild hochladen"}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={busy} />
        </label>
        <input
          type="url"
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="oder Bild-URL einfügen"
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(0,0,0,0.04)" }}
        />
      </div>
      {info && (
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          {info}
        </p>
      )}
      {error && (
        <p className="text-xs mt-1" style={{ color: "#ff3b30" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
