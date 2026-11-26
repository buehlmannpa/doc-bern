// Sucht den Blob-Read-Write-Token (Name und Wert).
// - Vorschau/Dev-Umgebung (VERCEL_ENV=preview): zuerst BLOB_DEV_READ_WRITE_TOKEN, damit Dev nie in den
//   Produktiv-Speicher schreibt (gleiches Prinzip wie POSTGRES_DEV_URL bei der Datenbank).
// - Sonst BLOB_READ_WRITE_TOKEN; manche Stores legen ihn mit Präfix an (z.B. XYZ_READ_WRITE_TOKEN).
export function findBlobTokenEntry(): { name: string; value: string } | undefined {
  const env = process.env;
  if (env.VERCEL_ENV === "preview" && env.BLOB_DEV_READ_WRITE_TOKEN) {
    return { name: "BLOB_DEV_READ_WRITE_TOKEN", value: env.BLOB_DEV_READ_WRITE_TOKEN };
  }
  if (env.BLOB_READ_WRITE_TOKEN) return { name: "BLOB_READ_WRITE_TOKEN", value: env.BLOB_READ_WRITE_TOKEN };
  for (const [key, value] of Object.entries(env)) {
    if (key.endsWith("READ_WRITE_TOKEN") && value) return { name: key, value };
    if (typeof value === "string" && value.startsWith("vercel_blob_rw_")) return { name: key, value };
  }
  return undefined;
}

export function findBlobToken(): string | undefined {
  return findBlobTokenEntry()?.value;
}

// Nur Adressen aus einem Vercel-Blob-Speicher (öffentlich), nie externe Adressen oder Bilder der Website (/logo.png)
export function isBlobUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

// Gehört die Adresse zum Speicher, zu dem der Token passt? Der Token enthält die Speicher-Kennung
// ("vercel_blob_rw_<speicher>_…"), die Adresse beginnt mit derselben Kennung. So löscht oder verändert
// die Dev-Umgebung nie Bilder im Produktiv-Speicher (und umgekehrt).
export function blobUrlMatchesToken(u: string, token: string): boolean {
  if (!isBlobUrl(u)) return false;
  const storeId = token.split("_")[3];
  if (!storeId) return false;
  return new URL(u).hostname.toLowerCase().startsWith(`${storeId.toLowerCase()}.`);
}
