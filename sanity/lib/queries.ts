import { client } from "./client";

export type SanityNewsletter = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  category: "news" | "report" | "interview" | "update";
  summary: string;
  coverImage?: {
    asset: { _ref: string };
    alt?: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[];
  isArchived: boolean;
};

const newsletterFields = `
  _id,
  title,
  slug,
  publishedAt,
  category,
  summary,
  coverImage,
  content,
  isArchived
`;

export async function getAllNewsletters(): Promise<SanityNewsletter[]> {
  return client.fetch(
    `*[_type == "newsletter"] | order(publishedAt desc) { ${newsletterFields} }`
  );
}

export async function getActiveNewsletters(): Promise<SanityNewsletter[]> {
  return client.fetch(
    `*[_type == "newsletter" && isArchived != true] | order(publishedAt desc) { ${newsletterFields} }`
  );
}

export async function getArchivedNewsletters(): Promise<SanityNewsletter[]> {
  return client.fetch(
    `*[_type == "newsletter" && isArchived == true] | order(publishedAt desc) { ${newsletterFields} }`
  );
}

export async function getLatestNewsletters(count: number = 3): Promise<SanityNewsletter[]> {
  return client.fetch(
    `*[_type == "newsletter" && isArchived != true] | order(publishedAt desc) [0...${count}] { ${newsletterFields} }`
  );
}

export async function getNewsletterBySlug(slug: string): Promise<SanityNewsletter | null> {
  return client.fetch(
    `*[_type == "newsletter" && slug.current == $slug][0] { ${newsletterFields} }`,
    { slug }
  );
}
