// Merkt sich, welche Bilder in der aktuellen Editor-Sitzung hochgeladen wurden. Beim Speichern, Abbrechen
// oder Schliessen werden die nicht (mehr) verwendeten wieder aus dem Blob-Speicher gelöscht.
const sessionUploads = new Set<string>();

export function trackUpload(url: string) {
  sessionUploads.add(url);
}

// keep = Bilder, die im gespeicherten Stand vorkommen (beim Abbrechen: leer)
export async function settleUploads(keep: string[] = []): Promise<void> {
  const keepSet = new Set(keep);
  const urls = [...sessionUploads].filter((u) => !keepSet.has(u));
  sessionUploads.clear();
  if (urls.length === 0) return;
  try {
    await fetch("/api/admin/discard-uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
      keepalive: true,
    });
  } catch {
    // Aufräumen ist nur eine Zugabe – Fehler dürfen den Editor nicht stören
  }
}
