import { createServerFn } from "@tanstack/react-start";
import { config, requireEnv } from "~/config";
import {
  ensureSchema,
  getOrCreateUser,
  getProfileBySlug,
  getResumeAttempt,
  hasActivePlan,
  markFunnelStep,
  trackFunnelEvent,
} from "~/db/db";
import type { Intensity, Profile } from "~/db/schema";

/**
 * Server functions backing the /result sales page.
 *
 * - `captureEmail` persists/verifies the user's email (get-or-create by email —
 *   never duplicates the user row already created by submitQuiz) and marks the
 *   funnel step so we can later measure email-capture rate.
 * - `getProfileData` loads the profile row (name, headline, one-liner,
 *   "why this sounds like you" description) from the DB by slug.
 */

export interface CaptureEmailInput {
  email: string;
  /** Optional quiz_attempts id so the capture can be attributed (ignored server-side today). */
  attemptId?: number;
}

export interface CaptureEmailResult {
  success: true;
  userId: number;
  email: string;
}

export const captureEmail = createServerFn()
  .validator((d: CaptureEmailInput) => {
    if (!d || typeof d.email !== "string" || !/^\S+@\S+\.\S+$/.test(d.email.trim())) {
      throw new Error("Please enter a valid email so we can save and reveal your result.");
    }
    return { email: d.email.trim().toLowerCase() };
  })
  .handler(async ({ data }): Promise<CaptureEmailResult> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    const user = await getOrCreateUser(data.email);
    await markFunnelStep(user.id, "email_captured");
    // Analytics event (best-effort — must never break the capture).
    try {
      await trackFunnelEvent({ event: "email_captured", userId: user.id, email: user.email });
    } catch (e) {
      console.error("[funnel] email_captured tracking failed:", e);
    }
    return { success: true, userId: user.id, email: user.email };
  });

export interface ProfileDataResult {
  profile: Profile | null;
  /** Stripe payment-link URL for the "Get FED" founding plan. */
  paywallUrl: string;
  /** Founding price framing shown on the paywall CTA. */
  priceLabel: string;
  /**
   * The current shared tester code (env TESTER_CODE, default FEDTEST), so the
   * result page can validate a code live and flip the paywall price to $0.
   * Not a secret — it is an openly-shared invitation code. Compared
   * case-insensitively/trimmed, same as the server (unlockWithTesterCode).
   */
  testerCode: string;
}

/** Load the profile row (copy + metadata) by its slug for the result reveal. */
export const getProfileData = createServerFn()
  .validator((slug: unknown) => (typeof slug === "string" ? slug : ""))
  .handler(async ({ data }): Promise<ProfileDataResult> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    const profile = data ? await getProfileBySlug(data) : null;
    return {
      profile,
      paywallUrl: config.paywallUrl,
      // Founding membership is a one-time $19 offer (owner-chosen model).
      priceLabel: "$19 founding · one-time",
      // Shared tester code (env TESTER_CODE, default FEDTEST) for live validation.
      testerCode: config.testerCode,
    };
  });

/** Optionally advance the funnel when a score is revealed to a user we know. */
export const markRevealed = createServerFn()
  .validator((userId: unknown) => (typeof userId === "number" ? userId : 0))
  .handler(async ({ data }) => {
    if (data) {
      requireEnv("databaseUrl");
      await markFunnelStep(data, "score_revealed");
      // Analytics event (best-effort — must never break the reveal).
      try {
        await trackFunnelEvent({ event: "score_revealed", userId: data });
      } catch (e) {
        console.error("[funnel] score_revealed tracking failed:", e);
      }
    }
    return { success: true };
  });

export interface ResolveResumeResult {
  success: boolean;
  /** Verified owner of the token's attempt. Null when the token is unknown. */
  userId: number | null;
  /** The user's quiz email (so the client can persist identity). */
  email: string | null;
  /** Whether that user holds an active plan (routes them to /app vs /result). */
  hasPlan: boolean;
  /** The attempt's reveal data (renders the result without a re-quiz). */
  attempt: {
    profileSlug: string;
    total: number;
    intensity: Intensity;
    fp: number;
    ep: number;
    dp: number;
  } | null;
}
/**
 * Resolve an emailed resume token → the attempt's owner + reveal data, so
 * clicking "See your FED plan" takes a returning user straight to their result
 * (or, if they already hold an active plan, to /app) without a re-quiz.
 *
 * SECURITY: the token is a unique 256-bit value minted at quiz-submit time and
 * stored on the quiz_attempts row. The lookup joins attempt→user and returns
 * only that single attempt's own data, so a valid token can never expose
 * another user's data. Invalid/unknown tokens simply resolve to success:false.
 */
export const resolveResume = createServerFn()
  .validator((t: unknown) => (typeof t === "string" ? t.trim() : ""))
  .handler(async ({ data }): Promise<ResolveResumeResult> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    if (!data) {
      return { success: false, userId: null, email: null, hasPlan: false, attempt: null };
    }
    const attempt = await getResumeAttempt(data);
    if (!attempt) {
      return { success: false, userId: null, email: null, hasPlan: false, attempt: null };
    }
    const hasPlan = await hasActivePlan(attempt.userId);
    return {
      success: true,
      userId: attempt.userId,
      email: attempt.email,
      hasPlan,
      attempt: {
        profileSlug: attempt.profileSlug,
        total: attempt.total,
        intensity: attempt.intensity as Intensity,
        fp: attempt.fp,
        ep: attempt.ep,
        dp: attempt.dp,
      },
    };
  });
