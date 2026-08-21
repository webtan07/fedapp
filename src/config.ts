import { STRIPE_PAYWALL_URL } from "~/site";

/**
 * Central env-var access + validation for FED.
 *
 * Every integration reads its settings from this single `config` object rather
 * than touching `process.env` directly. Nothing here throws at import time —
 * the app must build and serve without a single env var set; use `requireEnv()`
 * at the point a feature actually needs its credentials.
 */
export interface AppConfig {
  /** Neon Postgres connection string (src/db/db.ts). */
  databaseUrl?: string;
  /** Public base URL of this app, used for absolute links / share URLs. */
  appBaseUrl: string;
  /** Port the dev/start server binds to (default 3101 — never 3000/3100). */
  port: number;
  /**
   * Stripe payment-link / checkout URL for the "Get FED" founding plan
   * ($19 one-time founding membership). Reads PAYWALL_URL from the env; when
   * unset it falls back to the real Stripe link (STRIPE_PAYWALL_URL in
   * src/site.ts) so the CTA always points at live checkout, in production and
   * local dev alike. Set PAYWALL_URL on the host to override/relink.
   */
  paywallUrl: string;
}
const str = (key: string) => {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
};
export const config: AppConfig = {
  databaseUrl: str("DATABASE_URL"),
  appBaseUrl: str("APP_BASE_URL") ?? "http://localhost:3101",
  port: Number(str("PORT") ?? "3101") || 3101,
  paywallUrl: str("PAYWALL_URL") ?? STRIPE_PAYWALL_URL,
};
const ENV_KEY_BY_CONFIG_KEY: Record<keyof AppConfig, string> = {
  databaseUrl: "DATABASE_URL",
  appBaseUrl: "APP_BASE_URL",
  port: "PORT",
  paywallUrl: "PAYWALL_URL",
};
/**
 * Throw a descriptive error listing every requested var that is unset.
 * Call it from a server function / startup path right before a feature needs
 * its credentials, e.g. `requireEnv("databaseUrl")` at the top of a query.
 */
export function requireEnv(...keys: (keyof AppConfig)[]): void {
  const missing = keys.filter(
    (k) => config[k] === undefined || config[k] === "",
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required env var(s): ${missing
        .map((k) => ENV_KEY_BY_CONFIG_KEY[k])
        .join(", ")}. See .env.example.`,
    );
  }
}
