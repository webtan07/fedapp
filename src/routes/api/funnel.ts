import { createServerFn } from "@tanstack/react-start";
import { requireEnv } from "~/config";
import {
  ensureSchema,
  getFunnelEventCounts,
  trackFunnelEvent,
  type FunnelEventName,
} from "~/db/db";

/**
 * Funnel analytics server functions (backing the lightweight funnel tracking).
 *
 * - `trackEvent` appends one row to `fed.funnel_events`. Called fire-and-forget
 *   from the client at anonymous steps (quiz_started, checkout_clicked) — the
 *   client wraps every call in `.catch(() => {})` so a failure is silently
 *   dropped and never blocks or errors the user's flow.
 *
 *   IMPORTANT — by design this public endpoint accepts ONLY `event`, `userId`
 *   and `source`. It does NOT accept `email`/`profile`: email-bearing events
 *   (email_captured, tester_unlocked) are emitted server-side from the trusted
 *   handlers that verified the user (submitQuiz, captureEmail,
 *   unlockWithTesterCode) so a stray client call can never write PII.
 *
 * - `getFunnelStats` returns aggregated per-event COUNTS (no PII rows) for the
 *   tiny /admin/funnel read view.
 */
export interface TrackEventInput {
  event: string;
  userId?: number;
  source?: string;
}
export const trackEvent = createServerFn()
  .validator((d: TrackEventInput) => {
    if (!d || typeof d.event !== "string" || d.event.trim() === "") {
      throw new Error("event is required");
    }
    return {
      event: d.event.trim(),
      userId: typeof d.userId === "number" && Number.isFinite(d.userId) ? d.userId : undefined,
      source:
        typeof d.source === "string" && d.source.trim() !== "" ? d.source.trim().slice(0, 64) : undefined,
    };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    requireEnv("databaseUrl");
    await ensureSchema();
    await trackFunnelEvent({ event: data.event as FunnelEventName, userId: data.userId, source: data.source });
    return { ok: true };
  });

/** Aggregated per-event funnel counts for the admin read view (counts only). */
export const getFunnelStats = createServerFn().handler(async () => {
  requireEnv("databaseUrl");
  await ensureSchema();
  return { counts: await getFunnelEventCounts() };
});
