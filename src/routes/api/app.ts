import { createServerFn } from "@tanstack/react-start";
import { config, requireEnv } from "~/config";
import {
  endOpenFast,
  ensureSchema,
  getCheckin,
  getLatestQuizAttempt,
  getOrCreateUser,
  getProfileBySlug,
  getUserById,
  grantPlanAccess,
  grantTesterAccess,
  hasActivePlan,
  insertFeedback,
  isTester,
  listCheckins,
  listFasts,
  listMoves,
  listPlates,
  saveCheckin,
  startFast,
  trackFunnelEvent,
  type CheckinRow,
  type FastingRow,
} from "~/db/db";
import type { Move, Plate } from "~/db/schema";

/**
 * Server functions backing the 4-screen paywalled app.
 *
 * Every screen first resolves `hasPlan` via plan_access; when false the client
 * renders <Locked/>. Timestamps for fasting are from the DB server (now()), so
 * streaks/elapsed time survive client refreshes and never trust a client clock.
 */

// ── Date helpers (server-local calendar dates, YYYY-MM-DD) ─────────────────
function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dayIndex(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}
function ensureUserId(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error("A valid user id is required.");
  return n;
}

/** Resolve the gate shared by all screens (plan_access). */
export const getAppAccess = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }) => {
    requireEnv("databaseUrl");
    await ensureSchema();
    return { hasPlan: await hasActivePlan(userId) };
  });

// ── Purchase activation (email handoff) ────────────────────────────────────
export interface UnlockInput {
  /** The email the buyer used at Stripe checkout. */
  email: string;
}
export interface UnlockResult {
  success: true;
  userId: number;
  email: string;
  hasPlan: true;
}
/**
 * v1 activation after a Stripe founding-purchase. Our managed one-time payment
 * link cannot deliver server-side webhooks (no Stripe secret), so there is no
 * automated checkout→unlock. Instead a returning buyer enters the email they
 * paid with and we grant plan_access for that email.
 *
 * HONESTY NOTE: this is an honor-system handoff for the $19 one-time product —
 * we cannot cryptographically verify that this exact email completed a Stripe
 * checkout, and any valid-looking address activates access. That is the lean
 * trade-off chosen for the founding launch; a real Stripe webhook / checkout
 * session id (once the owner's own Stripe keys exist) is the path to verified
 * automatic activation. The flow is documented in the deploy PR.
 */
export const unlockWithEmail = createServerFn()
  .validator((d: UnlockInput) => {
    if (!d || typeof d.email !== "string" || !/^\S+@\S+\.\S+$/.test(d.email.trim())) {
      throw new Error("Enter the email you used at checkout so we can unlock your plan.");
    }
    return { email: d.email.trim().toLowerCase() };
  })
  .handler(async ({ data }): Promise<UnlockResult> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    const user = await getOrCreateUser(data.email);
    await grantPlanAccess(user.id);
    return { success: true, userId: user.id, email: user.email, hasPlan: true };
  });

// ── Shared tester code (free unlock, no Stripe) ─────────────────────────────
export interface TesterUnlockInput {
  /** The shared tester code the owner hands out (env TESTER_CODE, default FEDTEST). */
  code: string;
  /** Email to create/find the tester's user account so they can hold plan_access. */
  email: string;
}
export interface TesterUnlockResult {
  success: true;
  userId: number;
  email: string;
  hasPlan: true;
}
/**
 * Free unlock for testers using the single shared code — no Stripe required.
 *
 * The code is env-backed (TESTER_CODE, default "FEDTEST") so the owner can
 * change it WITHOUT a redeploy. Comparison is case-insensitive and trimmed.
 * On a match we create/find the tester's user by email and grant a free
 * 'tester' plan_access row (grantTesterAccess), which unlocks /app exactly like
 * a paid grant but stays marked as 'tester' (users.plan stays 'free').
 */
