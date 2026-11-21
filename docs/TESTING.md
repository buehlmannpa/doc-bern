# Automatische Tests

Bei jedem Pull Request nach `develop` (Feature → DEV) und nach `main` (DEV → Prod) läuft die komplette
Testsuite automatisch in GitHub Actions (Workflow `Tests`). Ist sie rot, darf nicht gemergt werden
(einmalig einstellen: GitHub → Settings → Branches → Branch protection rule → «Require status checks to
pass» → `Tests`).

## Was getestet wird

- **Mitglieder-Seiten** (Desktop und Smartphone): Startseite, Events, News, Vorteile, Partner, Einstellungen laden
  ohne Fehler und ohne seitliches Scrollen. Events und News: Inhalt wird erst beim Aufklappen geladen,
  Bausteine (Text, Tabelle, Hinweis, Button, Galerie mit Grossansicht), Entwürfe sind nicht sichtbar und
  nicht abrufbar, altes Format (Text + Links), gleiche Kachelhöhen (Desktop), ungültige IDs.
- **Admin** (Desktop): Schutz der Admin-Seiten und -Schnittstellen, echter Login, News und Events anlegen,
  bearbeiten, löschen, Umwandlung alter Beiträge, Prüfung unsicherer Links und ungültiger Bausteine,
  Bild-Aufräumen beim Abbrechen und Speichern.

## Wie die Tests laufen

- Eine **echte PostgreSQL-Datenbank** (in GitHub Actions ein Dienst, lokal eine eigene). Die App legt ihr Schema,
  Beispielinhalte und die Admin-Benutzer selbst an. Vor jedem Lauf wird die Datenbank geleert.
- Der Testbau der App (`E2E_PG=1 npm run build`) nutzt statt des Neon-Treibers einen kleinen Ersatz
  (`tests/support/pg-shim.ts`). Der Ersatz gilt nur im Testbau. Produktion ist davon nicht betroffen.
- **Bildspeicher (Vercel Blob) ist simuliert.** Die Tests sprechen nie mit dem echten Speicher.
- Die Tests verwenden nur lokale Test-Datenbanken (`tests/support/reset-db.mjs` bricht sonst ab).

## Lokal ausführen

```bash
# Test-Datenbank bereitstellen (Beispiel mit Docker) und Adresse setzen
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=doc_test postgres:16
export POSTGRES_URL=postgres://postgres:postgres@localhost:5432/doc_test

npm install
npx playwright install chromium
E2E_PG=1 npm run build
npm run test:e2e
```

Einzelne Datei: `npx playwright test tests/e2e/public.spec.ts`. Bei Fehlern liegen Screenshots und Traces in
`test-results/`.

## Was die Tests nicht abdecken

- Aussehen und Bedienbarkeit (UX): Dafür bleibt eine kurze Sichtprüfung auf einem echten Handy, vor allem bei
  neuen Funktionen.
- iPhone-Safari und echte Geräte (getestet wird mit Chromium in iPhone-Grösse).
- Dienste ausserhalb des Codes: echter Bildspeicher, Neon-Datenbank, Vercel-Einstellungen, Passwörter.

## Neue Funktion = neue Tests

Wer eine Funktion baut oder ändert, ergänzt die passenden Tests in `tests/e2e/`. Hilfsfunktionen
(Login, Testdaten anlegen, Bildspeicher simulieren) stehen in `tests/e2e/helpers.ts`.
