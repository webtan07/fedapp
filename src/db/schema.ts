/**
 * FED database schema — types + canonical DDL.
 *
 * FED runs in the same Neon account as instagram-automation but under its own
 * Postgres schema (`fed`) so the two products never collide and nothing here
 * touches instagram-automation's `public` tables.
 *
 * All DDL is idempotent (CREATE SCHEMA/TABLE IF NOT EXISTS). The Neon
 * serverless driver executes one statement per call, so `ensureSchema()` runs
 * the array statement-by-statement (see db.ts).
 */

// ── Domain types ──────────────────────────────────────────────────────────
export type Plan = "free" | "paid";
export type AccessLevel = "free" | "plan";
export type Pillar = "fasting" | "exercise" | "diet";
export type Intensity = "low" | "mid" | "high";

export interface User {
  id: number;
  email: string;
  plan: Plan;
  planExpiresAt: Date | string | null;
  createdAt: Date | string;
}

export interface QuizAttempt {
  id: number;
  userId: number;
  answers: Record<string, number>; // jsonb — questionKey -> score (0-8)
  fedScore: number; // 0-24
  scores: Record<Pillar, number>; // jsonb — per-pillar sub-scores (0-8 each)
  dominantPillar: Pillar;
  profile: string; // profile slug
  intensity: Intensity;
  createdAt: Date | string;
}

export interface Profile {
  id: number;
  slug: string;
  name: string;
  pillar: Pillar;
  headline: string;
  oneLiner: string;
  description: string;
}

export interface Checkin {
  id: number;
  userId: number;
  date: string; // YYYY-MM-DD, unique per (user, date)
  energy: number | null; // 0-10
  sleep: number | null; // 0-10
  weight: number | null; // kg
  waist: number | null; // cm
  /** Daily "Today's Move" completed flag (lives on the daily checkin row). */
  moveDone: boolean;
  /** Daily "Today's Plate" completed flag (lives on the daily checkin row). */
  plateDone: boolean;
  createdAt: Date | string;
}

export interface FastingSession {
  id: number;
  userId: number;
  startedAt: Date | string;
  endedAt: Date | string | null;
  plannedHours: number | null;
  createdAt: Date | string;
}

export interface Move {
  id: number;
  slug: string;
  title: string;
  pillar: Pillar;
  durationMin: number;
  difficulty: string;
  instructions: string;
}

export interface Plate {
  id: number;
  slug: string;
  title: string;
  pillar: Pillar;
  description: string;
}

export interface PlanAccess {
  id: number;
  userId: number;
  plan: Plan;
  accessLevel: AccessLevel;
  stripeSessionId: string | null;
  grantedAt: Date | string;
  expiresAt: Date | string | null;
}

// ── Canonical DDL ─────────────────────────────────────────────────────────
const SCHEMA = "fed";

/**
 * Every statement is idempotent (IF NOT EXISTS). Kept as an array so the Neon
 * HTTP driver can run each one individually.
 */
