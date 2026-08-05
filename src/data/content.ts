// Statische Inhalte, die nicht über das Admin-CMS verwaltet werden.
// Diese können direkt hier im Code angepasst werden.

export interface Partner {
  id: string;
  name: string;
  category: string;
  description: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  discount?: string;
}

export interface Discount {
  id: string;
  title: string;
  partner: string;
  description: string;
  code?: string;
  validUntil?: string;
  percentage?: number;
}

export interface BoardMember {
  name: string;
  role: string;
  description?: string;
  imageUrl?: string;
}

export interface MemberAction {
  quarter: string;
  title: string;
  partner: string;
  description: string;
  validUntil?: string;
}

// ---------- Vertragshändler (hostettler moto ag Bern) ----------
// Quelle: hostettler-moto.ch (Stand Juli 2026)
export const hostettlerInfo = {
  name: "hostettler moto ag – Bern",
  address: "Gümligentalstrasse 81, 3066 Deisswil b. Stettlen",
  phone: "+41 31 938 06 06",
  email: "bern@hostettler-moto.ch",
  website: "https://www.hostettler-moto.ch/bern/",
  googleMaps: "https://www.google.com/maps/search/?api=1&query=hostettler+moto+ag+Deisswil+Stettlen",
  hoursShop: [
    { day: "Montag", time: "Geschlossen" },
    { day: "Dienstag", time: "08:00 – 18:30" },
    { day: "Mittwoch", time: "08:00 – 18:30" },
    { day: "Donnerstag", time: "08:00 – 18:30" },
    { day: "Freitag", time: "08:00 – 18:30" },
    { day: "Samstag", time: "08:00 – 16:00" },
    { day: "Sonntag", time: "Geschlossen" },
  ],
  hoursWorkshop: [
    { day: "Montag", time: "Geschlossen" },
    { day: "Dienstag", time: "07:30 – 12:00 · 13:00 – 17:30" },
    { day: "Mittwoch", time: "07:30 – 12:00 · 13:00 – 17:30" },
    { day: "Donnerstag", time: "07:30 – 12:00 · 13:00 – 17:30" },
    { day: "Freitag", time: "07:30 – 12:00 · 13:00 – 17:30" },
    { day: "Samstag", time: "07:30 – 12:00 · 13:00 – 16:00" },
    { day: "Sonntag", time: "Geschlossen" },
  ],
};

// ---------- Partner des Clubs ----------
// Recherchierte Kontaktdaten (Stand Juli 2026). Bitte bei Änderungen aktualisieren.
export const partners: Partner[] = [
  {
    id: "p1",
    name: "Fahrschule Daniel Gerber",
    category: "Fahrschule",
    description:
      "Auto- und Motorradfahrschule in den Regionen Bern, Thun, Münsingen und Seftigen.",
    address: "Herolfingen 257, 3503 Gysenstein",
    phone: "+41 79 920 60 15",
    email: "fahrschule@gerber-daniel.ch",
    website: "https://fahrschule-daniel-gerber.ch",
  },
  {
    id: "p2",
    name: "Danieli Bern",
    category: "Bäckerei & Konditorei",
    description:
      "Dolceforno Danieli – italienische Bäckerei, Konditorei und Pasticceria im Kirchenfeld.",
    address: "Kirchenfeldstrasse 40A, 3005 Bern",
    phone: "+41 31 351 02 62",
  },
  {
    id: "p3",
    name: "Zahnarztpraxis Toffen",
    category: "Zahnarzt",
    description: "Zahnarztpraxis Dr. med. dent. David Homann in Toffen.",
    address: "Niesenweg 5, 3125 Toffen",
    phone: "+41 31 819 88 22",
  },
  {
    id: "p4",
    name: "Masseria Safori del Salento",
    category: "Kulinarik / Apulien",
    description:
      "Spezialitäten aus dem Salento (Apulien) – Olivenöl, Wein und mediterrane Produkte. Kontaktdaten folgen.",
  },
  {
    id: "p5",
    name: "Tscharnergut-Apotheke",
    category: "Apotheke",
    description: "Genossenschafts-Apotheke im Tscharnergut, Bern-Bethlehem.",
    address: "Fellerstrasse 28, 3027 Bern",
    phone: "+41 31 992 45 49",
    email: "info@tscharnergut-apotheke.ch",
    website: "https://www.tscharnergut-apotheke.ch",
  },
];

