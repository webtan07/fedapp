import { createServerFn } from "@tanstack/react-start";
import { ensureSchema, getOrCreateUser, getProfileBySlug, sql } from "~/db/db";
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

    const attempt = await db`
      INSERT INTO fed.quiz_attempts
        (user_id, answers, fed_score, scores, dominant_pillar, profile, intensity)
      VALUES
        (${user.id}, ${JSON.stringify(data.answers)}::jsonb, ${result.total},
         ${scores}::jsonb, ${result.dominantPillar}, ${result.profileSlug}, ${result.intensity})
      RETURNING id
    `;
    const attemptId = attempt[0].id as number;

    for (const q of QUESTIONS) {
      await db`
        INSERT INTO fed.quiz_answers (attempt_id, question_key, answer)
        VALUES (${attemptId}, ${q.key}, ${data.answers[q.key] ?? 0})
      `;
    }

    // Fire the "here's your result" email AFTER the attempt is persisted. It is
    // intentionally non-blocking (not awaited) so a slow/failing SMTP never
    // delays or breaks quiz submission or the UI — failures are caught+logged.
    // We only ever send to the email the user just explicitly submitted.
    void (async () => {
      try {
        const profile =
          (await getProfileBySlug(result.profileSlug)) ?? null;
        await sendQuizResultEmail({
          to: user.email,
          score: result.total,
          profileName: profile?.name ?? result.profileSlug,
          intensityLabel: intensityLabel(result.intensity),
          pillars: {
            fasting: result.fp,
            exercise: result.ep,
            diet: result.dp,
          },
        });
        console.log(`[email] FED result sent to ${user.email} (attempt ${attemptId})`);
      } catch (e) {
        console.error(`[email] FED result email FAILED for ${user.email}:`, e);
      }
    })();

    return { success: true, attemptId, userId: user.id, result };
  });
