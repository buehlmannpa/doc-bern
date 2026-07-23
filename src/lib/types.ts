export type EventLink = { label: string; url: string };

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
  publishedAt: string; // ISO datetime
}
