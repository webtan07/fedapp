import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const PAGES = [
  { href: "/app", label: "My Plan" },
  { href: "/app/fasting", label: "Fasting" },
  { href: "/app/move", label: "Move" },
  { href: "/app/plate", label: "Plate" },
  { href: "/app/tracker", label: "Tracker" },
];

/** Shared shell for the paywalled 4-screen app (Fasting / Move / Plate / Tracker). */
export function AppShell({ active, children }: { active?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#191614]">
      <header className="sticky top-0 z-10 border-b border-[#352d26] bg-[#191614]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold text-[#e8b86b]">
            FED
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm">
            {PAGES.map((p) => (
              <Link
                key={p.href}
                to={p.href}
                className={
                  "rounded-full px-3 py-1.5 transition " +
                  (active === p.label
                    ? "bg-[#e8b86b] font-semibold text-[#191614]"
                    : "text-[#cfc4b4] hover:bg-[#2a241f]")
                }
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}

export function Locked({ title }: { title: string }) {
  return (
    <AppShell active={title}>
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-[#9a8f82]">
          Your personalized plan lives here once you’re in. Upgrade to unlock
          your daily {title.toLowerCase()}.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-primary">
            Get FED
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
