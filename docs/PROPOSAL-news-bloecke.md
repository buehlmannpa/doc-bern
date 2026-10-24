# Vorschlag: News-Beiträge mit Tabellen, Bildergalerien & Co.

Status: **Vorschlag zur Entscheidung**, noch nichts umgesetzt.
Ziel: Die App ersetzt CleverReach als Ort für Club-Neuigkeiten. Beiträge sollen wie ein
Newsletter aussehen können (Tabellen, Galerien, Buttons, Hinweise), aber **einfach zu
erstellen** und **schön auf dem Handy** sein.

---

## 1. Ausgangslage (Ist-Zustand)

| Thema | Heute |
|---|---|
| Beitragstext | Ein einziges Textfeld. Es gibt nur Absätze, keine Fettschrift, keine Links im Text, keine Tabellen. |
| Bilder | Genau **ein** Titelbild pro Beitrag. |
| Links | Eine Liste von Buttons unter dem Text. |
| Bild-Upload | Vorhanden und zuverlässig: direkt vom Browser zu Vercel Blob (auch grosse Handy-Fotos). **Wiederverwendbar.** |
| Entwurf / Planung / Archiv / Kategorie | Vorhanden. Bleibt unverändert. |
| Anzeige | Kachel, die sich in der Kachel aufklappt. |

Fazit: Die Basis (Upload, Entwürfe, Planung, Archiv, Design) ist da. Es fehlt nur
**strukturierter Inhalt** statt eines reinen Textfelds.

## 2. Leitplanken

1. **Einfach für Admins:** keine Fachbegriffe, nichts programmieren, nichts "formatieren müssen".
2. **Schön für Mitglieder:** immer im Design der App, auch wenn man als Admin "falsch" gestaltet.
3. **Sicher & stabil:** keine freie HTML-Eingabe, die das Layout zerschiessen oder Schadcode einschleusen könnte.
4. **Bestehende Beiträge bleiben unverändert** und funktionieren weiter.
5. **In kleinen Schritten**, jeder Schritt einzeln prüfbar.

## 3. Lösungsansätze im Vergleich

| | A) Markdown-Text | **B) Bausteine (Blöcke)** ✅ | C) Voller Texteditor (WYSIWYG) |
|---|---|---|---|
| Idee | Admin schreibt `**fett**`, `\| Tabelle \|` | Beitrag = Liste von Bausteinen: Text, Bild, Galerie, Tabelle, Button, Hinweis … | Wie Word im Browser |
| Einfachheit für Admins | schlecht (Syntax lernen, Tabellen mühsam) | **sehr gut** (Baustein wählen, ausfüllen) | gut |
| Aussehen für Mitglieder | gut | **sehr gut, immer einheitlich** | uneinheitlich (Copy-Paste aus Word bringt Chaos) |
| Risiko / Fehleranfälligkeit | mittel | **gering** | hoch (grosse Fremdbibliothek, HTML-Bereinigung) |
| Passt zur App (Handy, Design) | mittel | **ja** | mässig |

**Empfehlung: B) Bausteine.** Es ist der einfachste Weg, dass Admins schnell hübsche Beiträge
bauen und Mitglieder immer ein sauberes Ergebnis sehen. Die Tabelle wird wie in Excel
ausgefüllt, nicht programmiert.

## 4. Der Vorschlag: Beitrag aus Bausteinen

### Bausteine, Etappe 1 (Kern)

| Baustein | Was der Admin macht | Was Mitglieder sehen |
|---|---|---|
| **Text** | Text tippen; Buttons für **fett**, Link, Aufzählung | Saubere Absätze, fette Wörter, Links in Ducati-Rot |
| **Bild** | Foto hochladen, optional Bildunterschrift | Volle Breite, abgerundet, Unterschrift darunter |
| **Galerie** | Mehrere Fotos auf einmal wählen | Raster (2 Spalten Handy / 3 Desktop), "+8" bei vielen; Tippen öffnet Grossansicht zum Wischen |
| **Tabelle** | Felder ausfüllen, "+ Zeile / + Spalte", **Excel-Tabelle einfügen** | Rote Kopfzeile, Streifenmuster, auf dem Handy seitlich scrollbar |
| **Button** | Beschriftung + Link | Grosser roter Button (z. B. "Jetzt anmelden") |
| **Hinweis-Box** | Kurzen Text eingeben | Hervorgehobene Box (z. B. "Wichtig: Anmeldeschluss …") |
| **Trennlinie** | ein Klick | Dezente Linie |

