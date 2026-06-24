export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image?: string;
  badge?: string;
}

export interface NewsletterEntry {
  id: string;
  title: string;
  date: string;
  summary: string;
  content: string;
  category: "news" | "report" | "interview" | "update";
}

export interface Partner {
  id: string;
  name: string;
  description: string;
  discount?: string;
  website?: string;
  logo?: string;
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

export const events: Event[] = [
  {
    id: "1",
    title: "Saisonstart Ausfahrt",
    date: "2026-04-12",
    time: "09:00",
    location: "hostettler-moto, Bern",
    description: "Gemeinsamer Start in die neue Saison! Treffpunkt bei hostettler-moto Bern. Route über den Jaunpass.",
    badge: "Highlight",
  },
  {
    id: "2",
    title: "Ducati Trackday Mugello",
    date: "2026-05-23",
    time: "08:00",
    location: "Mugello Circuit, Italien",
    description: "Exklusiver Trackday für DOC-Bern Mitglieder auf dem legendären Mugello Circuit. Limitierte Plätze!",
    badge: "Ausgebucht",
  },
  {
    id: "3",
    title: "Sommerabend Grill & Ride",
    date: "2026-07-18",
    time: "17:00",
    location: "Gurten, Bern",
    description: "Gemütliche Feierabend-Ausfahrt mit anschliessendem Grillabend auf dem Gurten.",
  },
  {
    id: "4",
    title: "Ducati Premiere – Neue Modelle 2027",
    date: "2026-09-20",
    time: "10:00",
    location: "hostettler-moto, Bern",
    description: "Exklusive Vorstellung der neuen Ducati-Modelle 2027 bei unserem Partner hostettler-moto.",
    badge: "Neu",
  },
  {
    id: "5",
    title: "Saisonabschluss & Fondue",
    date: "2026-11-08",
    time: "11:00",
    location: "Restaurant Bären, Worb",
    description: "Letzte Ausfahrt der Saison mit anschliessendem Fondue-Essen. Anmeldung erforderlich.",
  },
];

export const newsletters: NewsletterEntry[] = [
  {
    id: "1",
    title: "Willkommen zur Saison 2026!",
    date: "2026-03-15",
    category: "update",
    summary: "Alle Infos zur neuen Saison, geplante Events und was sich im Club verändert hat.",
    content: `Liebe DOC-Bern Mitglieder,

Die Saison 2026 steht vor der Tür und wir freuen uns auf ein weiteres grossartiges Jahr mit euch!

**Was gibt es Neues?**
- Neue Clubapp statt Newsletter per E-Mail
- Erweiterte Partnerschaft mit hostettler-moto Bern
- Erstmals ein Trackday in Mugello für unsere Mitglieder
- Neue Rabattangebote bei unseren Partnern

**Termine vormerken:**
Der Saisonstart findet am 12. April bei hostettler-moto statt. Bitte meldet euch frühzeitig an.

Ride safe & have fun!
Euer DOC-Bern Vorstand`,
  },
  {
    id: "2",
    title: "Rückblick: Saisonstart 2026",
    date: "2026-04-14",
    category: "report",
    summary: "Was für ein Start! 42 Ducatisti am Saisonstart bei hostettler-moto.",
    content: `Was für ein traumhafter Saisonstart! Bei bestem Wetter trafen sich 42 Ducatisti vor dem Showroom von hostettler-moto Bern.

Nach Kaffee und Gipfeli ging es über den Jaunpass Richtung Freiburg. Die Route führte durch malerische Landschaften und bot perfekte Kurven.

Danke an alle Teilnehmer und besonders an hostettler-moto für die Gastfreundschaft!

Fotos folgen auf unserer Website.`,
  },
  {
    id: "3",
    title: "Neue Multistrada V4 Rally – Testmöglichkeit",
    date: "2026-05-01",
    category: "news",
    summary: "hostettler-moto bietet DOC-Mitgliedern exklusive Testfahrten mit der neuen Multistrada V4 Rally.",
    content: `Grossartige Neuigkeiten! Unser Partner hostettler-moto Bern stellt DOC-Bern Mitgliedern die neue Multistrada V4 Rally für Probefahrten zur Verfügung.

**So funktioniert's:**
- Terminbuchung direkt bei hostettler-moto
- DOC-Bern Mitgliedschaft erwähnen
- Probefahrt inkl. kurzer Tour-Empfehlung

Die Multistrada V4 Rally überzeugt mit:
- 170 PS V4 Granturismo Motor
- Elektronisches Fahrwerk Skyhook
- Erweiterte Offroad-Fähigkeiten

Kontakt: hostettler-moto Bern, 031 991 17 81`,
  },
  {
    id: "4",
    title: "Interview: Unser Präsident über 10 Jahre DOC Bern",
    date: "2026-06-10",
    category: "interview",
    summary: "Ein Gespräch über die Anfänge, Highlights und Zukunft des DOC Bern.",
    content: `Dieses Jahr feiert der DOC Bern sein 10-jähriges Bestehen. Wir haben mit unserem Präsidenten über die vergangenen Jahre gesprochen.

**Wie hat alles angefangen?**
"Es begann mit einer kleinen Gruppe von Ducati-Enthusiasten, die sich regelmässig zum Fahren getroffen haben. Der Club hat sich organisch entwickelt."

**Was war das grösste Highlight?**
"Der erste gemeinsame Trip nach Mugello 2019. Das hat uns als Club zusammengeschweisst."

**Was sind die Pläne für die Zukunft?**
"Wir wollen den Club weiter öffnen, mehr Events anbieten und die Community stärken – auch digital mit unserer neuen App."`,
  },
];

export const partners: Partner[] = [
  {
    id: "1",
    name: "hostettler-moto Bern",
    description: "Offizieller Ducati Händler in Bern. Verkauf, Service und Beratung für alle Ducati Modelle.",
    website: "https://www.hostettler-moto.ch",
  },
  {
    id: "2",
    name: "Moto Center Thun",
    description: "Motorrad-Zubehör und Bekleidung. Grosse Auswahl an Helmen, Jacken und Protektoren.",
    discount: "10% auf Bekleidung",
  },
  {
    id: "3",
    name: "Reifen Müller AG",
    description: "Spezialist für Motorradreifen. Montage und Auswuchten direkt vor Ort.",
    discount: "15% auf Pirelli Reifen",
  },
  {
    id: "4",
    name: "Hotel Alpina Interlaken",
    description: "Motorradfreundliches Hotel in Interlaken. Garage und Waschplatz vorhanden.",
    discount: "10% für DOC-Mitglieder",
    website: "https://www.hotel-alpina.ch",
  },
];

export const discounts: Discount[] = [
  {
    id: "1",
    title: "Service-Rabatt bei hostettler-moto",
    partner: "hostettler-moto Bern",
    description: "10% Rabatt auf alle Servicearbeiten für DOC-Bern Mitglieder. Einfach Mitgliedschaft erwähnen.",
    percentage: 10,
    validUntil: "2026-12-31",
  },
  {
    id: "2",
    title: "Bekleidungs-Rabatt",
    partner: "Moto Center Thun",
    description: "10% auf das gesamte Bekleidungssortiment. Gilt nicht auf bereits reduzierte Artikel.",
    percentage: 10,
    validUntil: "2026-12-31",
  },
  {
    id: "3",
    title: "Pirelli Reifen-Aktion",
    partner: "Reifen Müller AG",
    description: "15% auf alle Pirelli Motorradreifen inkl. Montage. Nur für DOC-Bern Mitglieder.",
    percentage: 15,
    validUntil: "2026-09-30",
  },
  {
    id: "4",
    title: "Übernachtungs-Special",
    partner: "Hotel Alpina Interlaken",
    description: "10% Rabatt auf Übernachtungen. Perfekt für Ausfahrten ins Berner Oberland.",
    percentage: 10,
    validUntil: "2026-10-31",
  },
  {
    id: "5",
    title: "Original Ducati Zubehör",
    partner: "hostettler-moto Bern",
    description: "5% auf original Ducati Performance Zubehör und Merchandise.",
    percentage: 5,
    validUntil: "2026-12-31",
  },
];

export const hostettlerInfo = {
  name: "hostettler-moto Bern",
  address: "Standhardstrasse 1, 3052 Zollikofen",
  phone: "+41 31 991 17 81",
  email: "bern@hostettler-moto.ch",
  website: "https://www.hostettler-moto.ch",
  googleMaps: "https://maps.google.com/?q=hostettler-moto+Bern+Zollikofen",
  hours: [
    { day: "Montag", time: "Geschlossen" },
    { day: "Dienstag", time: "08:00 – 12:00, 13:15 – 18:30" },
    { day: "Mittwoch", time: "08:00 – 12:00, 13:15 – 18:30" },
    { day: "Donnerstag", time: "08:00 – 12:00, 13:15 – 18:30" },
    { day: "Freitag", time: "08:00 – 12:00, 13:15 – 18:30" },
    { day: "Samstag", time: "09:00 – 16:00" },
    { day: "Sonntag", time: "Geschlossen" },
  ],
};
