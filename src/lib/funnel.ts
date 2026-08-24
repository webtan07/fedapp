import { trackEvent } from "~/routes/api/funnel";
import type { FunnelEventName } from "~/db/db";

/**
 * Fire-and-forget funnel instrumentation for the client.
 *
 * Calls the `trackEvent` server fn in the background and swallows any failure —
 * analytics must never block the user's flow or surface an error. This helper
 * intentionally sends no PII; email-bearing events are emitted server-side from
 * the trusted handlers that verified the user.
 */
export function fireFunnelEvent(
  event: FunnelEventName,
  userId?: number,
  source?: string,
): void {
  trackEvent({ data: { event, userId, source } }).catch(() => {
    /* analytics are best-effort — never log, never block */
  });
}