export const unlockWithTesterCode = createServerFn()
  .validator((d: TesterUnlockInput) => {
    if (!d || typeof d.code !== "string" || d.code.trim() === "") {
      throw new Error("Enter your tester code to unlock FED for free.");
    }
    if (!d || typeof d.email !== "string" || !/^\S+@\S+\.\S+$/.test(d.email.trim())) {
      throw new Error("Enter an email to set up your tester account.");
    }
    return { code: d.code.trim(), email: d.email.trim().toLowerCase() };
  })
  .handler(async ({ data }): Promise<TesterUnlockResult> => {
    if (data.code.toLowerCase() !== config.testerCode.trim().toLowerCase()) {
      throw new Error("That tester code isn't recognized. Double-check it, or use Get FED to unlock.");
    }
    requireEnv("databaseUrl");
    await ensureSchema();
    const user = await getOrCreateUser(data.email);
    await grantTesterAccess(user.id);
    // Analytics event (best-effort — must never break the unlock).
    try {
      await trackFunnelEvent({ event: "tester_unlocked", userId: user.id, email: user.email });
    } catch (e) {
      console.error("[funnel] tester_unlocked tracking failed:", e);
    }
    return { success: true, userId: user.id, email: user.email, hasPlan: true };
  });

// ── Fasting Timer ──────────────────────────────────────────────────────────
export interface FastingState {
  hasPlan: boolean;
  /** Currently-open fast (server timestamp is the source of truth). */
  current: { id: number; startedAt: string; elapsedMs: number } | null;
  todayActive: boolean;
  yesterdayActive: boolean;
  streak: number;
  history: {
    id: number;
    startedAt: string;
    endedAt: string | null;
    minutes: number | null;
  }[];
}
export const getFastingState = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }): Promise<FastingState> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    const hasPlan = await hasActivePlan(userId);
    const buffer: FastingState = {
      hasPlan,
      current: null,
      todayActive: false,
      yesterdayActive: false,
      streak: 0,
      history: [],
    };
    if (!hasPlan) return buffer;

    const fasts = await listFasts(userId);
    const now = new Date();

    // Which calendar days did each fast span? (Start date → end date inclusive.)
    const activeDays = new Set<string>();
    for (const s of fasts) {
      const d0 = new Date(s.startedAt);
      const end = s.endedAt ? new Date(s.endedAt) : now;
      for (let t = new Date(d0); t <= end; t.setDate(t.getDate() + 1)) {
        activeDays.add(dateStr(t));
      }
    }
    const today = dateStr(now);
    const yesterday = dateStr(new Date(now.getTime() - 86400000));
    buffer.todayActive = activeDays.has(today);
    buffer.yesterdayActive = activeDays.has(yesterday);

    // Streak: consecutive days back from today (else from yesterday), no gaps.
    let streak = 0;
    const cursor = new Date(now);
    if (!activeDays.has(today)) cursor.setDate(cursor.getDate() - 1);
    while (activeDays.has(dateStr(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    buffer.streak = streak;

    // Open fast.
    const open = fasts.find((f) => !f.endedAt);
    if (open) {
      const startedAt = new Date(open.startedAt);
      buffer.current = {
        id: open.id,
        startedAt: startedAt.toISOString(),
        elapsedMs: now.getTime() - startedAt.getTime(),
      };
    }

    buffer.history = fasts.slice(0, 10).map((f: FastingRow) => {
      const d0 = new Date(f.startedAt);
      const d1 = f.endedAt ? new Date(f.endedAt) : now;
      return {
        id: f.id,
        startedAt: d0.toISOString(),
        endedAt: f.endedAt ? d1.toISOString() : null,
        minutes: f.endedAt ? Math.round((d1.getTime() - d0.getTime()) / 60000) : null,
      };
    });
    return buffer;
  });

export const startFastAction = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }) => {
    requireEnv("databaseUrl");
    await ensureSchema();
    if (!(await hasActivePlan(userId))) throw new Error("Upgrade to start a fast.");
    await startFast(userId);
    return { ok: true };
  });

export const endFastAction = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }) => {
    requireEnv("databaseUrl");
    await ensureSchema();
    if (!(await hasActivePlan(userId))) throw new Error("Upgrade to manage a fast.");
    await endOpenFast(userId);
    return { ok: true };
  });

// ── Today's Move ───────────────────────────────────────────────────────────
export interface TodayMoveState {
  hasPlan: boolean;
  today: string;
  move: Move | null;
  done: boolean;
}
export const getTodayMove = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }): Promise<TodayMoveState> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    const hasPlan = await hasActivePlan(userId);
    const state: TodayMoveState = { hasPlan, today: dateStr(new Date()), move: null, done: false };
    if (!hasPlan) return state;
    const moves = await listMoves();
    const move = moves.length ? moves[dayIndex(new Date()) % moves.length] : null;
    const row = await getCheckin(userId, state.today);
    return { ...state, move, done: row?.moveDone ?? false };
  });