### Bausteine, Etappe 2 (später, bei Bedarf)

Video (YouTube-Link), Datei/PDF zum Herunterladen (z. B. GV-Protokoll), Event-Karte
("Zum Event"), Zitat. Das Datenmodell ist dafür von Anfang an offen.

### So sieht es aus

Beitrag aus Sicht der Mitglieder (Handy; auf dem Desktop praktisch gleich breit wie die Kachel):

![Beitrag](proposal-news-bloecke/mockup-beitrag-mitglieder.png)

Editor aus Sicht der Admins (Bausteine untereinander, Pfeile zum Verschieben, "Block hinzufügen" unten):

![Editor](proposal-news-bloecke/mockup-editor-admin.png)

*(Die Mockups sind Entwürfe mit Platzhalter-Fotos und Beispieltexten. Im fertigen Editor
gibt es zusätzlich den Umschalter "Bearbeiten | Vorschau", der den Beitrag genau so zeigt, wie ihn
Mitglieder sehen.)*

## 5. Bedienung für Admins (Ablauf)

1. Admin → News → **+ Neu**: Titel, Kategorie, Titelbild, Kurztext (wie bisher).
2. Unter **Inhalt** Bausteine hinzufügen: antippen, ausfüllen. Mit ↑ ↓ verschieben, ✕ entfernen.
3. **Vorschau** ansehen. Als **Entwurf speichern** oder **veröffentlichen / planen** (wie bisher).
4. **Vorlagen** zum Start (Etappe 5): "Newsletter", "Einladung mit Anmeldung", "Fotobericht".

Alte Beiträge: Beim ersten Bearbeiten wird der bisherige Text automatisch in einen Text-Baustein
und die Links in Button-Bausteine umgewandelt. Nichts geht verloren.

## 6. Technische Umsetzung (kurz)

- **Datenmodell:** neue Spalte `blocks` (JSON) in der Tabelle `news`. Beispiel:
  `[{"type":"text","text":"…"},{"type":"table","header":true,"rows":[["Zeit","Ort"],["09:00","Bern"]]},{"type":"gallery","images":[{"url":"…"}]}]`.
- **Migration:** `ALTER TABLE news ADD COLUMN IF NOT EXISTS blocks JSONB` im bestehenden
  Schema-Mechanismus. Rückwärtskompatibel: Ist `blocks` leer, wird wie heute `content` + Links angezeigt.
- **Rückfall-Sicherheit:** Beim Speichern wird zusätzlich der reine Text in `content` geschrieben.
  Würde man das Feature zurückbauen, bleiben alle Beiträge lesbar.
- **Anzeige:** eine Komponente, die jeden Baustein im App-Design darstellt. Kein freies HTML,
  alles als normale React-Elemente. Links nur `https`, `mailto`, `tel`.
- **Text-Formatierung:** minimal und sicher (`**fett**`, `[Text](Link)`, `- Liste`); die Buttons über
  dem Textfeld fügen die Zeichen automatisch ein. Der Admin muss die Schreibweise nicht kennen.
- **Tabelle:** Eingabe als Raster; beim Einfügen aus Excel/Word wird Tab/Zeilenumbruch automatisch erkannt.
  Grenzen: max. 8 Spalten, 50 Zeilen. Anzeige mit seitlichem Scrollen auf dem Handy.
- **Galerie:** Bilder werden **vor dem Upload im Browser verkleinert** (ca. 1600 px, JPEG), typisch
  ~300 KB statt 5 MB. Das ist schneller, spart Speicher (Vercel-Blob-Kontingent) und lädt für Mitglieder
  flott. Anzeige mit Grossansicht (Wischen, Pfeiltasten, Esc, Bildunterschrift). Nutzt den bestehenden Upload.
- **Teilen-Link:** `/newsletter?beitrag=<id>` öffnet die News-Seite mit aufgeklapptem, angescrolltem Beitrag.
  Dazu ein "Link teilen"-Button (Teilen-Menü des Handys). Das ersetzt den Link aus dem CleverReach-Mailing.
- **Anzeige in der Kachel:** bleibt wie zuletzt abgenommen (Bild bleibt, nur Inhalt kommt dazu).
  Tabellen scrollen, Galerien nutzen 2 Spalten. Falls sich reiche Beiträge in der Kachel zu eng anfühlen,
  gibt es als spätere Option eine eigene **Leseansicht** pro Beitrag (Entscheidung nach ersten echten Beiträgen).

