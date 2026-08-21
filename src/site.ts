/**
 * Client-safe public constants for FED (no process.env here — these are
 * shipped to the browser as-is and are safe to hardcode).
 *
 * Keep the two values in sync with the env-driven defaults in src/config.ts:
 *  - `STRIPE_PAYWALL_URL` is the fallback src/config.ts uses when PAYWALL_URL
 *    is unset, so local dev and the client UI always point at the real
 *    checkout even before env is configured.
 *  - `CONTACT_EMAIL` is the business's real, owned reachable inbox. FED runs
 *    under Web Digital Assistants, whose admin inbox (admin@webdigitalassistants.com)
 *    is the live contact path — do NOT invent a fed.app mailbox the owner does
 *    not own. Swap for a dedicated fed inbox if/when the owner creates one.
 */
export const STRIPE_PAYWALL_URL =
  "https://buy.stripe.com/9B6cN55uE6Ke7xrau82go00";

export const CONTACT_EMAIL = "admin@webdigitalassistants.com";
