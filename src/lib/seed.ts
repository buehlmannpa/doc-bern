import type { EventItem, NewsItem } from "./types";

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
  },
];
