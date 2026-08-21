import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

/**
 * FED landing / quiz-landing. Sells "feeling understood", not stats — warm,
 * calm copy. The quiz itself is built in a later task; this is the shell.
 */
function IndexPage() {
  return (
    <div className="min-h-dvh bg-[#191614]">
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <nav className="mb-16 flex items-center justify-between">
          <span className="text-2xl font-bold tracking-tight text-[#e8b86b]">
            FED
          </span>
          <span className="pill">For 40+ bodies &amp; brains</span>
        </nav>

        <section className="text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-[#c99a4e]">
            Fasting · Exercise · Diet
          </p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">
            Are you <span className="text-warm">FED up</span>?
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-[#cfc4b4]">
            Exhausted. Burning out. Already tried every diet and fast that
            promised a fix. This isn’t a willpower problem — it’s a plan
            problem. Take the 2-minute quiz and get a FED plan that finally
            fits <em>you</em>.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/quiz" className="btn-primary">
              Take the FED quiz
            </Link>
            <span className="text-sm text-[#9a8f82]">~2 minutes · no stats</span>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { k: "F", t: "Fasting", d: "Time your meals around your energy, not the other way round." },
            { k: "E", t: "Exercise", d: "Movement that calms an over-stressed system, not one more grind." },
            { k: "D", t: "Diet", d: "Food that fuels a 40+ metabolism — no forbidden-lists, no guilt." },
          ].map((p) => (
            <div key={p.k} className="card text-left">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#e8b86b] font-bold text-[#191614]">
                {p.k}
              </div>
              <h3 className="text-lg font-semibold">{p.t}</h3>
              <p className="mt-1 text-sm text-[#9a8f82]">{p.d}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Medical disclaimer footer — compliance requirement. */}
      <footer className="border-t border-[#352d26] bg-[#191614] px-6 py-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs leading-relaxed text-[#9a8f82]">
            FED is a general wellness product, not medical advice. It does not
            diagnose, treat, or prevent any disease. Always consult your doctor
            or another qualified health provider before changing your diet,
            fasting, or exercise routine — especially if you have a medical
            condition, take medication, or are pregnant or nursing.
          </p>
          <p className="mt-4 text-xs text-[#9a8f82]">
            © {new Date().getFullYear()} FED
          </p>
        </div>
      </footer>
    </div>
  );
}
