import { createPool } from "@vercel/postgres";
import type { EventItem, NewsItem, EventLink, NewsCategory } from "./types";
import { seedEvents, seedNews } from "./seed";

// Verbindungs-String aus der ersten verfügbaren Umgebungsvariable.
// Vercel Postgres (Neon) setzt je nach Integration POSTGRES_URL oder DATABASE_URL.
function connectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED
  );
}

export function isDbConfigured(): boolean {
  return Boolean(connectionString());
}

let _pool: ReturnType<typeof createPool> | null = null;
function getPool() {
  if (!_pool) {
    _pool = createPool({ connectionString: connectionString() });
  }
  return _pool;
}

// Tagged-Template-Wrapper, damit alle bestehenden sql`...`-Aufrufe funktionieren.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sql(strings: TemplateStringsArray, ...values: any[]) {
  return getPool().sql(strings, ...values);
}

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date DATE NOT NULL,
      time TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      links JSONB NOT NULL DEFAULT '[]'::jsonb,
      badge TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      links JSONB NOT NULL DEFAULT '[]'::jsonb,
      category TEXT NOT NULL DEFAULT 'news',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      published_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // Einmaliges Seeding, falls die Tabellen leer sind
  const ev = await sql`SELECT COUNT(*)::int AS c FROM events;`;
  if (ev.rows[0].c === 0) {
    for (const e of seedEvents) {
      await sql`
        INSERT INTO events (id, title, date, time, location, description, image_url, links, badge)
        VALUES (${e.id}, ${e.title}, ${e.date}, ${e.time}, ${e.location}, ${e.description},
                ${e.imageUrl ?? null}, ${JSON.stringify(e.links)}::jsonb, ${e.badge ?? null});
      `;
    }
  }
  const nw = await sql`SELECT COUNT(*)::int AS c FROM news;`;
  if (nw.rows[0].c === 0) {
    for (const n of seedNews) {
      await sql`
        INSERT INTO news (id, title, summary, content, image_url, links, category, sort_order, is_archived, published_at)
        VALUES (${n.id}, ${n.title}, ${n.summary}, ${n.content}, ${n.imageUrl ?? null},
                ${JSON.stringify(n.links)}::jsonb, ${n.category}, ${n.sortOrder}, ${n.isArchived}, ${n.publishedAt});
      `;
    }
  }
  schemaReady = true;
}

function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToEvent(r: any): EventItem {
  const d = r.date instanceof Date ? r.date : new Date(r.date);
  return {
    id: r.id,
    title: r.title,
    date: d.toISOString().slice(0, 10),
    time: r.time || "",
    location: r.location || "",
    description: r.description || "",
    imageUrl: r.image_url,
    links: Array.isArray(r.links) ? r.links : [],
    badge: r.badge,
  };
}

function rowToNews(r: any): NewsItem {
  const d = r.published_at instanceof Date ? r.published_at : new Date(r.published_at);
  return {
    id: r.id,
    title: r.title,
    summary: r.summary || "",
    content: r.content || "",
    imageUrl: r.image_url,
    links: Array.isArray(r.links) ? r.links : [],
    category: (r.category as NewsCategory) || "news",
    sortOrder: r.sort_order ?? 0,
    isArchived: Boolean(r.is_archived),
    publishedAt: d.toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------- EVENTS ----------

export async function getEvents(): Promise<EventItem[]> {
  if (!isDbConfigured()) return seedEvents;
  await ensureSchema();
  const { rows } = await sql`SELECT * FROM events ORDER BY date ASC, time ASC;`;
  return rows.map(rowToEvent);
}

export async function createEvent(input: Omit<EventItem, "id">): Promise<EventItem> {
  await ensureSchema();
  const id = genId("evt");
  await sql`
    INSERT INTO events (id, title, date, time, location, description, image_url, links, badge)
    VALUES (${id}, ${input.title}, ${input.date}, ${input.time}, ${input.location},
            ${input.description}, ${input.imageUrl ?? null},
            ${JSON.stringify(input.links ?? [])}::jsonb, ${input.badge ?? null});
  `;
  const { rows } = await sql`SELECT * FROM events WHERE id = ${id};`;
  return rowToEvent(rows[0]);
}

export async function updateEvent(id: string, input: Omit<EventItem, "id">): Promise<EventItem> {
  await ensureSchema();
  await sql`
    UPDATE events SET
      title = ${input.title},
      date = ${input.date},
      time = ${input.time},
      location = ${input.location},
      description = ${input.description},
      image_url = ${input.imageUrl ?? null},
      links = ${JSON.stringify(input.links ?? [])}::jsonb,
      badge = ${input.badge ?? null}
    WHERE id = ${id};
  `;
  const { rows } = await sql`SELECT * FROM events WHERE id = ${id};`;
  return rowToEvent(rows[0]);
}

export async function deleteEvent(id: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM events WHERE id = ${id};`;
}

// ---------- NEWS ----------

export async function getNews(): Promise<NewsItem[]> {
  if (!isDbConfigured()) return seedNews;
  await ensureSchema();
  const { rows } = await sql`SELECT * FROM news ORDER BY sort_order ASC, published_at DESC;`;
  return rows.map(rowToNews);
}

export async function createNews(
  input: Omit<NewsItem, "id" | "sortOrder">
): Promise<NewsItem> {
  await ensureSchema();
  const id = genId("news");
  const { rows: minRows } = await sql`SELECT COALESCE(MIN(sort_order), 0) - 1 AS next FROM news;`;
  const sortOrder = minRows[0].next;
  await sql`
    INSERT INTO news (id, title, summary, content, image_url, links, category, sort_order, is_archived, published_at)
    VALUES (${id}, ${input.title}, ${input.summary}, ${input.content}, ${input.imageUrl ?? null},
            ${JSON.stringify(input.links ?? [])}::jsonb, ${input.category}, ${sortOrder},
            ${input.isArchived ?? false}, ${input.publishedAt ?? new Date().toISOString()});
  `;
  const { rows } = await sql`SELECT * FROM news WHERE id = ${id};`;
  return rowToNews(rows[0]);
}

export async function updateNews(
  id: string,
  input: Omit<NewsItem, "id" | "sortOrder">
): Promise<NewsItem> {
  await ensureSchema();
  await sql`
    UPDATE news SET
      title = ${input.title},
      summary = ${input.summary},
      content = ${input.content},
      image_url = ${input.imageUrl ?? null},
      links = ${JSON.stringify(input.links ?? [])}::jsonb,
      category = ${input.category},
      is_archived = ${input.isArchived ?? false},
      published_at = ${input.publishedAt}
    WHERE id = ${id};
  `;
  const { rows } = await sql`SELECT * FROM news WHERE id = ${id};`;
  return rowToNews(rows[0]);
}

export async function deleteNews(id: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM news WHERE id = ${id};`;
}

export async function reorderNews(orderedIds: string[]): Promise<void> {
  await ensureSchema();
  for (let i = 0; i < orderedIds.length; i++) {
    await sql`UPDATE news SET sort_order = ${i} WHERE id = ${orderedIds[i]};`;
  }
}
