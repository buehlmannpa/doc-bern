"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

export default function ImageField({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      // Direkter Upload vom Browser zu Vercel Blob – umgeht das 4.5-MB-Limit
      // der Server-Functions, sodass auch grosse Handy-Fotos funktionieren.
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
        contentType: file.type || undefined,
      });
      onChange(blob.url);
    } catch (err) {
      setError(
        err instanceof Error ? `Upload fehlgeschlagen: ${err.message}` : "Upload fehlgeschlagen"
      );
    } finally {
      setUploading(false);
      // Input zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
      e.target.value = "";
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
          style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
        >
          {uploading ? "Wird hochgeladen…" : value ? "Bild ersetzen" : "Bild hochladen"}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
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
      {error && (
        <p className="text-xs mt-1" style={{ color: "#ff3b30" }}>
          {error}
        </p>
      )}
    </div>
  );
}
