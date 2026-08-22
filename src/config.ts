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
  /**
   * Shared tester access code — lets testers unlock the paywalled app for free
   * without going through Stripe, so the owner can hand out one code. Read from
   * the TESTER_CODE env var (so it can be changed WITHOUT a redeploy); defaults
   * to "FEDTEST". Compared case-insensitively/trimmed at unlock time.
   */
  testerCode: string;
  /**
   * SMTP sender for transactional mail (the Gmail app-password SMTP the
   * business already uses from admin@webdigitalassistants.com — see the WDA
   * site's src/email.ts). EMAIL_USER / EMAIL_APP_PASSWORD are the Gmail auth;
   * SMTP_HOST/PORT/SECURE override the default Gmail SMTP when needed.
   */
  emailUser?: string;
  emailAppPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
}
const str = (key: string) => {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
};
const strBool = (key: string): boolean | undefined => {
  const v = str(key);
  if (v === undefined) return undefined;
  return v === "1" || v.toLowerCase() === "true";
};
export const config: AppConfig = {
  databaseUrl: str("DATABASE_URL"),
  appBaseUrl: str("APP_BASE_URL") ?? "http://localhost:3101",
  port: Number(str("PORT") ?? "3101") || 3101,
  paywallUrl: str("PAYWALL_URL") ?? STRIPE_PAYWALL_URL,
  testerCode: str("TESTER_CODE") ?? "FEDTEST",
  emailUser: str("EMAIL_USER"),
  emailAppPassword: str("EMAIL_APP_PASSWORD"),
  smtpHost: str("SMTP_HOST"),
  smtpPort: Number(str("SMTP_PORT") ?? "") || undefined,
  smtpSecure: strBool("SMTP_SECURE"),
};
const ENV_KEY_BY_CONFIG_KEY: Record<keyof AppConfig, string> = {
  databaseUrl: "DATABASE_URL",
  appBaseUrl: "APP_BASE_URL",
  port: "PORT",
  paywallUrl: "PAYWALL_URL",
  testerCode: "TESTER_CODE",
  emailUser: "EMAIL_USER",
  emailAppPassword: "EMAIL_APP_PASSWORD",
  smtpHost: "SMTP_HOST",
  smtpPort: "SMTP_PORT",
  smtpSecure: "SMTP_SECURE",
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
