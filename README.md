# DOC Bern – Ducati Official Club Bern App

Mobile-first Web-App (PWA) für den Ducati Official Club Bern. Gebaut mit
Next.js, Apple-„Liquid Glass"-Design und Ducati Corporate Design.

## Funktionen

- **Club (Home):** Anstehende Events, aktuelle News, Vorstand, Vertragshändler
- **Events:** Aufklappbare Detailansicht, automatische Kennzeichnung vergangener Events
- **News:** Beiträge mit Bildern & Links, ältere Beiträge werden beim Scrollen nachgeladen
- **Vertragshändler:** hostettler moto ag mit Öffnungszeiten (heutiger Tag hervorgehoben)
- **Partner:** Übersicht der Club-Partner
- **Vorteile:** Quartals-Aktion + DOC-Rabatte
- **Admin-CMS** (`/admin`): Eigenes Light-CMS für Events und News, passwortgeschützt

## Setup auf Vercel

1. **Repo mit Vercel verbinden** und deployen.
2. **Datenbank verbinden:** Im Vercel-Projekt → *Storage* → *Postgres* erstellen
   und mit dem Projekt verbinden. Die Umgebungsvariablen werden automatisch gesetzt.
3. **Bild-Upload (optional):** Im Vercel-Projekt → *Storage* → *Blob* erstellen.
   Ohne Blob können Bilder per URL eingefügt werden.
4. **Admin-Passwort setzen:** Unter *Settings → Environment Variables*:
   - `ADMIN_PASSWORD` = gewünschtes Passwort
   - `SESSION_SECRET` = langer Zufallswert
5. **Neu deployen.** Beim ersten Aufruf legt die App die Tabellen an und füllt
   sie mit Beispieldaten, die anschliessend im Admin-CMS bearbeitet werden können.

## Admin-Bereich

Erreichbar unter `/admin` (oder via Einstellungen → Admin-Bereich). Anmeldung mit
dem `ADMIN_PASSWORD`. Dort können Events und News erstellt, bearbeitet, gelöscht
und (bei News) in der Reihenfolge angepasst werden. Das CMS ist bewusst einfach
gehalten und für Nicht-Techniker bedienbar.

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local   # Werte eintragen
npm run dev
```

Ohne Datenbank läuft die App mit Beispieldaten (nur Lesen).
