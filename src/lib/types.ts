export type EventLink = { label: string; url: string };

export type PublishStatus = "draft" | "published";

export interface EventItem {
  id: string;
  title: string;
  date: string; // ISO date YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  description: string;
  imageUrl?: string | null;
  links: EventLink[];
  badge?: string | null;
  status: PublishStatus;
  publishAt: string; // ISO datetime – ab wann öffentlich sichtbar
  updatedBy?: string | null;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  discount: string; // z.B. "15%" oder "2 für 1"
  periodLabel: string; // z.B. "Q3 2026" oder "Juli–September 2026"
  createdAt: string; // ISO datetime
}

export interface PartnerItem {
  id: string;
  name: string;
  category: string;
  description: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  discount?: string | null;
  sortOrder: number;
}

export interface BoardMemberItem {
  id: string;
  name: string;
  role: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
}

export type NewsCategory = "news" | "report" | "interview" | "update";

// Bausteine eines News-Beitrags (siehe docs/PROPOSAL-news-bloecke.md)
export type CalloutTone = "info" | "important";

export type NewsBlock =
  | { type: "text"; text: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "gallery"; images: { url: string; thumbUrl?: string; caption?: string }[] }
  | { type: "table"; header: boolean; rows: string[][] }
  | { type: "button"; label: string; url: string }
  | { type: "callout"; tone: CalloutTone; text: string }
  | { type: "divider" };

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string | null;
  links: EventLink[];
  category: NewsCategory;
  sortOrder: number;
  isArchived: boolean;
  publishedAt: string; // ISO datetime – ab wann öffentlich sichtbar
  status: PublishStatus;
  updatedBy?: string | null;
  blocks?: NewsBlock[] | null; // null/leer = alter Beitrag (nur content + links)
}

// Leichte Variante für die öffentliche Liste: ohne den (schweren) Inhalt.
// Der Inhalt wird erst beim Öffnen eines Beitrags nachgeladen.
export type NewsListItem = Omit<NewsItem, "content" | "links" | "blocks"> & {
  hasContent: boolean; // false = reine Kurzmeldung, kein "Weiterlesen"
};

// Inhalt eines einzelnen Beitrags (wird beim Öffnen geladen)
export interface NewsDetail {
  content: string;
  links: EventLink[];
  blocks: NewsBlock[] | null;
}
