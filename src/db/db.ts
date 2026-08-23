import { neon } from "@neondatabase/serverless";
import {
  CREATE_TABLES,
  MIGRATIONS,
  SEED_MOVES,
  SEED_PLATES,
  SEED_PROFILES,
} from "./schema";
import type { Move, Pillar, Plate, Profile } from "./schema";

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
  // Idempotent migrations for schemas created by an older version of the DDL.
  for (const statement of MIGRATIONS) {
    await db`${db.unsafe(statement)}`;
  }
  await seedStaticContent();
}

/** Insert seed profiles / moves / plates, updating any row that already exists. */
async function seedStaticContent(): Promise<void> {
  const db = sql();
  for (const p of SEED_PROFILES) {
    // DO UPDATE (not DO NOTHING) so rows seeded by an earlier version get
    // corrected to the LOCKED pillar mapping and the current copy.
    await db`
      INSERT INTO fed.profiles (slug, name, pillar, headline, one_liner, description)
      VALUES (${p.slug}, ${p.name}, ${p.pillar}, ${p.headline}, ${p.oneLiner}, ${p.description})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        pillar = EXCLUDED.pillar,
        headline = EXCLUDED.headline,
        one_liner = EXCLUDED.one_liner,
        description = EXCLUDED.description
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

/** Return one profile by slug (e.g. "wired-and-tired"), or null if absent. */
export async function getProfileBySlug(slug: string): Promise<Profile | null> {
  const rows = await sql()`
    SELECT id, slug, name, pillar, headline, one_liner AS "oneLiner", description
    FROM fed.profiles WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows.length ? (rows[0] as unknown as Profile) : null;
}

/** Return one profile by its dominant pillar — the KEY the result page uses to identify the profile. */
export async function getProfileByPillar(pillar: Pillar): Promise<Profile | null> {
  const rows = await sql()`
    SELECT id, slug, name, pillar, headline, one_liner AS "oneLiner", description
    FROM fed.profiles WHERE pillar = ${pillar}
    LIMIT 1
  `;
  return rows.length ? (rows[0] as unknown as Profile) : null;
}

/** Funnel steps we want to measure (email-capture rate, quiz→paid conversion). */
export type FunnelStep =
  | "quiz_started"
  | "email_captured"
  | "score_revealed"
  | "paywall_clicked";

/** Advance a user's funnel_step (idempotent-ish: never move backwards). */
export async function markFunnelStep(userId: number, step: FunnelStep): Promise<void> {
  await sql()`
    UPDATE fed.users
    SET funnel_step = ${step}
    WHERE id = ${userId}
  `;
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

// ── Plan access gate ───────────────────────────────────────────────────────
/**
 * True when the user holds an active plan: either a plan_access row at the
 * 'plan' level that hasn't expired, OR the users row itself is 'paid'. The
 * four paywalled screens call this; when false they render <Locked/>.
 * E2E/QA can grant access by inserting a plan_access row (or setting plan).
 */
export async function hasActivePlan(userId: number): Promise<boolean> {
  const rows = await sql()`
    SELECT
      (EXISTS (
        SELECT 1 FROM fed.plan_access
        WHERE user_id = ${userId} AND access_level = 'plan'
          AND (expires_at IS NULL OR expires_at > now())
      )
      OR EXISTS (
        SELECT 1 FROM fed.users WHERE id = ${userId} AND plan = 'paid'
      )) AS "has"
  `;
  return rows.length ? Boolean(rows[0].has) : false;
}

/**
 * Grant an active paid plan to a user (upsert on plan_access + flip users.plan
 * to 'paid'). This is the v1 activation handoff after a Stripe founding-purchase:
 * we cannot verify the purchase server-side (no Stripe secret/webhook with our
 * managed one-time payment link), so a returning buyer enters the email they
 * paid with and we grant access for that email. It also grants for E2E/QA.
 * Idempotent — safe to call repeatedly.
 */
export async function grantPlanAccess(userId: number): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO fed.plan_access (user_id, plan, access_level, granted_at, expires_at, stripe_session_id)
    VALUES (${userId}, 'paid', 'plan', now(), NULL, NULL)
    ON CONFLICT (user_id, plan) DO UPDATE SET
      access_level = 'plan',
      granted_at   = now(),
      expires_at   = NULL
  `;
  await db`UPDATE fed.users SET plan = 'paid' WHERE id = ${userId}`;
}

/**
 * Grant a free "tester" plan to a user via the shared tester code. Uses the
 * SAME gate as a paid grant (plan_access row at access_level 'plan', never
 * expiring) but with plan 'tester' (NOT 'paid') and a 'tester' note in
 * stripe_session_id so testers stay clearly distinguishable from paid users
 * (users.plan stays 'free'). Idempotent — safe to call repeatedly.
 */
export async function grantTesterAccess(userId: number): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO fed.plan_access (user_id, plan, access_level, granted_at, expires_at, stripe_session_id)
    VALUES (${userId}, 'tester', 'plan', now(), NULL, 'tester')
    ON CONFLICT (user_id, plan) DO UPDATE SET
      access_level = 'plan',
      granted_at   = now(),
      expires_at   = NULL,
      stripe_session_id = 'tester'
  `;
}

/** One user row by id (email needed for feedback auto-tagging). */
export async function getUserById(
  userId: number,
): Promise<{ id: number; email: string } | null> {
  const rows = await sql()`SELECT id, email FROM fed.users WHERE id = ${userId} LIMIT 1`;
  return rows.length ? (rows[0] as { id: number; email: string }) : null;
}

/**
 * True when the user unlocked FED as a TESTER (via the shared free tester
 * code—grantTesterAccess tags its plan_access row with plan='tester'). This is
 * what separates testers from paying buyers: buyers get plan_access.plan='paid'
 * (grantPlanAccess) or users.plan='paid'; testers get plan_access.plan='tester'
 * with users.plan left 'free'. The tester-only feedback page gates on this.
 */
export async function isTester(userId: number): Promise<boolean> {
  const rows = await sql()`
    SELECT EXISTS (
      SELECT 1 FROM fed.plan_access
      WHERE user_id = ${userId} AND plan = 'tester' AND access_level = 'plan'
        AND (expires_at IS NULL OR expires_at > now())
    ) AS "is"
  `;
  return rows.length ? Boolean(rows[0].is) : false;
}

/** Latest quiz attempt summary for a user (for feedback auto-tagging). */
export interface QuizAttemptSummary {
  profile: string;
  fedScore: number;
  intensity: string;
}
export async function getLatestQuizAttempt(
  userId: number,
): Promise<QuizAttemptSummary | null> {
  const rows = await sql()`
    SELECT profile, fed_score AS "fedScore", intensity
    FROM fed.quiz_attempts WHERE user_id = ${userId}
    ORDER BY id DESC LIMIT 1
  `;
  return rows.length ? (rows[0] as QuizAttemptSummary) : null;
}

/** Insert one tester feedback submission, auto-tagged with profile context. */
export interface FeedbackInsert {
  userId: number;
  email: string;
  whatWorked: string;
  whatToChange: string;
  rating: number | null;
  profile: string | null;
  profileName: string | null;
  fedScore: number | null;
  intensity: string | null;
}
export async function insertFeedback(f: FeedbackInsert): Promise<void> {
  await sql()`
    INSERT INTO fed.feedback_submissions
      (user_id, email, what_worked, what_to_change, rating,
       profile, profile_name, fed_score, intensity)
    VALUES
      (${f.userId}, ${f.email}, ${f.whatWorked}, ${f.whatToChange}, ${f.rating},
       ${f.profile ?? null}, ${f.profileName ?? null}, ${f.fedScore ?? null}, ${f.intensity ?? null})
  `;
}

// ── Fasting sessions (server timestamps = source of truth) ─────────────────
/** Begin a fast. Postgres `now()` sets the server timestamp so streaks survive
 *  client refreshes / timezones (we never trust a client clock for timing). */
export async function startFast(
  userId: number,
  plannedHours: number | null = null,
): Promise<void> {
  const db = sql();
  await db`INSERT INTO fed.fasting_sessions (user_id, started_at, planned_hours)
           VALUES (${userId}, now(), ${plannedHours})`;
}
/** Close any currently-open fast for this user. */
export async function endOpenFast(userId: number): Promise<void> {
  const db = sql();
  await db`UPDATE fed.fasting_sessions SET ended_at = now()
           WHERE user_id = ${userId} AND ended_at IS NULL`;
}
export interface FastingRow {
  id: number;
  startedAt: Date | string;
  endedAt: Date | string | null;
  plannedHours: number | null;
}
/** Most recent fasts for the history list. */
export async function listFasts(userId: number, limit = 15): Promise<FastingRow[]> {
  const db = sql();
  const rows = await db`
    SELECT id, started_at AS "startedAt", ended_at AS "endedAt",
           planned_hours AS "plannedHours"
    FROM fed.fasting_sessions
    WHERE user_id = ${userId}
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;
  return rows as FastingRow[];
}

// ── Daily checkins (moves/plates done-flag + 4 tracker sliders) ────────────
export interface CheckinFields {
  energy?: number | null;
  sleep?: number | null;
  weight?: number | null;
  waist?: number | null;
  moveDone?: boolean;
  plateDone?: boolean;
}
/**
 * Idempotent per-(user, date) upsert. Each provided field is merged into the
 * row; absent fields are preserved (COALESCE keeps the existing value), so a
 * move-completion and a gadget-slider save coexist on the same daily row.
 */
export async function saveCheckin(
  userId: number,
  date: string,
  f: CheckinFields,
): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO fed.checkins (user_id, date, energy, sleep, weight, waist, move_done, plate_done)
    VALUES (${userId}, ${date}, ${f.energy ?? null}, ${f.sleep ?? null},
            ${f.weight ?? null}, ${f.waist ?? null},
            ${f.moveDone ?? false}, ${f.plateDone ?? false})
    ON CONFLICT (user_id, date) DO UPDATE SET
      energy     = COALESCE(EXCLUDED.energy, fed.checkins.energy),
      sleep      = COALESCE(EXCLUDED.sleep, fed.checkins.sleep),
      weight     = COALESCE(EXCLUDED.weight, fed.checkins.weight),
      waist      = COALESCE(EXCLUDED.waist, fed.checkins.waist),
      move_done  = (fed.checkins.move_done OR EXCLUDED.move_done),
      plate_done = (fed.checkins.plate_done OR EXCLUDED.plate_done)
  `;
}
export interface CheckinRow {
  date: string;
  energy: number | null;
  sleep: number | null;
  weight: number | null;
  waist: number | null;
  moveDone: boolean;
  plateDone: boolean;
}
/** One day's checkin (used by the tracker + move/plate done flags). */
export async function getCheckin(userId: number, date: string): Promise<CheckinRow | null> {
  const db = sql();
  const rows = await db`
    SELECT date::text AS date, energy, sleep, weight, waist, move_done AS "moveDone", plate_done AS "plateDone"
    FROM fed.checkins WHERE user_id = ${userId} AND date = ${date} LIMIT 1
  `;
  return rows.length ? (rows[0] as CheckinRow) : null;
}
/** All checkin days (for the tracker recap / daily streak computation). */
export async function listCheckins(userId: number): Promise<CheckinRow[]> {
  const db = sql();
  const rows = await db`
    SELECT date::text AS date, energy, sleep, weight, waist, move_done AS "moveDone", plate_done AS "plateDone"
    FROM fed.checkins WHERE user_id = ${userId} ORDER BY date ASC
  `;
  return rows as CheckinRow[];
}
/** All moves (for the deterministic "today's move" pick). */
export async function listMoves(): Promise<Move[]> {
  const rows = await sql()`
    SELECT id, slug, title, pillar, duration_min AS "durationMin",
           difficulty, instructions FROM fed.moves ORDER BY id
  `;
  return rows as Move[];
}
/** All plates (for the deterministic "today's plate" pick). */
export async function listPlates(): Promise<Plate[]> {
  const rows = await sql()`
    SELECT id, slug, title, pillar, description FROM fed.plates ORDER BY id
  `;
  return rows as Plate[];
}