// ---------- Aktuelle Aktion für Mitglieder (1x pro Quartal) ----------
export const memberAction: MemberAction = {
  quarter: "Q3 2026",
  title: "Sommer-Aktion: Reifenwechsel zum Vorzugspreis",
  partner: "hostettler moto ag – Bern",
  description:
    "Nur diesen Sommer: DOC-Bern Mitglieder erhalten beim Reifenwechsel einen exklusiven Vorzugspreis. Termin bei hostettler moto ag vereinbaren und Mitgliedschaft erwähnen.",
  validUntil: "2026-09-30",
};

// ---------- DOC-Rabatte für Mitglieder ----------
// Alle Rabatte bei hostettler moto ag – Bern (Mitgliedschaft erwähnen).
export const discounts: Discount[] = [
  {
    id: "d1",
    title: "Rennreifen",
    partner: "hostettler moto ag – Bern",
    description: "25% Rabatt auf Rennreifen.",
    percentage: 25,
  },
  {
    id: "d2",
    title: "Bekleidung (allgemein)",
    partner: "hostettler moto ag – Bern",
    description: "20% Rabatt auf das allgemeine Bekleidungssortiment.",
    percentage: 20,
  },
  {
    id: "d3",
    title: "Strassenreifen",
    partner: "hostettler moto ag – Bern",
    description: "20% Rabatt auf Strassenreifen.",
    percentage: 20,
  },
  {
    id: "d4",
    title: "Bekleidung von Ducati",
    partner: "hostettler moto ag – Bern",
    description: "15% Rabatt auf Ducati-Bekleidung.",
    percentage: 15,
  },
  {
    id: "d5",
    title: "Zubehör von Ducati",
    partner: "hostettler moto ag – Bern",
    description: "15% Rabatt auf Ducati-Zubehör (mit Montage in der Filiale).",
    percentage: 15,
  },
  {
    id: "d6",
    title: "Zubehör (allgemein)",
    partner: "hostettler moto ag – Bern",
    description: "10% Rabatt auf allgemeines Zubehör (mit Montage in der Filiale).",
    percentage: 10,
  },
  {
    id: "d7",
    title: "Ersatzteile & Werkstattarbeiten",
    partner: "hostettler moto ag – Bern",
    description: "5% Rabatt auf Ersatzteile und ausgeführte Werkstattarbeiten (nur Ducati).",
    percentage: 5,
  },
];

// ---------- Vorstand ----------
// Bilder als PNG im Repo unter public/images/ ablegen (Dateiname wie unten).
export const board: BoardMember[] = [
  { name: "Luca Assante", role: "Präsident", imageUrl: "/images/la.png" },
  { name: "Kevin Carrara", role: "Kassierer", imageUrl: "/images/kc.png" },
  { name: "Patrick Bühlmann", role: "Social & Technik", imageUrl: "/images/pb.png" },
  { name: "Sven Bingeli", role: "Beistand", imageUrl: "/images/sb.png" },
  { name: "Diego B", role: "Beistand", imageUrl: "/images/db.png" },
];

export const boardIntro =
  "Der Vorstand des Ducati Official Club Bern engagiert sich ehrenamtlich für ein aktives Clubleben, gemeinsame Ausfahrten und die Interessen der Mitglieder.";

// ---------- Mitgliedschaft ----------
// Anmeldung läuft aktuell über das offizielle Ducati-Portal.
// Bitte bei Bedarf die exakte URL des DOC-Bern / Ducati Official Club anpassen.
export const membershipUrl = "https://www.ducati.com/ch/de/dealers";
