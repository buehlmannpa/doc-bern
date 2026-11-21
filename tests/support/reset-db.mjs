// Leert die Test-Datenbank vor jedem Testlauf (nur die Tabellen der App).
// Die App legt Tabellen, Beispielinhalte und die Admin-Benutzer beim ersten Zugriff selbst neu an.
import pg from "pg";

const url = process.env.POSTGRES_URL;
if (!url) throw new Error("POSTGRES_URL fehlt (Test-Datenbank)");
// Sicherheit: nie gegen eine Neon-/Produktions-Adresse laufen lassen
if (!/(localhost|127\.0\.0\.1|postgres:5432)/.test(url)) {
  throw new Error("Die Tests laufen nur gegen eine lokale Test-Datenbank.");
}
const client = new pg.Client({ connectionString: url });
await client.connect();
const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
for (const r of rows) await client.query(`DROP TABLE IF EXISTS "${r.tablename}" CASCADE`);
await client.end();
console.log(`Test-Datenbank zurückgesetzt (${rows.length} Tabellen)`);
