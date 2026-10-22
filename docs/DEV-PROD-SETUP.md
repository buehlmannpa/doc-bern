# Konzept: Dev- und Prod-Umgebung für die DOC-Bern-App

Ziel: Neue Features, Verbesserungen und Anpassungen zuerst in einer
**Dev-/Staging-Umgebung** testen und erst nach Freigabe auf **Produktion**
(`doc-bern.vercel.app`) übernehmen – ohne Risiko für echte Daten.

Die gute Nachricht: Vercel kann das von Haus aus. Es braucht **keine zweite
Hosting-Lösung**, nur eine saubere Trennung von Branches, Umgebungsvariablen
und – ganz wichtig – **Datenbanken**.

---

## 1. Überblick: Das Drei-Stufen-Modell

| Stufe | Git-Branch | URL | Datenbank / Blob | Zweck |
|---|---|---|---|---|
| **Production** | `main` | doc-bern.vercel.app | **Prod-DB** (echte Daten) | Was die Mitglieder sehen |
| **Staging / Dev** | `develop` | z.B. dev-doc-bern.vercel.app | **Dev-DB** (Testdaten) | Stabile Testumgebung |
| **Preview** | jeder Feature-Branch | automatische Einweg-URL | **Dev-DB** | Einzelne Features ansehen |

**Kernprinzip:** `main` wird nie direkt bearbeitet. Jede Änderung läuft über
einen Feature-Branch → Staging → und erst dann per Merge nach `main` in Prod.

---

## 2. Der wichtigste Punkt: getrennte Datenbanken

Aktuell gibt es nur **eine** Neon-Datenbank und **einen** Blob-Speicher. Würde
die Dev-Umgebung dieselbe DB nutzen, könnten Tests die echten Mitglieder-Daten
verändern oder löschen. Deshalb:

- **Prod-DB** – die bestehende Neon-Datenbank, nur für Produktion.
- **Dev-DB** – eine zweite, getrennte Datenbank für Dev/Staging/Preview.

Neon unterstützt dafür **Branching**: Man kann die Prod-DB per Knopfdruck in
eine „dev"-Branch kopieren. Diese ist komplett isoliert – Tests dort berühren
die Prod-Daten nie. Alternativ legt man einfach ein zweites Neon-Projekt an.

Gleiches gilt für den **Blob-Speicher** (Bild-Uploads): ein zweiter Store für
Dev, damit Test-Uploads nicht im Prod-Speicher landen.

> Die App ist dafür schon vorbereitet: Bei leerer DB füllt sie sich automatisch
> mit den Seed-Inhalten, und die Admin-Benutzer (`patrick`, `luca`) werden mit
> dem `ADMIN_PASSWORD` neu angelegt. Eine frische Dev-DB funktioniert also
> sofort.

---

## 3. Vercel-Umgebungen und Umgebungsvariablen

Vercel kennt drei Scopes für Umgebungsvariablen: **Production**, **Preview**,
**Development**. Genau das nutzen wir, um je Stufe auf die richtige DB zu zeigen.

In **Vercel → Settings → Environment Variables** pro Variable den Scope setzen:

| Variable | Production | Preview (= Dev/Staging) |
|---|---|---|
| `POSTGRES_URL` (+ weitere `POSTGRES_*`) | Prod-DB | **Dev-DB** |
| `BLOB_READ_WRITE_TOKEN` | Prod-Blob | **Dev-Blob** |
| `ADMIN_PASSWORD` | echtes Passwort | Test-Passwort |
| `SESSION_SECRET` | Prod-Wert | eigener Dev-Wert |

