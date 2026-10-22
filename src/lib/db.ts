import { sql } from "@vercel/postgres";
import { unstable_cache, revalidateTag } from "next/cache";
import type { EventItem, NewsItem, NewsCategory, ActionItem, PartnerItem, BoardMemberItem } from "./types";
import { seedEvents, seedNews } from "./seed";
import { partners as seedPartners, board as seedBoard } from "@/data/content";
import { hashPassword, type AdminRole } from "./auth";

export type AdminUser = { username: string; name: string; role: AdminRole };

// Öffentliche Inhalte werden zwischengespeichert, damit nicht jeder Seitenaufruf
// die (im Gratis-Tarif oft "schlafende") Datenbank aufwecken muss. Änderungen im
// CMS lösen über revalidateTag(...) sofort eine Aktualisierung aus.
const PUBLIC_REVALIDATE = 60; // Sekunden
const TAGS = {
  events: "events",
  news: "news",
  partners: "partners",
  board: "board",
  actions: "actions",
  settings: "settings",
} as const;

export function isDbConfigured(): boolean {
  return Boolean(
    process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.DATABASE_URL
  );
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

  await sql`
    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      discount TEXT NOT NULL DEFAULT '',
      period_label TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      discount TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS board_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      description TEXT,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // Migrationen für bestehende Tabellen (Entwürfe/Planung, Audit)
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ NOT NULL DEFAULT now();`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_by TEXT;`;
  await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';`;
  await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS updated_by TEXT;`;

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
  const pt = await sql`SELECT COUNT(*)::int AS c FROM partners;`;
  if (pt.rows[0].c === 0) {
    for (let i = 0; i < seedPartners.length; i++) {
      const p = seedPartners[i];
      await sql`
        INSERT INTO partners (id, name, category, description, address, phone, email, website, discount, sort_order)
        VALUES (${p.id}, ${p.name}, ${p.category}, ${p.description}, ${p.address ?? null},
                ${p.phone ?? null}, ${p.email ?? null}, ${p.website ?? null}, ${p.discount ?? null}, ${i});
      `;
    }
  }
  const bd = await sql`SELECT COUNT(*)::int AS c FROM board_members;`;
  if (bd.rows[0].c === 0) {
    for (let i = 0; i < seedBoard.length; i++) {
      const b = seedBoard[i];
      await sql`
        INSERT INTO board_members (id, name, role, description, image_url, sort_order)
        VALUES (${`brd_${i}`}, ${b.name}, ${b.role}, ${b.description ?? null}, ${b.imageUrl ?? null}, ${i});
      `;
    }
  }

  // Super-Admins patrick & luca initial mit dem bisherigen Admin-Passwort anlegen
  const au = await sql`SELECT COUNT(*)::int AS c FROM admin_users;`;
  if (au.rows[0].c === 0 && process.env.ADMIN_PASSWORD) {
    const h = await hashPassword(process.env.ADMIN_PASSWORD);
    await sql`INSERT INTO admin_users (username, password_hash, role, name) VALUES ('patrick', ${h}, 'superadmin', 'Patrick');`;
    await sql`INSERT INTO admin_users (username, password_hash, role, name) VALUES ('luca', ${h}, 'superadmin', 'Luca');`;
  }

  schemaReady = true;
}

// Lesezugriffe sollen NICHT bei jedem (Kalt-)Start das komplette Schema
// sicherstellen (~20 SQL-Befehle gegen eine evtl. ebenfalls kalte DB).
// Stattdessen die Abfrage direkt ausführen und nur im Fehlerfall (Tabelle oder
// Spalte fehlt noch) einmalig das Schema anlegen und erneut versuchen.
function isMissingSchema(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code;
  return code === "42P01" /* undefined_table */ || code === "42703" /* undefined_column */;
}

async function readQuery<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (isMissingSchema(e)) {
      schemaReady = false;
      await ensureSchema();
      return run();
    }
    throw e;
  }
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
    status: (r.status as EventItem["status"]) || "published",
    publishAt: (r.publish_at instanceof Date ? r.publish_at : new Date(r.publish_at || Date.now())).toISOString(),
    updatedBy: r.updated_by ?? null,
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
    status: (r.status as NewsItem["status"]) || "published",
    updatedBy: r.updated_by ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------- EVENTS ----------

// Alle Events (Admin) – inkl. Entwürfe/geplante. Nicht gecacht: Admin sieht stets frisch.
export async function getEvents(): Promise<EventItem[]> {
  if (!isDbConfigured()) return seedEvents;
  const { rows } = await readQuery(() => sql`SELECT * FROM events ORDER BY date ASC, time ASC;`);
  return rows.map(rowToEvent);
}

// Öffentlich sichtbare Events (veröffentlicht und Publikationszeitpunkt erreicht). Gecacht.
export const getPublishedEvents = unstable_cache(
  async (): Promise<EventItem[]> => {
    if (!isDbConfigured()) return seedEvents;
    const { rows } = await readQuery(() => sql`
      SELECT * FROM events
      WHERE status = 'published' AND publish_at <= now()
      ORDER BY date ASC, time ASC;
    `);
    return rows.map(rowToEvent);
  },
  ["published-events"],
  { revalidate: PUBLIC_REVALIDATE, tags: [TAGS.events] }
);

export async function createEvent(input: Omit<EventItem, "id">): Promise<EventItem> {
  await ensureSchema();
  const id = genId("evt");
  const res = await sql`
    INSERT INTO events (id, title, date, time, location, description, image_url, links, badge, status, publish_at, updated_by)
    VALUES (${id}, ${input.title}, ${input.date}, ${input.time}, ${input.location},
            ${input.description}, ${input.imageUrl ?? null},
            ${JSON.stringify(input.links ?? [])}::jsonb, ${input.badge ?? null},
            ${input.status ?? "published"}, ${input.publishAt ?? new Date().toISOString()}, ${input.updatedBy ?? null})
    RETURNING *;
  `;
  revalidateTag(TAGS.events);
  return rowToEvent(res.rows[0]);
}

export async function updateEvent(id: string, input: Omit<EventItem, "id">): Promise<EventItem> {
  await ensureSchema();
  const res = await sql`
    UPDATE events SET
      title = ${input.title},
      date = ${input.date},
      time = ${input.time ?? ""},
      location = ${input.location ?? ""},
      description = ${input.description ?? ""},
      image_url = ${input.imageUrl ?? null},
      links = ${JSON.stringify(input.links ?? [])}::jsonb,
      badge = ${input.badge ?? null},
      status = ${input.status ?? "published"},
      publish_at = ${input.publishAt ?? new Date().toISOString()},
      updated_by = ${input.updatedBy ?? null}
    WHERE id = ${id}
    RETURNING *;
  `;
  if (res.rows.length === 0) {
    throw new Error(`Event nicht gefunden (id=${id}).`);
  }
  revalidateTag(TAGS.events);
  return rowToEvent(res.rows[0]);
}

export async function deleteEvent(id: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM events WHERE id = ${id};`;
  revalidateTag(TAGS.events);
}

