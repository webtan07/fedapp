import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { ensureSchema, getOrCreateUser, getProfileBySlug, sql, trackFunnelEvent } from "~/db/db";
import { requireEnv } from "~/config";
import { QUESTIONS } from "~/quiz/questions";
import { scoreQuiz, type QuizAnswers, type QuizResult } from "~/quiz/scoring";
import { intensityLabel, sendQuizResultEmail } from "~/email";

export interface SubmitQuizInput {
  /** Captured before the score reveal so we can create/return the user. */
  email: string;
  /** 12 answers keyed by question key (0 / 1 / 2). */
  answers: QuizAnswers;
}

export interface SubmitQuizResult {
  success: true;
  attemptId: number;
  userId: number;
  result: QuizResult;
}

/**
 * Persist a completed quiz attempt: create-or-return the user by email, insert
 * a quiz_attempts row (with fed_score, per-pillar scores, dominant pillar,
 * profile slug, intensity) and 12 quiz_answers rows, then return the computed
 * result so the client can navigate to /result.
 *
 * The scoring module is shared between this handler and the result page, so the
 * persisted fields and the reveal always agree.
 */
export const submitQuiz = createServerFn()
  .validator((d: SubmitQuizInput) => {
    if (!d || typeof d.email !== "string" || d.email.trim() === "") {
      throw new Error("An email is required to save your result.");
    }
    if (!d.answers || typeof d.answers !== "object") {
      throw new Error("Quiz answers are missing.");
    }
    return { email: d.email.trim().toLowerCase(), answers: d.answers };
  })
  .handler(async ({ data }): Promise<SubmitQuizResult> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    const db = sql();
    const result = scoreQuiz(data.answers);

    const user = await getOrCreateUser(data.email);
    const scores = JSON.stringify({
      fasting: result.fp,
      exercise: result.ep,
      diet: result.dp,
    });

    // Unguessable per-attempt token (256-bit) so the "See your FED plan" email can
    // send the user straight back to their result/plan without a re-quiz, verified
    // server-side on click (see resolveResume). Maps to exactly one attempt.
    const resumeToken = randomBytes(32).toString("hex");

    const attempt = await db`
      INSERT INTO fed.quiz_attempts
        (user_id, answers, fed_score, scores, dominant_pillar, profile, intensity, resume_token)
      VALUES
        (${user.id}, ${JSON.stringify(data.answers)}::jsonb, ${result.total},
         ${scores}::jsonb, ${result.dominantPillar}, ${result.profileSlug}, ${result.intensity},
         ${resumeToken})
      RETURNING id
    `;
    const attemptId = attempt[0].id as number;

    for (const q of QUESTIONS) {
      await db`
        INSERT INTO fed.quiz_answers (attempt_id, question_key, answer)
        VALUES (${attemptId}, ${q.key}, ${data.answers[q.key] ?? 0})
      `;
    }
    // Funnel analytics: the quiz is now complete server-side and, because the
    // final quiz step IS the email gate, the user's email has been captured in
    // the same submission. Record email_captured (with email + profile) —
    // best-effort; a failure must never break quiz submission.
    try {
      await trackFunnelEvent({
        event: "email_captured",
        userId: user.id,
        email: user.email,
        profile: result.profileSlug,
      });
    } catch (e) {
      console.error("[funnel] email_captured tracking failed:", e);
    }

    // Send the "here's your result" email AFTER the attempt is persisted.
    //
    // This is AWAITED (not fire-and-forgotten) on purpose: in a serverless
    // lambda the only thing that keeps the runtime alive is the in-flight
    // request, so a non-awaited `void (async () => {})()` can be reaped the
    // moment the response returns — the email silently never sends and no log
    // line ever fires (root cause of the missing-emails bug this fixes). The
    // send is bounded by a hard 15s timeout (every SMTP step capped at 10s) so
    // the worst case adds ~15s of latency; a failure is caught below and can
    // NEVER break or delay quiz submission — the quiz result is always
    // returned. We only ever send to the email the user just explicitly submitted.
    try {
      const profile = (await getProfileBySlug(result.profileSlug)) ?? null;
      await sendQuizResultEmail({
        to: user.email,
        score: result.total,
        profileName: profile?.name ?? result.profileSlug,
        intensityLabel: intensityLabel(result.intensity),
        resumeToken,
        pillars: {
          fasting: result.fp,
          exercise: result.ep,
          diet: result.dp,
        },
      });
      console.log(`[email] FED result sent to ${user.email} (attempt ${attemptId})`);
      // Best-effort funnel visibility — a send success/failure must never
      // break quiz submission.
      try {
        await trackFunnelEvent({ event: "email_sent", userId: user.id });
      } catch (e) {
        console.error("[funnel] email_sent tracking failed:", e);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[email] FED result email FAILED for ${user.email} (attempt ${attemptId}): ${msg}`);
      try {
        await trackFunnelEvent({ event: "email_failed", userId: user.id });
      } catch (e2) {
        console.error("[funnel] email_failed tracking failed:", e2);
      }
    }

    return { success: true, attemptId, userId: user.id, result };
  });