## 7. Was CleverReach kann und diese Lösung (noch) nicht

Ehrlich vorweg: Dieses Feature löst das **Gestalten und Veröffentlichen**. Anderes macht CleverReach
heute nebenbei mit:

| Funktion | Mit diesem Feature | Bemerkung |
|---|---|---|
| Schön gestaltete Inhalte | ✅ | Kern des Vorschlags |
| Archiv, Planung, Entwurf | ✅ | existiert bereits |
| Link zum Weiterschicken (WhatsApp, Mail) | ✅ | Teilen-Link, klein |
| **Mitglieder aktiv benachrichtigen** (E-Mail an Verteiler) | ❌ | **grösste Lücke.** In der App müssen Mitglieder selbst nachschauen. |
| Abmelden / Empfängerverwaltung | ❌ | nur relevant, wenn E-Mails verschickt werden |
| Statistik (wer hat geöffnet) | ❌ | später möglich (einfacher Zähler) |

Optionen für die Benachrichtigung (**eigenes Thema, nicht Teil dieses Features**):
1. Nichts, Link wird bei Bedarf in die WhatsApp-Gruppe/Mail gestellt (ab Etappe 5 möglich).
2. Push-Benachrichtigung für die installierte App (iPhone nur bei zum Home-Bildschirm hinzugefügter App,
   freiwillig). Eigenes Feature mit eigener Technik.
3. Weiterhin ein E-Mail-Dienst nur für den Versand (z. B. Link zum neuen Beitrag).

## 8. Umsetzung in Etappen

Jede Etappe ist ein eigener, einzeln prüfbarer Pull Request (zuerst `develop`, Prüfung auf DEV, dann Release).

| Etappe | Inhalt | Grobe Grösse |
|---|---|---|
| 1 | Datenmodell + Migration + Anzeige-Komponente (alle Bausteine darstellbar, alte Beiträge unverändert) | klein–mittel |
| 2 | Editor-Grundgerüst: Text, Bild, Hinweis, Button, Trennlinie; Verschieben/Entfernen; Umwandlung alter Beiträge | mittel |
| 3 | Tabellen-Baustein inkl. Einfügen aus Excel | klein–mittel |
| 4 | Galerie: Mehrfach-Upload, Verkleinern, Raster, Grossansicht | mittel |
| 5 | Vorschau-Umschalter, Vorlagen, Teilen-Link | klein–mittel |

Gesamtaufwand grob geschätzt: **3 bis 4 Arbeitstage**, in dieser Reihenfolge lieferbar. Schon nach Etappe 2 kann
man einfache Newsletter-artige Beiträge schreiben.

## 9. Tests und Risiken

- **Gut testbar ohne Datenbank:** die Anzeige aller Bausteine, Tabellen/Galerie/Grossansicht und die Editor-Oberfläche
  (lokal gebaut und im Browser geprüft, Handy und Desktop, hell und dunkel).
- **Nur auf DEV prüfbar:** Speichern, Laden und Bild-Upload gegen die echte Datenbank und den Blob-Speicher.
  Dafür gibt es pro Etappe eine kurze Checkliste für den Admin-Test.
- **Risiken & Gegenmassnahmen:**
  - Grosse Foto-Galerien → automatisches Verkleinern, Maximalzahl pro Galerie.
  - Speicher im Gratis-Kontingent von Vercel Blob → Verbrauch im Dashboard beobachten.
  - Editor-Komplexität → Bausteine einzeln und in kleinen Etappen, kein "alles auf einmal".
  - Alte Beiträge → werden nicht verändert, bis jemand sie bewusst bearbeitet.

## 10. Entscheidungen, die ich von dir brauche

1. **Bausteine Etappe 1** wie oben, oder fehlt etwas Wichtiges / ist etwas zu viel?
2. **Anzeige:** In der Kachel aufklappen (wie jetzt) oder später eine eigene Leseansicht?
3. **Benachrichtigung** (Abschnitt 7): bewusst später klären?
4. **Reihenfolge:** wie in Abschnitt 8, oder zuerst die Galerie?
5. **Vorlagen:** welche 2 bis 3 Beitragsarten schreibt ihr am häufigsten?
