import type { EventItem, NewsItem, NewsBlock } from "./types";

// Fallback-Daten, falls noch keine Datenbank konfiguriert ist.
// Sobald Vercel Postgres verbunden ist, werden diese Daten einmalig
// in die Datenbank geschrieben und danach über das Admin-CMS verwaltet.

export const seedEvents: EventItem[] = [
  {
    id: "seed-1",
    title: "Saisonstart Ausfahrt",
    date: "2026-08-16",
    time: "09:00",
    location: "hostettler moto ag, Deisswil",
    description:
      "Gemeinsamer Start in die neue Saison! Treffpunkt bei hostettler moto ag. Route über den Jaunpass mit Zwischenhalt zum Kaffee.",
    imageUrl: null,
    links: [],
    badge: "Highlight",
    status: "published",
    publishAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "seed-2",
    title: "Sommerabend Grill & Ride",
    date: "2026-09-05",
    time: "17:00",
    location: "Gurten, Bern",
    description:
      "Gemütliche Feierabend-Ausfahrt mit anschliessendem Grillabend auf dem Gurten. Für Essen ist gesorgt.",
    imageUrl: null,
    links: [],
    badge: null,
    status: "published",
    publishAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "seed-3",
    title: "Saisonabschluss & Fondue",
    date: "2026-11-08",
    time: "11:00",
    location: "Restaurant Bären, Worb",
    description:
      "Letzte Ausfahrt der Saison mit anschliessendem Fondue-Essen. Anmeldung erforderlich.",
    imageUrl: null,
    links: [],
    badge: null,
    status: "published",
    publishAt: "2026-01-01T00:00:00.000Z",
  },
];

export const seedNews: NewsItem[] = [
  {
    id: "seed-n1",
    title: "Willkommen bei der neuen DOC-Bern App!",
    summary:
      "Unser Newsletter zieht um: Ab sofort findest du alle Neuigkeiten direkt hier in der App.",
    content:
      "Liebe Mitglieder\n\nWir freuen uns, euch unsere neue Club-App zu präsentieren. Statt Newsletter per E-Mail findet ihr ab sofort alle Informationen zu Events, Vorteilen und Neuigkeiten direkt hier.\n\nSchaut regelmässig vorbei und verpasst keine Ausfahrt mehr!\n\nEuer DOC-Bern Vorstand",
    imageUrl: null,
    links: [],
    category: "update",
    sortOrder: 0,
    isArchived: false,
    publishedAt: "2026-07-01T10:00:00.000Z",
    status: "published",
  },
  {
    id: "seed-n2",
    title: "Rückblick: Saisonstart 2026",
    summary: "Bei bestem Wetter trafen sich zahlreiche Ducatisti zum Saisonstart.",
    content:
      "Was für ein traumhafter Saisonstart! Bei bestem Wetter trafen sich zahlreiche Ducatisti zur ersten gemeinsamen Ausfahrt der Saison.\n\nDie Route führte über malerische Pässe mit perfekten Kurven. Danke an alle Teilnehmer!",
    imageUrl: null,
    links: [],
    category: "report",
    sortOrder: 1,
    isArchived: false,
    publishedAt: "2026-06-15T10:00:00.000Z",
    status: "published",
  },
];

// Beispielbeitrag mit Bausteinen – NUR für lokale Tests ohne Datenbank (DOC_DEMO_BLOCKS=1).
// Wird nie in die Datenbank geschrieben und erscheint nie in Produktion.
const demoBlocks: NewsBlock[] = [
  { type: "text", text: "Liebe Mitglieder, was für ein **traumhafter Saisonstart**!\n\nAlle Details findest du auf der [Club-Seite](/).\n\n- Treffpunkt: Deisswil\n- Dauer: ca. 7 Stunden" },
  { type: "callout", tone: "important", text: "**Wichtig:** Anmeldeschluss für die Ausfahrt vom 15. Juni ist der 30. Mai." },
  { type: "text", text: "**Programm**" },
  { type: "table", header: true, rows: [["Zeit", "Programmpunkt", "Ort"], ["09:00", "Treffpunkt & Kaffee", "Deisswil"], ["10:30", "Start Jaunpass", "Bern"], ["12:30", "Mittagessen", "Gruyères"], ["16:00", "Rückkehr", "Deisswil"]] },
  { type: "gallery", images: [
    { url: "/logo.png", thumbUrl: "/logo.png", caption: "Start" },
    { url: "/icon-512.png", thumbUrl: "/icon-512.png", caption: "Pass" },
    { url: "/apple-touch-icon.png", thumbUrl: "/apple-touch-icon.png", caption: "Pause" },
    { url: "/logo.png", thumbUrl: "/logo.png", caption: "Gruppe" },
    { url: "/icon-512.png", thumbUrl: "/icon-512.png" },
    { url: "/apple-touch-icon.png", thumbUrl: "/apple-touch-icon.png" },
  ] },
  { type: "image", url: "/icon-512.png", caption: "Die ganze Gruppe am Jaunpass" },
  { type: "button", label: "Jetzt für Juni anmelden", url: "https://example.org/anmelden" },
  { type: "divider" },
  { type: "text", text: "Euer DOC-Bern Vorstand" },
];

export const demoNewsWithBlocks: NewsItem = {
  id: "seed-demo-blocks",
  title: "Beispiel: Eventbericht mit Galerie und Tabelle",
  summary: "Testbeitrag mit allen Bausteinen (nur lokal sichtbar).",
  content: "Liebe Mitglieder, was für ein traumhafter Saisonstart!",
  imageUrl: null,
  links: [],
  category: "report",
  sortOrder: 2,
  isArchived: false,
  publishedAt: "2026-05-12T10:00:00.000Z",
  status: "published",
  blocks: demoBlocks,
};