// ---------- NEWS ----------

// Alle News (Admin) – inkl. Entwürfe/geplante. Nicht gecacht: Admin sieht stets frisch.
export async function getNews(): Promise<NewsItem[]> {
  if (!isDbConfigured()) return seedNews;
  const { rows } = await readQuery(() => sql`SELECT * FROM news ORDER BY sort_order ASC, published_at DESC;`);
  return rows.map(rowToNews);
}

// Öffentlich sichtbare News (veröffentlicht und Publikationszeitpunkt erreicht). Gecacht.
export const getPublishedNews = unstable_cache(
  async (): Promise<NewsItem[]> => {
    if (!isDbConfigured()) return seedNews;
    const { rows } = await readQuery(() => sql`
      SELECT * FROM news
      WHERE status = 'published' AND published_at <= now()
      ORDER BY sort_order ASC, published_at DESC;
    `);
    return rows.map(rowToNews);
  },
  ["published-news"],
  { revalidate: PUBLIC_REVALIDATE, tags: [TAGS.news] }
);

export async function createNews(
  input: Omit<NewsItem, "id" | "sortOrder">
): Promise<NewsItem> {
  await ensureSchema();
  const id = genId("news");
  const { rows: minRows } = await sql`SELECT COALESCE(MIN(sort_order), 0) - 1 AS next FROM news;`;
  const sortOrder = minRows[0].next;
  const res = await sql`
    INSERT INTO news (id, title, summary, content, image_url, links, category, sort_order, is_archived, published_at, status, updated_by)
    VALUES (${id}, ${input.title}, ${input.summary}, ${input.content}, ${input.imageUrl ?? null},
            ${JSON.stringify(input.links ?? [])}::jsonb, ${input.category}, ${sortOrder},
            ${input.isArchived ?? false}, ${input.publishedAt ?? new Date().toISOString()},
            ${input.status ?? "published"}, ${input.updatedBy ?? null})
    RETURNING *;
  `;
  revalidateTag(TAGS.news);
  return rowToNews(res.rows[0]);
}

