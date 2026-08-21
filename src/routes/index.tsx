import { createFileRoute, Link } from "@tanstack/react-router";
import { FEDWordmark } from "~/components/brand";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

/**
 * FED landing / quiz-landing. Sells "feeling understood", not stats — warm,
 * hopeful copy on the new warm-cream brand. Uses the designer's sunrise hero
 * (fed-hero.png) behind the headline, the inline-SVG wordmark, and keeps the
 * medical-disclaimer footer on this public page.
 */
function IndexPage() {
  return (
    <div className="min-h-dvh bg-cream">
      <main className="mx-auto max-w-3xl px-6">
        <nav className="flex items-center justify-between py-6">
          <FEDWordmark size={34} withSun />
          <span className="pill">For 40+ bodies &amp; brains</span>
        </nav>

        {/* Hero — sunrise image behind the headline (negative space top-center). */}
        <section className="relative -mx-6 overflow-hidden rounded-b-3xl">
          <img
            src="/static/fed-hero.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
          />
          <div className="relative z-10 px-8 pb-16 pt-16 text-center sm:pt-24">
            <p className="mx-auto mb-4 w-fit text-sm font-bold uppercase tracking-[0.25em] text-terracotta">
              Fasting · Exercise · Diet
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-6xl">
              Are you <span className="text-warm">FED up</span>?
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-ink">
              Exhausted. Burning out. Already tried every diet and fast that
              promised a fix. It’s not a willpower problem — it’s a plan problem.
              Take the 2-minute quiz and get a FED plan that finally fits{" "}
              <em>you</em>.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/quiz" className="btn-primary">
                Take the FED quiz
              </Link>
              <span className="text-sm font-medium text-ink-soft">~2 minutes · no stats</span>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-3">
          {[
            { k: "F", t: "Fasting", d: "Time your meals around your energy, not the other way round." },
            { k: "E", t: "Exercise", d: "Movement that calms an over-stressed system, not one more grind." },
            { k: "D", t: "Diet", d: "Food that fuels a 40+ metabolism — no forbidden-lists, no guilt." },
          ].map((p) => (
            <div key={p.k} className="card text-left">
              <div className="pillar-chip mb-3 flex h-11 w-11 items-center justify-center rounded-full text-lg">
                {p.k}
              </div>
              <h3 className="font-display text-lg font-bold">{p.t}</h3>
              <p className="mt-1 text-sm text-ink-soft">{p.d}</p>
            </div>
          ))}
        </section>

        <section className="card mt-10 text-center">
          <h2 className="font-display text-2xl font-extrabold">
            You’re not broken. <span className="text-warm">Your body’s just been burning energy the wrong way.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">
            FED is how you get your energy back — one small, steady choice in each
            pillar until the whole system settles.
          </p>
          <div className="mt-6">
            <Link to="/quiz" className="btn-primary">
              Get FED
            </Link>
          </div>
        </section>
      </main>

      {/* Medical disclaimer footer — compliance requirement. */}
      <footer className="mt-16 border-t border-line px-6 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <FEDWordmark size={30} withSun className="mx-auto" />
          <p className="mt-6 text-xs leading-relaxed text-ink-soft">
            FED is a general wellness product, not medical advice. It does not
            diagnose, treat, or prevent any disease. Always consult your doctor
            or another qualified health provider before changing your diet,
            fasting, or exercise routine — especially if you have a medical
            condition, take medication, or are pregnant or nursing.
          </p>
          <p className="mt-4 text-xs text-muted">
            © {new Date().getFullYear()} FED
          </p>
        </div>
      </footer>
    </div>
  );
}
