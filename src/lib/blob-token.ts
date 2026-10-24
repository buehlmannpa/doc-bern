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
