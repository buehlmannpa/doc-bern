import { getPublishedNews } from "@/lib/db";
import { seedNews } from "@/lib/seed";
import { toNewsListItem } from "@/lib/blocks";
import type { NewsListItem } from "@/lib/types";
import NewsClient from "./NewsClient";

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  let news: NewsListItem[] = seedNews.map(toNewsListItem);
  try {
    news = await getPublishedNews();
  } catch {
    // Fallback auf Beispieldaten bei DB-Problemen
  }
  return <NewsClient news={news} />;
}