export const markMoveDone = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }) => {
    requireEnv("databaseUrl");
    await ensureSchema();
    if (!(await hasActivePlan(userId))) throw new Error("Upgrade to complete a move.");
    await saveCheckin(userId, dateStr(new Date()), { moveDone: true });
    return { ok: true };
  });

// ── Today's Plate ──────────────────────────────────────────────────────────
export interface TodayPlateState {
  hasPlan: boolean;
  today: string;
  plate: Plate | null;
  done: boolean;
}
export const getTodayPlate = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }): Promise<TodayPlateState> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    const hasPlan = await hasActivePlan(userId);
    const state: TodayPlateState = { hasPlan, today: dateStr(new Date()), plate: null, done: false };
    if (!hasPlan) return state;
    const plates = await listPlates();
    const plate = plates.length ? plates[dayIndex(new Date()) % plates.length] : null;
    const row = await getCheckin(userId, state.today);
    return { ...state, plate, done: row?.plateDone ?? false };
  });

export const markPlateDone = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }) => {
    requireEnv("databaseUrl");
    await ensureSchema();
    if (!(await hasActivePlan(userId))) throw new Error("Upgrade to complete a plate.");
    await saveCheckin(userId, dateStr(new Date()), { plateDone: true });
    return { ok: true };
  });

// ── Tracker (4 sliders → checkins) + auto progress recap ───────────────────
export interface CheckinValue {
  energy: number | null;
  sleep: number | null;
  weight: number | null;
  waist: number | null;
}
export interface TrackerState {
  hasPlan: boolean;
  today: string;
  values: CheckinValue;
  /** Auto progress recap — present only after ≥14 days of check-ins. */
  recap: {
    days: number;
    avgEnergy: number;
    trendingUp: boolean;
    line: string;
  } | null;
  recent: CheckinRow[];
}
const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

export const getTracker = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }): Promise<TrackerState> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    const hasPlan = await hasActivePlan(userId);
    const today = dateStr(new Date());
    const empty: TrackerState = {
      hasPlan,
      today,
      values: { energy: null, sleep: null, weight: null, waist: null },
      recap: null,
      recent: [],
    };
    if (!hasPlan) return empty;

    const all = await listCheckins(userId);
    const row = all.find((c) => c.date === today) ?? null;
    const values: CheckinValue = {
      energy: row?.energy ?? null,
      sleep: row?.sleep ?? null,
      weight: row?.weight ?? null,
      waist: row?.waist ?? null,
    };

    // Auto recap — only once there's ~2 weeks of check-ins, body-neutral.
    const energyDays = all.filter((c) => c.energy !== null);
    let recap: TrackerState["recap"] = null;
    if (energyDays.length >= 14) {
      const first = energyDays.slice(0, Math.ceil(energyDays.length / 2)).map((c) => c.energy as number);
      const second = energyDays
        .slice(-Math.floor(energyDays.length / 2))
        .map((c) => c.energy as number);
      const firstAvg = avg(first);
      const secondAvg = avg(second);
      const trendingUp = secondAvg > firstAvg + 0.4;
      const avgEnergy = avg([...first, ...second]);
      recap = {
        days: energyDays.length,
        avgEnergy: Math.round(avgEnergy * 10) / 10,
        trendingUp,
        line: trendingUp
          ? "Your energy is trending up — you're getting your energy back. Keep showing up for yourself."
          : "A solid fortnight of check-ins. Energy returns on its own time — small wins are still wins.",
      };
    }

    return {
      hasPlan,
      today,
      values,
      recap,
      recent: all.slice(-14).reverse(),
    };
  });

export const saveTracker = createServerFn()
  .validator((d: { userId: unknown } & Record<string, unknown>) => {
    if (!d || typeof d !== "object") throw new Error("Missing tracker payload.");
    const num = (v: unknown, min: number, max: number) => {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) return null;
      return Math.min(max, Math.max(min, Math.round(n)));
    };
    return {
      userId: ensureUserId(d.userId),
      energy: num(d.energy, 0, 10),
      sleep: num(d.sleep, 0, 10),
      weight: num(d.weight, 0, 300),
      waist: num(d.waist, 0, 300),
    };
  })
  .handler(async ({ data }) => {
    requireEnv("databaseUrl");
    await ensureSchema();
    if (!(await hasActivePlan(data.userId))) throw new Error("Upgrade to use the tracker.");
    await saveCheckin(data.userId, dateStr(new Date()), {
      energy: data.energy,
      sleep: data.sleep,
      weight: data.weight,
      waist: data.waist,
    });
    return { ok: true };
  });

