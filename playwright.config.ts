import { defineConfig, devices } from "@playwright/test";

// Läuft gegen einen Testbau der App (npm run build mit E2E_PG=1) und eine echte PostgreSQL-Datenbank.
// Lokal und in GitHub Actions identisch. Siehe docs/TESTING.md.
const PORT = 3100;
const DB = process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/doc_test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // gemeinsame Datenbank: Tests laufen nacheinander
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    {
      name: "smartphone",
      // iPhone-Grösse und Touch, aber mit Chromium (kein WebKit nötig)
      use: { ...devices["iPhone 13"], browserName: "chromium", defaultBrowserType: "chromium" },
      testMatch: /(public|funktionen|zeitstrahl)\.spec\.ts/,
    },
  ],
  webServer: {
    command: `node tests/support/reset-db.mjs && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/manifest.json`, // statische Datei: 200 = Server läuft
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      POSTGRES_URL: DB,
      ADMIN_PASSWORD: "test-passwort",
      SESSION_SECRET: "test-secret",
      // Bewusst kein Blob-Token: Die Tests sprechen nie mit dem echten Bildspeicher (Uploads sind simuliert)
      BLOB_READ_WRITE_TOKEN: "",
      // Test-Bildspeicher im Arbeitsspeicher für die Tests der Bild-Verkleinerung (nur hier gesetzt)
      E2E_FAKE_BLOB: "1",
      // Protokoll: Aufräumen alter Einträge bei jedem Schreiben (im Betrieb höchstens alle 6 Stunden)
      AUDIT_PURGE_MIN_INTERVAL_MS: "0",
    },
  },
});
