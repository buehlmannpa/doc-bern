import { getPublishedNews } from "@/lib/db";
import { seedNews } from "@/lib/seed";
import NewsClient from "./NewsClient";

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  let news = seedNews;
  try {
    news = await getPublishedNews();
  } catch {
    // Fallback auf Beispieldaten bei DB-Problemen
  }
  return <NewsClient news={news} />;
}
