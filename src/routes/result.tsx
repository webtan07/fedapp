import { createFileRoute, Link } from "@tanstack/react-router";
import type { Intensity } from "~/db/schema";

export const Route = createFileRoute("/result")({
  validateSearch: (search: Record<string, unknown>) => {
    // Accept the value whether TanStack hands us a string (raw URL) or a
    // number (client-side navigate). Returning undefined for a provided number
    // would make navigate() strip it from the URL.
    const num = (v: unknown) =>
      typeof v === "string" && v !== ""
        ? Number(v)
        : typeof v === "number"
          ? v
          : undefined;
    return {
      total: num(search.total),
      intensity:
        typeof search.intensity === "string" ? (search.intensity as Intensity) : undefined,
      profile: typeof search.profile === "string" ? search.profile : undefined,
      fp: num(search.fp),
      ep: num(search.ep),
      dp: num(search.dp),
    };
  },
  component: ResultPage,
});

// Local display copy for the reveal. The full sales page (plan + email capture)
// is built next; this keeps /result reachable and renders the passed result.
const PROFILE_META: Record<string, { name: string; headline: string }> = {
  "wired-and-tired": {
    name: "Wired & Tired",
    headline: "Your energy is there — it's just arriving at the wrong time.",
  },
  "cortisol-crash": {
    name: "Cortisol Crash",
    headline: "Your body is running on stress, not fuel.",
  },
  "slow-burn": {
    name: "Slow Burn",
    headline: "No willpower problem — just a plan tuned wrong for you.",
  },
  "completely-fed-up": {
    name: "Completely FED Up",
    headline: "Time to hit reset on the whole system.",
  },
};

const PILLARS = [
  { key: "fp", label: "Fasting", sub: "F" },
  { key: "ep", label: "Exercise", sub: "E" },
  { key: "dp", label: "Diet", sub: "D" },
] as const;

function ResultPage() {
  const search = Route.useSearch();
  const hasResult = search.total !== undefined && search.profile !== undefined;
  const meta = search.profile ? PROFILE_META[search.profile] : undefined;
  const total = search.total ?? 0;

  return (
    <div className="min-h-dvh bg-[#191614]">
      <main className="mx-auto max-w-2xl px-6 py-16 text-center sm:py-24">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-[#c99a4e]">
          Your FED diagnosis
        </p>

        {!hasResult ? (
          <>
            <h1 className="text-4xl font-extrabold">Your result is on its way</h1>
            <p className="mx-auto mt-6 max-w-lg text-[#cfc4b4]">
              Take the 2-minute quiz and your FED score, profile, and first
              moves will be revealed here.
            </p>
            <div className="mt-10">
              <Link to="/quiz" className="btn-primary">
                Take the FED quiz
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-[#cfc4b4]">Your FED score</p>
            <div className="mt-4 text-7xl font-extrabold text-warm sm:text-8xl">
              {total}
              <span className="text-3xl text-[#9a8f82]">/24</span>
            </div>
            <p className="mt-3 text-sm uppercase tracking-[0.2em] text-[#c99a4e]">
              {search.intensity} intensity
            </p>

            <div className="card mx-auto mt-10 max-w-md text-left">
              <h2 className="text-2xl font-bold">{meta?.name ?? search.profile}</h2>
              <p className="mt-2 text-[#cfc4b4]">{meta?.headline}</p>

              <div className="mt-6 space-y-3">
                {PILLARS.map((p) => {
                  const raw = search[p.key] ?? 0;
                  const pct = Math.min(100, (raw / 8) * 100);
                  return (
                    <div key={p.key}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-[#cfc4b4]">
                          {p.sub} · {p.label}
                        </span>
                        <span className="text-[#9a8f82]">{raw}/8</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#352d26]">
                        <div
                          className="h-full rounded-full bg-[#e8b86b] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-lg text-[#cfc4b4]">
              Here’s the first move worth starting — plus your full personalized
              FED plan — coming right up.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/" className="btn-secondary">
                Back home
              </Link>
            </div>
          </>
        )}
      </main>

      {/* Medical disclaimer footer — compliance requirement. */}
      <footer className="border-t border-[#352d26] bg-[#191614] px-6 py-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs leading-relaxed text-[#9a8f82]">
            FED is a general wellness product, not medical advice. It does not
            diagnose, treat, or prevent any disease. Always consult your doctor
            or another qualified health provider before changing your diet,
            fasting, or exercise routine.
          </p>
        </div>
      </footer>
    </div>
  );
}
