import type { Intensity, Pillar } from "~/db/schema";
import { QUESTIONS } from "./questions";

/**
 * Pure FED quiz scoring — no I/O, fully unit-testable.
 *
 * Input: 12 answers keyed by question key (0 = No, 1 = Sometimes, 2 = Yes).
 * Output: per-pillar scores (0–8 each), a total FED score (0–24), the dominant
 * pillar, the intensity tier, and the resulting profile slug.
 *
 * The result page can run this same function on the same answers to re-render
 * the reveal without a second round-trip to the server.
 */
export interface QuizResult {
  /** Fasting pillar score (0–8). */
  fp: number;
  /** Exercise pillar score (0–8). */
  ep: number;
  /** Diet pillar score (0–8). */
  dp: number;
  /** Total FED score (0–24). */
  total: number;
  /** Dominant pillar (ties broken Fasting > Exercise > Diet). */
  dominantPillar: Pillar;
  /** Profile slug (one of the LOCKED seeded profile slugs). */
  profileSlug: string;
  /** Intensity tier derived from total: Low 0–8, Mid 9–16, High 17–24. */
  intensity: Intensity;
}

export type QuizAnswers = Record<string, number>;

/** Every pillar counts its 4 questions (0–8). */
function pillarScore(answers: QuizAnswers, pillar: Pillar): number {
  return QUESTIONS.reduce(
    (sum, q) => (q.pillar === pillar ? sum + (answers[q.key] ?? 0) : sum),
    0,
  );
}

/** Low 0–8, Mid 9–16, High 17–24. */
export function intensityFor(total: number): Intensity {
  if (total <= 8) return "low";
  if (total <= 16) return "mid";
  return "high";
}

/**
 * Dominant pillar = the max of the three pillars. On a tie, precedence is
 * Fasting > Exercise > Diet. Implemented with a strict `>` scan in that order,
 * so the first (highest-precedence) pillar wins any tie.
 */
export function dominantPillarFor(fp: number, ep: number, dp: number): Pillar {
  const candidates: [Pillar, number][] = [
    ["fasting", fp],
    ["exercise", ep],
    ["diet", dp],
  ];
  let best = candidates[0];
  for (const c of candidates) {
    if (c[1] > best[1]) best = c;
  }
  return best[0];
}

// ── Profile mapping (LOCKED by owner — do not change) ──
/** Dominant pillar → profile slug. */
export const DOMINANT_PROFILE: Record<Pillar, string> = {
  fasting: "cortisol-crash",
  exercise: "slow-burn",
  diet: "wired-and-tired",
};
/** Slug used when all three pillars are high. */
export const COMPLETELY_FED_UP = "completely-fed-up";

/**
 * Threshold for the "all pillars high" condition that triggers
 * `completely-fed-up`. An answer of 2 counts as fully symptomatic; ≥6 of 8
 * per pillar means the symptom picture is strong across every pillar. Because
 * each pillar is ≥6, total ≥18, which always lands in the High tier (17–24).
 */
export const ALL_HIGH_PER_PILLAR = 6;

/**
 * The one entry point the quiz -> result flow needs. Pure; safe to run
 * client-side (result reveal) or server-side (persistence).
 */
export function scoreQuiz(answers: QuizAnswers): QuizResult {
  const fp = pillarScore(answers, "fasting");
  const ep = pillarScore(answers, "exercise");
  const dp = pillarScore(answers, "diet");
  const total = fp + ep + dp;
  const intensity = intensityFor(total);
  const dominant = dominantPillarFor(fp, ep, dp);

  const allHigh = fp >= ALL_HIGH_PER_PILLAR && ep >= ALL_HIGH_PER_PILLAR && dp >= ALL_HIGH_PER_PILLAR;
  const profileSlug = allHigh ? COMPLETELY_FED_UP : DOMINANT_PROFILE[dominant];

  return {
    fp,
    ep,
    dp,
    total,
    dominantPillar: dominant,
    profileSlug,
    intensity,
  };
}
