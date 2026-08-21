import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FEDWordmark } from "./brand";
import { LegalFooter } from "./footer";

/**
 * Shared chrome for the three legal pages (Disclaimer / Privacy / Terms).
 * Warm brand theme: cream bg, cocoa ink, peach accents, rounded display font.
 * `children` are the page's sections — use the exported heading/paragraph
 * helpers below so all three pages share the same reading rhythm.
 */
export function LegalLayout({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  /** ISO-ish date string shown as "Last updated". */
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-cream">
      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
        <nav className="mb-10 flex items-center justify-between gap-3">
          <Link to="/">
            <FEDWordmark size={34} withSun />
          </Link>
          <span className="text-sm text-ink-soft">wellness · not medicine</span>
        </nav>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-peach">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted">Last updated: {updated}</p>
        <div className="mt-8 space-y-4 text-ink-soft">{children}</div>
      </main>
      <LegalFooter wordmark />
    </div>
  );
}

/** Consistent section heading on legal pages. */
export function LegalH({ children }: { children: ReactNode }) {
  return (
    <h2 className="pt-6 font-display text-xl font-bold text-ink">{children}</h2>
  );
}

/** Consistent body paragraph on legal pages. */
export function LegalP({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed">{children}</p>;
}

/** Consistent bulleted list on legal pages. */
export function LegalUl({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((it, i) => (
        <li key={i} className="leading-relaxed">
          {it}
        </li>
      ))}
    </ul>
  );
}