**Wichtig:** Wenn man einen Neon-/Blob-Store über die Vercel-Integration
verbindet, trägt Vercel die Variablen oft automatisch für **alle** Umgebungen
ein. Für die Trennung muss man die **Preview**-Werte danach manuell auf die
Dev-DB/Dev-Blob umbiegen (Variable bearbeiten → nur „Preview" wählen → Dev-Wert
eintragen; die „Production"-Variante bleibt auf der Prod-DB).

---

## 4. Branch-Strategie einrichten (einmalig)

1. **`develop`-Branch anlegen** als dauerhafte Staging-Linie, ausgehend von `main`.
2. In Vercel unter **Settings → Git**:
   - **Production Branch** = `main` (bleibt so).
   - „Preview Deployments" für alle anderen Branches aktiviert lassen (Standard).
3. Optional, aber empfohlen: dem `develop`-Deployment einen **festen Alias**
   geben (z.B. `dev-doc-bern.vercel.app`) unter **Settings → Domains**, damit
   die Staging-URL immer gleich bleibt.
4. **Branch-Schutz** auf GitHub für `main` aktivieren (Settings → Branches):
   direkte Pushes verbieten, Merge nur per Pull Request. So kann niemand – auch
   nicht versehentlich – ungetestet in Prod schreiben.

---

## 5. Der Arbeitsablauf im Alltag

```
main (Prod)  ─────────●────────────────────────●────────▶
                       ▲                          ▲
                       │ PR + Review              │ PR (Release)
develop (Staging) ──●──┴──●─────────────────●─────┴────────▶
                    ▲      ▲                 ▲
                    │      │ Merge Feature   │
feature/xyz ────────┴──────┘                 │
   (eigene Preview-URL zum Ansehen)
```

1. **Feature beginnen:** neuen Branch von `develop` abzweigen, z.B.
   `feature/kalender-export`.
2. **Entwickeln & ansehen:** Bei jedem Push erzeugt Vercel automatisch eine
   **Preview-URL** – dort kann man das Feature isoliert anschauen (auf der Dev-DB).
3. **Nach Staging:** Pull Request `feature/...` → `develop`. Nach Merge läuft es
   auf `dev-doc-bern.vercel.app` zum ausgiebigen Testen (auch durch dich/den Vorstand).
4. **Release nach Prod:** Wenn Staging passt, Pull Request `develop` → `main`.
   Merge löst den Prod-Deploy auf `doc-bern.vercel.app` aus.
5. **Rollback:** Geht in Prod etwas schief, in Vercel unter **Deployments** den
   letzten funktionierenden Deploy per „Promote to Production" / „Rollback"
   sofort zurückholen – ganz ohne Code-Änderung.

---

## 6. Checkliste zum Aufsetzen

- [ ] Neon: Dev-Datenbank anlegen (Branch der Prod-DB **oder** zweites Projekt).
- [ ] Vercel Blob: zweiten Store für Dev anlegen.
- [ ] Vercel: `POSTGRES_*` und `BLOB_READ_WRITE_TOKEN` für **Preview** auf die
      Dev-Werte umstellen (Production unverändert lassen).
- [ ] Vercel: `ADMIN_PASSWORD` / `SESSION_SECRET` für Preview separat setzen.
- [ ] Git: Branch `develop` von `main` anlegen.
- [ ] Vercel: optionalen festen Alias `dev-doc-bern.vercel.app` für `develop` setzen.
- [ ] GitHub: Branch-Schutz für `main` aktivieren (nur Merge per PR).
- [ ] Testlauf: kleine Änderung über `feature → develop → main` durchspielen.

---

## 7. Spätere Ausbaustufen (optional)

- **Eigene Domain** für Prod (z.B. `app.doc-bern.ch`) statt der `.vercel.app`-URL.
- **Automatische Prüfungen** (Lint/Build) als GitHub-Checks vor jedem Merge.
- **Passwort-Schutz für Staging** (Vercel „Deployment Protection"), damit die
  Dev-Umgebung nicht öffentlich auffindbar ist.
- **Geplante Datenbank-Backups** der Prod-DB in Neon.

---

### Kurzfassung

Eine zweite Hosting-Lösung ist nicht nötig. Es genügt: **`develop`-Branch als
Staging**, **getrennte Dev-Datenbank + Dev-Blob**, und **umgebungsabhängige
Variablen in Vercel**. Danach gilt dauerhaft: Feature-Branch → Preview ansehen →
`develop` (Staging) testen → `main` (Prod) freigeben.