// ── Tester-only feedback ─────────────────────────────────────────────────
export interface TesterStatus {
  isTester: boolean;
}
/**
 * Lightweight tester check used by the app shell to decide whether to show the
 * "Send feedback" nav item. TESTER-ONLY: only a user who unlocked via the
 * shared tester code (plan_access.plan='tester') is a tester — paying buyers
 * (plan_access.plan='paid' / users.plan='paid') are NOT and never see this.
 */
export const getTesterStatus = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }): Promise<TesterStatus> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    return { isTester: await isTester(userId) };
  });

export interface FeedbackContext {
  isTester: boolean;
  /** Submitter's email (auto-tagged, shown back so the tester knows it's stored). */
  email: string | null;
  /** Latest FED profile + score context, auto-tagged (null if no quiz attempt). */
  profile: { slug: string; name: string; fedScore: number; intensity: string } | null;
}
/**
 * Context for the feedback page. Enforces the tester gate: the page body
 * (fields) is only meaningful when isTester is true. The submit handler
 * re-checks isTester server-side, so a non-tester can't submit even by crafting
 * a request directly.
 */
export const getFeedbackContext = createServerFn()
  .validator((v: unknown) => ensureUserId(v))
  .handler(async ({ data: userId }): Promise<FeedbackContext> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    const isT = await isTester(userId);
    if (!isT) return { isTester: false, email: null, profile: null };
    const user = await getUserById(userId);
    const attempt = await getLatestQuizAttempt(userId);
    let profile: FeedbackContext["profile"] = null;
    if (attempt) {
      const p = await getProfileBySlug(attempt.profile);
      profile = {
        slug: attempt.profile,
        name: p?.name ?? attempt.profile,
        fedScore: attempt.fedScore,
        intensity: attempt.intensity,
      };
    }
    return { isTester: true, email: user?.email ?? null, profile };
  });

export interface SubmitFeedbackInput {
  userId: number;
  /** "What worked?" free text. */
  whatWorked: string;
  /** "What didn't / what would you change?" free text. */
  whatToChange: string;
  /** Optional overall rating 1-5 (low-pressure, can be null). */
  rating: number | null;
}
export const submitFeedback = createServerFn()
  .validator((d: SubmitFeedbackInput) => {
    if (!d || typeof d !== "object") throw new Error("Missing feedback payload.");
    const uid = typeof d.userId === "number" ? d.userId : Number(d.userId);
    if (!Number.isFinite(uid) || uid <= 0) throw new Error("A valid user id is required.");
    const whatWorked = typeof d.whatWorked === "string" ? d.whatWorked.trim().slice(0, 5000) : "";
    const whatToChange = typeof d.whatToChange === "string" ? d.whatToChange.trim().slice(0, 5000) : "";
    if (whatWorked === "" && whatToChange === "") {
      throw new Error("Share a little — a line or two is plenty. We read every one.");
    }
    let rating: number | null = null;
    if (d.rating !== null && d.rating !== undefined && d.rating !== 0) {
      const n = typeof d.rating === "number" ? d.rating : Number(d.rating);
      if (Number.isFinite(n) && n >= 1) rating = Math.min(5, Math.max(1, Math.round(n)));
    }
    return { userId: uid, whatWorked, whatToChange, rating };
  })
  .handler(async ({ data }) => {
    requireEnv("databaseUrl");
    await ensureSchema();
    // STRICT gate: only testers can submit. Paying members get a clear no.
    if (!(await isTester(data.userId))) {
      throw new Error("Feedback is for our tester crew only. Thanks for understanding!");
    }
    const user = await getUserById(data.userId);
    if (!user) throw new Error("We couldn’t find your account — try re-unlocking with your code.");
    // Auto-tag with the tester's FED profile + score (server-fetched, not client).
    const attempt = await getLatestQuizAttempt(data.userId);
    let profileName: string | null = null;
    if (attempt) {
      const p = await getProfileBySlug(attempt.profile);
      profileName = p?.name ?? null;
    }
    await insertFeedback({
      userId: data.userId,
      email: user.email,
      whatWorked: data.whatWorked,
      whatToChange: data.whatToChange,
      rating: data.rating,
      profile: attempt?.profile ?? null,
      profileName,
      fedScore: attempt?.fedScore ?? null,
      intensity: attempt?.intensity ?? null,
    });
    return { success: true as const };
  });
