import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { SunBadge } from "./brand";
import { DisclaimerNote, LegalFooter } from "./footer";
import { STRIPE_PAYWALL_URL } from "~/site";
import { unlockWithEmail } from "~/routes/api/app";

const PAGES = [
  { href: "/app", label: "My Plan" },
  { href: "/app/fasting", label: "Fasting" },
  { href: "/app/move", label: "Move" },
  { href: "/app/plate", label: "Plate" },
  { href: "/app/tracker", label: "Tracker" },
];

/** Shared shell for the paywalled 4-screen app (Fasting / Move / Plate / Tracker). */
export function AppShell({
  active,
  children,
}: {
  active?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-10 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <SunBadge size={26} />
            <span className="text-2xl font-extrabold tracking-tight text-warm">FED</span>
          </Link>
          <nav className="flex flex-wrap gap-1.5 text-sm">
            {PAGES.map((p) => (
              <Link
                key={p.href}
                to={p.href}
                className={
                  "rounded-full px-3 py-1.5 transition " +
                  (active === p.label
                    ? "bg-gradient-to-r from-peach to-amber font-semibold text-white shadow-glow"
                    : "text-ink-soft hover:bg-paper-deep")
                }
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      {/* Medical disclaimer + legal links footer (kept on the check-in app). */}
      <LegalFooter contained />
    </div>
  );
}

/**
 * Content shown inside the shell when the user has no active plan_access row.
 * Rendered by the four app screens when `plan` is false.
 *
 * Two paths out of the lock screen:
 *  1. "Get FED" — opens the real $19 Stripe founding checkout (STRIPE_PAYWALL_URL).
 *  2. Returning paid buyer — enters the email they paid with and the server
 *     grants plan_access (unlockWithEmail).
 *
 * NOTE (tester access): the shared tester code now lives on the /result paywall
 * ("Have a code?" → $0 unlock) so testers go through the real quiz → result →
 * Get FED funnel. The /app lock screen no longer offers the free-code card.
 */
export function Locked({ title, blurb }: { title: string; blurb?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Shared: persist the granted user + reload so the shell sees the new plan.
  const persistAndUnlock = (userId: number, grantedEmail: string) => {
    try {
      sessionStorage.setItem("fed_email", grantedEmail);
      sessionStorage.setItem("fed_userId", String(userId));
    } catch {
      /* storage unavailable — ignore */
    }
    setTimeout(() => window.location.reload(), 500);
  };

  const onUnlock = async () => {
    const value = email.trim().toLowerCase();
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) {
      setError("Enter the email you used at checkout to unlock your plan.");
      return;
    }
    setState("busy");
    setError(null);
    try {
      const res = await unlockWithEmail({ data: { email: value } });
      setState("done");
      persistAndUnlock(res.userId, res.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't unlock your plan just now. Please try again.");
      setState("error");
    }
  };

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-6 w-fit">
        <SunBadge size={84} />
      </div>
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-3 text-ink-soft">
        {blurb ??
          "This is where your daily plan lives once you're in. Upgrade to unlock your personalized FED plan."}
      </p>
      <DisclaimerNote className="mt-4" />

      {/* Prominent Get FED → real Stripe checkout ($19 founding, one-time). */}
      <div className="mt-6">
        <a
          href={STRIPE_PAYWALL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full"
        >
          Get FED — $19 founding · one-time
        </a>
        <p className="mt-2 text-xs text-muted">Founding members lock today’s rate for life.</p>
      </div>

      {/* Returning-buyer email handoff → grants plan_access. */}
      <div className="card mt-8 text-left">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Already bought FED?</p>
        <p className="mt-1 text-sm text-ink-soft">
          Enter the email you used at checkout to unlock your plan:
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && onUnlock()}
            placeholder="you@example.com"
            disabled={state === "busy"}
            className="rounded-full border border-line bg-paper px-5 py-3 text-ink placeholder-muted outline-none focus:border-peach disabled:opacity-60"
          />
          <button
            onClick={onUnlock}
            disabled={state === "busy"}
            className="btn-secondary w-full"
          >
            {state === "busy" ? "Unlocking…" : "Unlock my plan"}
          </button>
          {state === "done" && (
            <p className="text-sm text-ink">You’re in — reloading your plan…</p>
          )}
          {error && <p className="text-sm text-terracotta">{error}</p>}
        </div>
      </div>

      <p className="mt-6 text-xs text-muted">
        Need help? Email{" "}
        <a href="mailto:admin@webdigitalassistants.com" className="underline hover:text-peach">
          admin@webdigitalassistants.com
        </a>
        .
      </p>
    </div>
  );
}