export const CREATE_TABLES: string[] = [
  `CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`,

  `CREATE TABLE IF NOT EXISTS ${SCHEMA}.users (
    id               serial PRIMARY KEY,
    email            text NOT NULL UNIQUE,
    plan             text NOT NULL DEFAULT 'free'
                     CHECK (plan IN ('free', 'paid')),
    plan_expires_at  timestamptz,
    funnel_step      text NOT NULL DEFAULT 'quiz_started',
    created_at       timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS ${SCHEMA}.profiles (
    id           serial PRIMARY KEY,
    slug         text NOT NULL UNIQUE,
    name         text NOT NULL,
    pillar       text NOT NULL CHECK (pillar IN ('fasting', 'exercise', 'diet')),
    headline     text NOT NULL DEFAULT '',
    one_liner    text NOT NULL DEFAULT '',
    description  text NOT NULL DEFAULT ''
  )`,

  `CREATE TABLE IF NOT EXISTS ${SCHEMA}.quiz_attempts (
    id               serial PRIMARY KEY,
    user_id          int NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
    answers          jsonb NOT NULL DEFAULT '{}'::jsonb,
    fed_score        int NOT NULL DEFAULT 0,
    scores           jsonb NOT NULL DEFAULT '{}'::jsonb,
    dominant_pillar  text NOT NULL CHECK (dominant_pillar IN ('fasting', 'exercise', 'diet')),
    profile          text NOT NULL DEFAULT '',
    intensity        text NOT NULL CHECK (intensity IN ('low', 'mid', 'high')),
    created_at       timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS ${SCHEMA}.quiz_answers (
    id             serial PRIMARY KEY,
    attempt_id     int NOT NULL REFERENCES ${SCHEMA}.quiz_attempts(id) ON DELETE CASCADE,
    question_key   text NOT NULL,
    answer         int NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS ${SCHEMA}.checkins (
    id           serial PRIMARY KEY,
    user_id      int NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
    date         date NOT NULL,
    energy       int CHECK (energy BETWEEN 0 AND 10),
    sleep        int CHECK (sleep BETWEEN 0 AND 10),
    weight       numeric(6,2),
    waist        numeric(6,2),
    move_done    boolean NOT NULL DEFAULT false,
    plate_done   boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT checkins_user_date_key UNIQUE (user_id, date)
  )`,

  `CREATE TABLE IF NOT EXISTS ${SCHEMA}.fasting_sessions (
    id             serial PRIMARY KEY,
    user_id        int NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
    started_at     timestamptz NOT NULL,
    ended_at       timestamptz,
    planned_hours  int,
    created_at     timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS ${SCHEMA}.moves (
    id            serial PRIMARY KEY,
    slug          text NOT NULL UNIQUE,
    title         text NOT NULL,
    pillar        text NOT NULL CHECK (pillar IN ('fasting', 'exercise', 'diet')),
    duration_min  int NOT NULL DEFAULT 10,
    difficulty    text NOT NULL DEFAULT 'easy',
    instructions  text NOT NULL DEFAULT ''
  )`,

  `CREATE TABLE IF NOT EXISTS ${SCHEMA}.plates (
    id           serial PRIMARY KEY,
    slug         text NOT NULL UNIQUE,
    title        text NOT NULL,
    pillar       text NOT NULL CHECK (pillar IN ('fasting', 'exercise', 'diet')),
    description  text NOT NULL DEFAULT ''
  )`,

  `CREATE TABLE IF NOT EXISTS ${SCHEMA}.plan_access (
    id                  serial PRIMARY KEY,
    user_id             int NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
    plan                text NOT NULL DEFAULT 'paid'
                        CHECK (plan IN ('free', 'paid')),
    access_level        text NOT NULL DEFAULT 'free'
                        CHECK (access_level IN ('free', 'plan')),
    stripe_session_id   text,
    granted_at          timestamptz NOT NULL DEFAULT now(),
    expires_at          timestamptz,
    CONSTRAINT plan_access_user_plan_key UNIQUE (user_id, plan)
  )`,
];

/**
 * Seed rows for the 4 FED profiles.
 *
 * NOTE — the `pillar` values below MUST match the LOCKED profile mapping in
 * src/quiz/scoring.ts (DOMINANT_PROFILE): fasting → cortisol-crash,
 * exercise → slow-burn, diet → wired-and-tired. The result page looks up the
 * profile by dominant pillar, so a mismatch would reveal the wrong profile.
 * `completely-fed-up` is triggered when all three pillars are high (no single
 * dominant pillar); it needs a pillar to satisfy the DB CHECK but is always
 * resolved by slug, so its pillar value is inert — use 'diet'.
 */
export const SEED_PROFILES: Array<
  Pick<Profile, "slug" | "name" | "pillar" | "headline" | "oneLiner" | "description">
