import { getNews } from "@/lib/db";
import NewsClient from "./NewsClient";

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  const news = await getNews();
  return <NewsClient news={news} />;
}
