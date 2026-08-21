import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SunBadge } from "./brand";
import { DisclaimerNote, LegalFooter } from "./footer";

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
 */
export function Locked({ title, blurb }: { title: string; blurb?: string }) {
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
      <div className="mt-6">
        <Link to="/quiz" className="btn-primary">
          Get FED
        </Link>
      </div>
    </div>
  );
}
