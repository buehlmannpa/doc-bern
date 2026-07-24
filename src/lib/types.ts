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

export type NewsCategory = "news" | "report" | "interview" | "update";

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
}