export async function updateNews(
  id: string,
  input: Omit<NewsItem, "id" | "sortOrder">
): Promise<NewsItem> {
  await ensureSchema();
  const res = await sql`
    UPDATE news SET
      title = ${input.title},
      summary = ${input.summary ?? ""},
      content = ${input.content ?? ""},
      image_url = ${input.imageUrl ?? null},
      links = ${JSON.stringify(input.links ?? [])}::jsonb,
      category = ${input.category ?? "news"},
      is_archived = ${input.isArchived ?? false},
      published_at = ${input.publishedAt ?? new Date().toISOString()},
      status = ${input.status ?? "published"},
      updated_by = ${input.updatedBy ?? null}
    WHERE id = ${id}
    RETURNING *;
  `;
  if (res.rows.length === 0) {
    throw new Error(`Newsbeitrag nicht gefunden (id=${id}).`);
  }
  revalidateTag(TAGS.news);
  return rowToNews(res.rows[0]);
}

export async function deleteNews(id: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM news WHERE id = ${id};`;
  revalidateTag(TAGS.news);
}

export async function reorderNews(orderedIds: string[]): Promise<void> {
  await ensureSchema();
  for (let i = 0; i < orderedIds.length; i++) {
    await sql`UPDATE news SET sort_order = ${i} WHERE id = ${orderedIds[i]};`;
  }
  revalidateTag(TAGS.news);
}

// ---------- AKTIONEN (Rabattaktionen) ----------

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToAction(r: any): ActionItem {
  const d = r.created_at instanceof Date ? r.created_at : new Date(r.created_at);
  return {
    id: r.id,
    title: r.title,
    description: r.description || "",
    discount: r.discount || "",
    periodLabel: r.period_label || "",
    createdAt: d.toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const getActions = unstable_cache(
  async (limit?: number): Promise<ActionItem[]> => {
    if (!isDbConfigured()) return [];
    const { rows } = limit
      ? await readQuery(() => sql`SELECT * FROM actions ORDER BY created_at DESC LIMIT ${limit};`)
      : await readQuery(() => sql`SELECT * FROM actions ORDER BY created_at DESC;`);
    return rows.map(rowToAction);
  },
  ["actions"],
  { revalidate: PUBLIC_REVALIDATE, tags: [TAGS.actions] }
);

export async function getLatestAction(): Promise<ActionItem | null> {
  const list = await getActions(1);
  return list[0] ?? null;
}

export async function createAction(
  input: Omit<ActionItem, "id" | "createdAt">
): Promise<ActionItem> {
  await ensureSchema();
  const id = genId("act");
  const res = await sql`
    INSERT INTO actions (id, title, description, discount, period_label)
    VALUES (${id}, ${input.title}, ${input.description ?? ""}, ${input.discount ?? ""}, ${input.periodLabel ?? ""})
    RETURNING *;
  `;
  revalidateTag(TAGS.actions);
  return rowToAction(res.rows[0]);
}

export async function updateAction(
  id: string,
  input: Omit<ActionItem, "id" | "createdAt">
): Promise<ActionItem> {
  await ensureSchema();
  const res = await sql`
    UPDATE actions SET
      title = ${input.title},
      description = ${input.description ?? ""},
      discount = ${input.discount ?? ""},
      period_label = ${input.periodLabel ?? ""}
    WHERE id = ${id}
    RETURNING *;
  `;
  if (res.rows.length === 0) {
    throw new Error(`Aktion nicht gefunden (id=${id}).`);
  }
  revalidateTag(TAGS.actions);
  return rowToAction(res.rows[0]);
}

export async function deleteAction(id: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM actions WHERE id = ${id};`;
  revalidateTag(TAGS.actions);
}

