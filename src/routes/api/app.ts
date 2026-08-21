import { createServerFn } from "@tanstack/react-start";
import { requireEnv } from "~/config";
import {
  endOpenFast,
  ensureSchema,
  getCheckin,
  hasActivePlan,
  listCheckins,
  listFasts,
  listMoves,
  listPlates,
  saveCheckin,
  startFast,
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
