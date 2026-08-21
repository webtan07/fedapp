import { neon } from "@neondatabase/serverless";
import {
  CREATE_TABLES,
  SEED_MOVES,
  SEED_PLATES,
  SEED_PROFILES,
} from "./schema";
import type { Profile } from "./schema";

/**
 * Server-only handle to the app's database (Neon serverless Postgres over HTTP).
 * The connection string comes from `DATABASE_URL` (see .env.example). Resolved
 * lazily (per call, not at module load) so the app still builds and serves
 * before a database is connected — the error only surfaces if a query actually
 * runs without `DATABASE_URL`.
 *
 * Use it only inside a `createServerFn()` handler or an API route (never client
 * code). All helpers below are parameterized — never concatenate user input
 * into SQL strings.
 */
export const sql = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — copy .env.example to .env and add the Neon connection string before running queries.",
    );
  }
  return neon(url);
};

// ── Schema ────────────────────────────────────────────────────────────────
/**
 * Run the canonical DDL (CREATE SCHEMA/TABLE IF NOT EXISTS) so a fresh
 * database self-heals on first use. Each statement runs on its own — the Neon
 * serverless driver executes single statements only, so a multi-statement
 * string would silently no-op. Also upserts the seed rows (idempotent).
 */
export async function ensureSchema(): Promise<void> {
  const db = sql();
  for (const statement of CREATE_TABLES) {
    await db`${db.unsafe(statement)}`;
  }
  await seedStaticContent();
}

/** Insert seed profiles / moves / plates, skipping any that already exist. */
async function seedStaticContent(): Promise<void> {
  const db = sql();
  for (const p of SEED_PROFILES) {
    await db`
      INSERT INTO fed.profiles (slug, name, pillar, headline, one_liner, description)
      VALUES (${p.slug}, ${p.name}, ${p.pillar}, ${p.headline}, ${p.oneLiner}, ${p.description})
      ON CONFLICT (slug) DO NOTHING
    `;
  }
  for (const m of SEED_MOVES) {
    await db`
      INSERT INTO fed.moves (slug, title, pillar, duration_min, difficulty, instructions)
      VALUES (${m.slug}, ${m.title}, ${m.pillar}, ${m.durationMin}, ${m.difficulty}, ${m.instructions})
      ON CONFLICT (slug) DO NOTHING
    `;
  }
  for (const pl of SEED_PLATES) {
    await db`
      INSERT INTO fed.plates (slug, title, pillar, description)
      VALUES (${pl.slug}, ${pl.title}, ${pl.pillar}, ${pl.description})
      ON CONFLICT (slug) DO NOTHING
    `;
  }
}

// ── Query helpers (parameterized only) ────────────────────────────────────
/** Return the profiles list (seeded). */
export async function listProfiles(): Promise<Profile[]> {
  const rows = await sql()`SELECT * FROM fed.profiles ORDER BY id`;
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    pillar: r.pillar,
    headline: r.headline,
    oneLiner: r.one_liner,
    description: r.description,
  }));
}

/** Row helper for users: get-or-create by email. */
export async function getOrCreateUser(email: string): Promise<{
  id: number;
  email: string;
  plan: string;
}> {
  const db = sql();
  const rows = await db`
    INSERT INTO fed.users (email)
    VALUES (${email})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id, email, plan
  `;
  return { id: rows[0].id, email: rows[0].email, plan: rows[0].plan };
}

/** List the FED tables present in the `fed` schema (for the healthcheck). */
export async function listFedTables(): Promise<string[]> {
  const rows = await sql()`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'fed'
    ORDER BY table_name
  `;
  return rows.map((r) => r.table_name);
}
