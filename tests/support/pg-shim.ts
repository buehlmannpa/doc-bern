// Ersatz für "@vercel/postgres" NUR im Testbau (E2E_PG=1, siehe next.config.ts).
// Der echte Treiber spricht nur mit Neon-Servern; für die Tests läuft eine normale PostgreSQL-Datenbank.
// Die App-Logik (SQL, Schema, Migrationen) bleibt dabei unverändert und wird wirklich ausgeführt.
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export async function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), "");
  const res = await pool.query(text, values as unknown[]);
  return { rows: res.rows, rowCount: res.rowCount ?? 0 };
}
