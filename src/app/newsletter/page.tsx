import { getAllNewsletters, type SanityNewsletter } from "../../../sanity/lib/queries";
import { newsletters as fallbackNewsletters } from "@/data/content";
import NewsletterClient from "./NewsletterClient";

export const revalidate = 60;

export default async function NewsletterPage() {
  let sanityArticles: SanityNewsletter[] = [];
  let useFallback = false;

  try {
    sanityArticles = await getAllNewsletters();
    if (!sanityArticles || sanityArticles.length === 0) {
      useFallback = true;
    }
  } catch {
    useFallback = true;
  }

  return (
    <NewsletterClient
      articles={sanityArticles}
      fallbackArticles={useFallback ? fallbackNewsletters : null}
    />
  );
}
