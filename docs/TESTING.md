# Automatische Tests

Bei jedem Pull Request nach `develop` (Feature → DEV) und nach `main` (DEV → Prod) läuft die komplette
Testsuite automatisch in GitHub Actions (Workflow `Tests`). Ist sie rot, darf nicht gemergt werden
(einmalig einstellen: GitHub → Settings → Branches → Branch protection rule → «Require status checks to
pass» → `Tests`).

## Was getestet wird

- **Mitglieder-Seiten** (Desktop und Smartphone): Startseite, Events, News, Vorteile, Partner, Einstellungen laden
  ohne Fehler und ohne seitliches Scrollen. Events und News: Inhalt wird erst beim Aufklappen geladen,
  Bausteine (Text, Tabelle, Hinweis, Button, Galerie mit Grossansicht), Entwürfe sind nicht sichtbar und
  nicht abrufbar, altes Format (Text + Links), ungültige IDs.
- **Admin** (Desktop): Schutz der Admin-Seiten und -Schnittstellen, echter Login, News und Events anlegen,
  bearbeiten, löschen, Umwandlung alter Beiträge, Prüfung unsicherer Links und ungültiger Bausteine,
  Bild-Aufräumen beim Abbrechen und Speichern. Partner, Rabattaktionen, Vorstand (anlegen, öffentlich sehen,
  löschen), Benutzerverwaltung (neuer Admin, Rollen, keine Selbstlöschung) und Wartungsmodus.
- **Events-Zeitstrahl** (Desktop und Smartphone): aktueller Monat zuoberst, kommende Monate aufsteigend, leere Monate fehlen,
  automatische Zuordnung nach Datum, Events untereinander, mehrtägige Events (Bereich, ganztägiger Kalendereintrag),
  laufendes Event aus dem Vormonat, vergangene Jahre eingeklappt und erst beim Aufklappen geladen, Rechenlogik
  (Monatswechsel in Schweizer Zeit, Jahreswechsel, Schaltjahr).
- **Bilder verkleinern** (Admin → Bilder, nur Super-Admins): Prüfung, Vorschau, Verkleinern mit Bestätigung, Adresse überall
  ersetzt, Original erst danach gelöscht, Fehlerfälle lassen alles unverändert. Der Bildspeicher ist dabei ein Test-Speicher im
  Arbeitsspeicher (`E2E_FAKE_BLOB=1`, nur in der Test-Konfiguration gesetzt).
- **Protokoll** (Admin → Protokoll, nur Super-Admins): Zugriffsschutz, Anmeldungen (Gerät, Fehlversuche nur einmal, Abmeldung),
  Erstellen/Ändern/Löschen in allen Bereichen mit Person und Titel, geänderte Felder statt Inhalte, nie Passwörter, Filter
  (Person, Bereich, Aktion, Text, Zeitraum, Nur Wichtiges), Blättern, Logrotate nach 3 Monaten, Oberfläche.
- **Funktionen** (Desktop und Smartphone): Kalender-Export (.ics-Inhalt, Google-Link), Hell/Dunkel/Automatisch mit
  Merken nach dem Neuladen, Kontrastwerte in beiden Modi, Startseite mit Event, News und Vorstand.

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