> = [
  {
    slug: "wired-and-tired",
    name: "Wired & Tired",
    pillar: "diet",
    headline: "Tired all day, buzzing at night",
    oneLiner: "Your energy is there — it's just arriving at the wrong time.",
    description:
      "Food — especially afternoon sugar and heavy meals — is driving the energy waves: a surge, then a crash, then a late-night second wind. It isn't a willpower problem; your fuel timing is just working against you.",
  },
  {
    slug: "cortisol-crash",
    name: "Cortisol Crash",
    pillar: "fasting",
    headline: "Exhausted before noon",
    oneLiner: "Your body is running on stress, not fuel.",
    description:
      "Your eating rhythm and your stress are tangled — skipping and grazing keep you running on empty instead of on steady fuel. The first step is a gentler, more predictable eating window.",
  },
  {
    slug: "slow-burn",
    name: "Slow Burn",
    pillar: "exercise",
    headline: "Metabolism running on a low flame",
    oneLiner: "No willpower problem — just a plan tuned wrong for you.",
    description:
      "Your body is holding tension and has stopped responding to movement as relief. The low-effort wins — gentle walks, tension release, a little more protein — nudge the flame back up without the grind.",
  },
  {
    slug: "completely-fed-up",
    name: "Completely FED Up",
    pillar: "diet",
    headline: "Everything at once, nothing working",
    oneLiner: "Time to hit reset on the whole system.",
    description:
      "When fasting, movement, and food signals are all loud at once, the answer isn't one more intense plan. It's a gentle reset — one small steady change in each pillar until the whole system settles.",
  },
];

/** A handful of starter moves/plates so the daily cards aren't empty. */
export const SEED_MOVES: Array<
  Pick<Move, "slug" | "title" | "pillar" | "durationMin" | "difficulty" | "instructions">
> = [
  {
    slug: "walk-without-phone",
    title: "Walk Without Your Phone",
    pillar: "exercise",
    durationMin: 15,
    difficulty: "easy",
    instructions: "A brisk walk with nothing in your hands. Notice your breathing settle.",
  },
  {
    slug: "five-min-stretch",
    title: "Five-Minute Stretch",
    pillar: "exercise",
    durationMin: 5,
    difficulty: "easy",
    instructions: "Gentle full-body stretch to release the day's tension.",
  },
  {
    slug: "ten-step-sun",
    title: "Ten Minutes of Sun",
    pillar: "exercise",
    durationMin: 10,
    difficulty: "easy",
    instructions: "Step outside, no phone, ten minutes of daylight and easy breathing.",
  },
  {
    slug: "gentle-hills-walk",
    title: "Gentle Hill Walk",
    pillar: "exercise",
    durationMin: 20,
    difficulty: "moderate",
    instructions: "A steady walk with a little incline — enough to warm up without grinding.",
  },
];

export const SEED_PLATES: Array<
  Pick<Plate, "slug" | "title" | "pillar" | "description">
> = [
  {
    slug: "protein-first",
    title: "Protein First Plate",
    pillar: "diet",
    description: "Lead every plate with protein, then greens, then the rest.",
  },
  {
    slug: "eat-the-rainbow",
    title: "Eat the Rainbow",
    pillar: "diet",
    description: "Aim for a few colours on the plate across the day.",
  },
  {
    slug: "warm-morning-plate",
    title: "Warm Morning Plate",
    pillar: "diet",
    description: "Start the day warm — porridge, eggs, or a smoothie with ginger. Easiest on a 40+ system.",
  },
  {
    slug: "afternoon-energy-rescue",
    title: "Afternoon Energy Rescue",
    pillar: "diet",
    description: "Meet the 3pm dip with protein and water before you reach for a sugar spike.",
  },
];

/**
 * Idempotent migrations run AFTER table creation so schema changes reach
 * databases that were created by an older version of the DDL. Ran one
 * statement per call by ensureSchema().
 */
export const MIGRATIONS: string[] = [
  `ALTER TABLE ${SCHEMA}.users ADD COLUMN IF NOT EXISTS funnel_step text NOT NULL DEFAULT 'quiz_started'`,
  // Per-day "done" flags for Today's Move / Today's Plate. Added because the
  // daily checkin row (UNIQUE user_id+date) is the natural day-scoped log for
  // all four screens, so a daily move/plate completion and the 4 tracker
  // sliders coexist on one row instead of a separate table.
  `ALTER TABLE ${SCHEMA}.checkins ADD COLUMN IF NOT EXISTS move_done boolean NOT NULL DEFAULT false`,
  `ALTER TABLE ${SCHEMA}.checkins ADD COLUMN IF NOT EXISTS plate_done boolean NOT NULL DEFAULT false`,
];

/**
 * The full DDL (tables + migrations) as one string, for reference.
 */
export const CREATE_TABLES_SQL = [...CREATE_TABLES].join(";\n") + ";\n";