// ---------- PARTNER ----------

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToPartner(r: any): PartnerItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category || "",
    description: r.description || "",
    address: r.address ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    website: r.website ?? null,
    discount: r.discount ?? null,
    sortOrder: r.sort_order ?? 0,
  };
}
function rowToBoard(r: any): BoardMemberItem {
  return {
    id: r.id,
    name: r.name,
    role: r.role || "",
    description: r.description ?? null,
    imageUrl: r.image_url ?? null,
    sortOrder: r.sort_order ?? 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const getPartners = unstable_cache(
  async (): Promise<PartnerItem[]> => {
    if (!isDbConfigured()) return seedPartners.map((p, i) => ({ ...p, sortOrder: i })) as PartnerItem[];
    const { rows } = await readQuery(() => sql`SELECT * FROM partners ORDER BY sort_order ASC, name ASC;`);
    return rows.map(rowToPartner);
  },
  ["partners"],
  { revalidate: PUBLIC_REVALIDATE, tags: [TAGS.partners] }
);

export async function createPartner(input: Omit<PartnerItem, "id" | "sortOrder">): Promise<PartnerItem> {
  await ensureSchema();
  const id = genId("prt");
  const { rows: mx } = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM partners;`;
  const res = await sql`
    INSERT INTO partners (id, name, category, description, address, phone, email, website, discount, sort_order)
    VALUES (${id}, ${input.name}, ${input.category ?? ""}, ${input.description ?? ""}, ${input.address ?? null},
            ${input.phone ?? null}, ${input.email ?? null}, ${input.website ?? null}, ${input.discount ?? null}, ${mx[0].next})
    RETURNING *;
  `;
  revalidateTag(TAGS.partners);
  return rowToPartner(res.rows[0]);
}

export async function updatePartner(id: string, input: Omit<PartnerItem, "id" | "sortOrder">): Promise<PartnerItem> {
  await ensureSchema();
  const res = await sql`
    UPDATE partners SET
      name = ${input.name}, category = ${input.category ?? ""}, description = ${input.description ?? ""},
      address = ${input.address ?? null}, phone = ${input.phone ?? null}, email = ${input.email ?? null},
      website = ${input.website ?? null}, discount = ${input.discount ?? null}
    WHERE id = ${id}
    RETURNING *;
  `;
  if (res.rows.length === 0) throw new Error(`Partner nicht gefunden (id=${id}).`);
  revalidateTag(TAGS.partners);
  return rowToPartner(res.rows[0]);
}

export async function deletePartner(id: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM partners WHERE id = ${id};`;
  revalidateTag(TAGS.partners);
}

export async function reorderPartners(orderedIds: string[]): Promise<void> {
  await ensureSchema();
  for (let i = 0; i < orderedIds.length; i++) {
    await sql`UPDATE partners SET sort_order = ${i} WHERE id = ${orderedIds[i]};`;
  }
  revalidateTag(TAGS.partners);
}

// ---------- VORSTAND ----------

export const getBoard = unstable_cache(
  async (): Promise<BoardMemberItem[]> => {
    if (!isDbConfigured()) return seedBoard.map((b, i) => ({ id: `brd_${i}`, ...b, sortOrder: i })) as BoardMemberItem[];
    const { rows } = await readQuery(() => sql`SELECT * FROM board_members ORDER BY sort_order ASC;`);
    return rows.map(rowToBoard);
  },
  ["board"],
  { revalidate: PUBLIC_REVALIDATE, tags: [TAGS.board] }
);

export async function createBoardMember(input: Omit<BoardMemberItem, "id" | "sortOrder">): Promise<BoardMemberItem> {
  await ensureSchema();
  const id = genId("brd");
  const { rows: mx } = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM board_members;`;
  const res = await sql`
    INSERT INTO board_members (id, name, role, description, image_url, sort_order)
    VALUES (${id}, ${input.name}, ${input.role ?? ""}, ${input.description ?? null}, ${input.imageUrl ?? null}, ${mx[0].next})
    RETURNING *;
  `;
  revalidateTag(TAGS.board);
  return rowToBoard(res.rows[0]);
}

export async function updateBoardMember(id: string, input: Omit<BoardMemberItem, "id" | "sortOrder">): Promise<BoardMemberItem> {
  await ensureSchema();
  const res = await sql`
    UPDATE board_members SET
      name = ${input.name}, role = ${input.role ?? ""},
      description = ${input.description ?? null}, image_url = ${input.imageUrl ?? null}
    WHERE id = ${id}
    RETURNING *;
  `;
  if (res.rows.length === 0) throw new Error(`Vorstandsmitglied nicht gefunden (id=${id}).`);
  revalidateTag(TAGS.board);
  return rowToBoard(res.rows[0]);
}

export async function deleteBoardMember(id: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM board_members WHERE id = ${id};`;
  revalidateTag(TAGS.board);
}

export async function reorderBoard(orderedIds: string[]): Promise<void> {
  await ensureSchema();
  for (let i = 0; i < orderedIds.length; i++) {
    await sql`UPDATE board_members SET sort_order = ${i} WHERE id = ${orderedIds[i]};`;
  }
  revalidateTag(TAGS.board);
}

// ---------- ADMIN-BENUTZER ----------

export async function verifyLogin(username: string, password: string): Promise<AdminUser | null> {
  if (!isDbConfigured()) return null;
  // Beim Login erstmalig das Schema sicherstellen (legt bei Erstnutzung die
  // Admin-Benutzer an). Danach greift readQuery als Selbstheilung.
  await ensureSchema();
  const { rows } = await readQuery(() => sql`SELECT * FROM admin_users WHERE username = ${username};`);
  if (rows.length === 0) return null;
  const h = await hashPassword(password);
  if (h !== rows[0].password_hash) return null;
  return { username: rows[0].username, name: rows[0].name || "", role: rows[0].role as AdminRole };
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { rows } = await readQuery(() => sql`SELECT username, name, role FROM admin_users ORDER BY role DESC, username ASC;`);
  return rows.map((r) => ({ username: r.username, name: r.name || "", role: r.role as AdminRole }));
}

export async function getAdminRole(username: string): Promise<AdminRole | null> {
  if (!isDbConfigured()) return null;
  const { rows } = await readQuery(() => sql`SELECT role FROM admin_users WHERE username = ${username};`);
  return rows.length ? (rows[0].role as AdminRole) : null;
}

export async function createAdminUser(input: {
  username: string;
  name: string;
  role: AdminRole;
  password: string;
}): Promise<void> {
  await ensureSchema();
  const exists = await sql`SELECT 1 FROM admin_users WHERE username = ${input.username};`;
  if (exists.rows.length > 0) throw new Error("Benutzername bereits vergeben.");
  const h = await hashPassword(input.password);
  await sql`
    INSERT INTO admin_users (username, password_hash, role, name)
    VALUES (${input.username}, ${h}, ${input.role}, ${input.name});
  `;
}

export async function updateAdminUser(
  username: string,
  input: { name?: string; role?: AdminRole; password?: string }
): Promise<void> {
  await ensureSchema();
  if (input.name !== undefined) {
    await sql`UPDATE admin_users SET name = ${input.name} WHERE username = ${username};`;
  }
  if (input.role !== undefined) {
    await sql`UPDATE admin_users SET role = ${input.role} WHERE username = ${username};`;
  }
  if (input.password) {
    const h = await hashPassword(input.password);
    await sql`UPDATE admin_users SET password_hash = ${h} WHERE username = ${username};`;
  }
}

export async function deleteAdminUser(username: string): Promise<void> {
  await ensureSchema();
  const sa = await sql`SELECT COUNT(*)::int AS c FROM admin_users WHERE role = 'superadmin';`;
  const target = await sql`SELECT role FROM admin_users WHERE username = ${username};`;
  if (target.rows.length && target.rows[0].role === "superadmin" && sa.rows[0].c <= 1) {
    throw new Error("Der letzte Super-Admin kann nicht gelöscht werden.");
  }
  await sql`DELETE FROM admin_users WHERE username = ${username};`;
}

// ---------- EINSTELLUNGEN (z.B. Maintenance Mode) ----------

export async function getSetting(key: string): Promise<string | null> {
  if (!isDbConfigured()) return null;
  const { rows } = await readQuery(() => sql`SELECT value FROM app_settings WHERE key = ${key};`);
  return rows.length ? rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO app_settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value};
  `;
  revalidateTag(TAGS.settings);
}

// Gecacht: wird im Layout bei jedem Seitenaufruf gelesen. setSetting/setMaintenance
// lösen über den "settings"-Tag sofort eine Aktualisierung aus.
export const getMaintenance = unstable_cache(
  async (): Promise<boolean> => {
    try {
      return (await getSetting("maintenance")) === "true";
    } catch {
      return false;
    }
  },
  ["maintenance"],
  { revalidate: PUBLIC_REVALIDATE, tags: [TAGS.settings] }
);

export async function setMaintenance(on: boolean): Promise<void> {
  await setSetting("maintenance", on ? "true" : "false");
}
