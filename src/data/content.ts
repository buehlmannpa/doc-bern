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
  hours: [
    { day: "Montag", time: "08:00 – 18:30" },
    { day: "Dienstag", time: "08:00 – 18:30" },
    { day: "Mittwoch", time: "08:00 – 18:30" },
    { day: "Donnerstag", time: "08:00 – 18:30" },
    { day: "Freitag", time: "08:00 – 18:30" },
    { day: "Samstag", time: "08:00 – 16:00" },
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
export const discounts: Discount[] = [
  {
    id: "d1",
    title: "Service-Rabatt bei hostettler moto ag",
    partner: "hostettler moto ag – Bern",
    description:
      "Vergünstigung auf Servicearbeiten für DOC-Bern Mitglieder. Einfach Mitgliedschaft erwähnen.",
    percentage: 10,
    validUntil: "2026-12-31",
  },
  {
    id: "d2",
    title: "Rabatt in der Tscharnergut-Apotheke",
    partner: "Tscharnergut-Apotheke",
    description: "Vergünstigung auf ausgewählte Produkte für DOC-Bern Mitglieder.",
    percentage: 10,
    validUntil: "2026-12-31",
  },
  {
    id: "d3",
    title: "Fahrschule Daniel Gerber",
    partner: "Fahrschule Daniel Gerber",
    description: "Spezialkonditionen für DOC-Bern Mitglieder und Angehörige.",
    validUntil: "2026-12-31",
  },
];

// ---------- Vorstand ----------
// Bitte Namen, Rollen und optional Bilder anpassen.
export const board: BoardMember[] = [
  { name: "N.N.", role: "Präsident" },
  { name: "N.N.", role: "Vizepräsident" },
  { name: "N.N.", role: "Kassier/in" },
  { name: "N.N.", role: "Aktuar/in" },
  { name: "N.N.", role: "Eventverantwortliche/r" },
  { name: "N.N.", role: "Beisitzer/in" },
];

export const boardIntro =
  "Der Vorstand des Ducati Official Club Bern engagiert sich ehrenamtlich für ein aktives Clubleben, gemeinsame Ausfahrten und die Interessen der Mitglieder.";
