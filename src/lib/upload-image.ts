import { upload } from "@vercel/blob/client";
import { trackUpload } from "./upload-tracker";

const TIMEOUT_MS = 60_000;

// Lädt ein (bereits verkleinertes) Bild hoch und gibt die Adresse zurück.
// 1) über unseren Server (kleine Dateien, am zuverlässigsten), 2) sonst direkt zu Vercel Blob.
export async function uploadImage(file: File): Promise<string> {
  const url = await uploadImageUntracked(file);
  trackUpload(url);
  return url;
}

async function uploadImageUntracked(file: File): Promise<string> {
  let serverError = "";
  if (file.size <= 4 * 1024 * 1024) {
    try {
      const body = new FormData();
      body.append("file", file, file.name);
      const res = await fetch("/api/admin/upload-file", { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS) });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) return data.url;
      serverError = (data.error || `Serverantwort ${res.status}`).replace(/^Upload fehlgeschlagen: /, "");
      if (res.status === 401) throw new Error(serverError);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Nicht autorisiert")) throw e;
      serverError = serverError || (e as Error).message || "keine Verbindung";
    }
  }
  try {
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/admin/upload",
      contentType: file.type || undefined,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return blob.url;
  } catch (e) {
    const msg = (e as Error).name === "TimeoutError" || (e as Error).name === "AbortError" ? "Zeitüberschreitung" : (e as Error).message;
    throw new Error(serverError ? `${serverError} / ${msg}` : msg);
  }
}
