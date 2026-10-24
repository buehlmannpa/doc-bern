// Sucht einen Blob-Read-Write-Token. Standard ist BLOB_READ_WRITE_TOKEN,
// manche Stores legen ihn mit Präfix an (z.B. XYZ_READ_WRITE_TOKEN).
export function findBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("READ_WRITE_TOKEN") && value) return value;
    if (typeof value === "string" && value.startsWith("vercel_blob_rw_")) return value;
  }
  return undefined;
}
