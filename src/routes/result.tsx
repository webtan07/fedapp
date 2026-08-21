import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Intensity, Pillar, Profile } from "~/db/schema";
import {
  captureEmail,
  getProfileData,
  markRevealed,
} from "~/routes/api/result";

export const Route = createFileRoute("/result")({
  validateSearch: (search: Record<string, unknown>) => {
    // Accept the value whether TanStack hands us a string (raw URL) or a
    // number (client-side navigate). Returning undefined for a provided number
    // would make navigate() strip it from the URL. (tanstack-search-numeric-params)
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

// ── Session keys for "did this session already give us their email?" ──────
const EMAIL_KEY = "fed_email";
const USER_ID_KEY = "fed_userId";

const PILLARS: { key: "fp" | "ep" | "dp"; label: string; sub: string; pillar: Pillar }[] = [
  { key: "fp", label: "Fasting", sub: "F", pillar: "fasting" },
  { key: "ep", label: "Exercise", sub: "E", pillar: "exercise" },
  { key: "dp", label: "Diet", sub: "D", pillar: "diet" },
];

/**
 * First-move TEASERS — one per pillar, personalised to the profile. These are
 * teasers that sell the plan; the full moves live behind the paywall (the
 * /app screens). Copy is warm, never shaming, honest (no results promises).
 */
interface Teaser {
  pillar: Pillar;
  label: string; // the move's name
  copy: string; // the sell / teaser line
}
const TEASERS: Record<string, Teaser[]> = {
  "wired-and-tired": [
    { pillar: "fasting", label: "A gentle 12-hour window", copy: "Tomorrow: finish dinner by 8pm and hold until 8am. Just one — enough to feel what a steadier energy rhythm can do." },
    { pillar: "exercise", label: "A 10-minute walk", copy: "After your biggest meal, not before. It steadies the spike-and-crash instead of adding to it." },
    { pillar: "diet", label: "Swap the afternoon sugar", copy: "Meet the 3pm slump with protein — a few nuts, a boiled egg — instead of the quick hit that leaves you lower an hour later." },
  ],
  "cortisol-crash": [
    { pillar: "fasting", label: "A gentler eating window", copy: "Tomorrow, trade grazing for one steady window — start the day calm, not running on a stress spike." },
    { pillar: "exercise", label: "A 10-minute walk", copy: "Movement that calms, not grinds: after your biggest meal, out the door, nothing in your hands." },
    { pillar: "diet", label: "Protein on the first plate", copy: "Lead your first real meal of the day with protein — steadier fuel, fewer 11am crashes." },
  ],
  "slow-burn": [
    { pillar: "fasting", label: "Stop grazing after dinner", copy: "One gentle 12-hour window — let your system actually switch off for once and stop running on low-all-day." },
    { pillar: "exercise", label: "A 10-minute walk", copy: "The single lowest-effort way to wake the flame: after your biggest meal, no gear, no gym." },
    { pillar: "diet", label: "Protein first, once", copy: "One plate today led by protein, then greens. Small, compounds fast." },
  ],
  "completely-fed-up": [
    { pillar: "fasting", label: "A gentle 12-hour window", copy: "Tomorrow, just this one — a steady window. Reset starts with rest, not another overhaul." },
    { pillar: "exercise", label: "A 10-minute walk", copy: "After your biggest meal, nothing more and nothing less. Enough to move the needle." },
    { pillar: "diet", label: "Swap one afternoon sugar", copy: "One small, repeatable swap for protein. You don't fix everything today — you start." },
  ],
};

function emailInSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}
function userIdInSession(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(USER_ID_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function ResultPage() {
  const search = Route.useSearch();
  const hasResult = search.total !== undefined && search.profile !== undefined;

  // The funnel gate: don't reveal the score to someone who hasn't given us an
  // email this session. Initialised synchronously (so no gate-flash on a
  // returning user — the email was already stored by the quiz / a prior gate).
  const [isCaptured, setIsCaptured] = useState<boolean>(() => emailInSession() !== null);
  const [email, setEmail] = useState("");
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Profile copy + paywall config, loaded server-side once we have a slug.
  const [profile, setProfile] = useState<Profile | null>(null);
  const [paywallUrl, setPaywallUrl] = useState("");
  const [priceLabel, setPriceLabel] = useState("");

  useEffect(() => {
    if (!search.profile) return;
    let active = true;
    getProfileData({ data: search.profile })
      .then((r) => {
        if (active) {
          setProfile(r.profile);
          setPaywallUrl(r.paywallUrl);
          setPriceLabel(r.priceLabel);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [search.profile]);

  // When a known user sees the reveal, record the funnel step (fire-and-forget).
  useEffect(() => {
    if (isCaptured && hasResult) {
      const uid = userIdInSession();
      if (uid) markRevealed({ data: uid }).catch(() => {});
    }
  }, [isCaptured, hasResult]);

  const total = search.total ?? 0;
  const meta = profile ?? {
    name: search.profile ?? "Your FED profile",
    headline: "",
    oneLiner: "",
    description: "",
  } as unknown as Profile;
  const teasers = TEASERS[search.profile ?? ""] ?? TEASERS["completely-fed-up"];

  const handleCapture = async () => {
    setCaptureError(null);
    const value = email.trim().toLowerCase();
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) {
      setCaptureError("Please enter a valid email so we can reveal your result.");
      return;
    }
    setCapturing(true);
    try {
      const res = await captureEmail({ data: { email: value } });
      try {
        sessionStorage.setItem(EMAIL_KEY, res.email);
        sessionStorage.setItem(USER_ID_KEY, String(res.userId));
      } catch {
        /* ignore storage failures */
      }
      setIsCaptured(true);
      markRevealed({ data: res.userId }).catch(() => {});
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#191614]">
      <main className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
        <nav className="mb-8 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tight text-[#e8b86b]">
            FED
          </Link>
          <span className="text-sm text-[#9a8f82]">~2 minutes · no stats</span>
        </nav>

        {!hasResult ? (
          <NoResult />
        ) : !isCaptured ? (
          <EmailGate
            email={email}
            setEmail={setEmail}
            error={captureError}
            submitting={capturing}
            onSubmit={handleCapture}
          />
        ) : (
          <>
            {/* Shareable profile card visual slot — designer asset drops in here.
                Keep this element; it is the hook for the viral result-card image. */}
            <div
              id="fed-share-card-slot"
              className="fed-share-card-slot mx-auto mb-12 flex h-40 w-full max-w-md items-center justify-center rounded-2xl border border-dashed border-[#352d26] bg-[#221e1b] text-center text-xs text-[#6b6155]"
            >
              ✦ Shareable FED result card goes here ✦
            </div>

            <p className="text-center text-sm uppercase tracking-[0.2em] text-[#c99a4e]">
              Your FED diagnosis
            </p>

            {/* ── Score reveal ── */}
            <div className="mt-2 text-center">
              <div className="text-8xl font-extrabold text-warm sm:text-9xl">
                {total}
                <span className="text-3xl text-[#9a8f82]">/24</span>
              </div>
              <p className="mt-3 text-sm uppercase tracking-[0.2em] text-[#c99a4e]">
                {search.intensity} intensity
              </p>
            </div>

            {/* ── Profile ── */}
            <div className="card mx-auto mt-10 text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9a8f82]">
                Your profile
              </p>
              <h2 className="mt-2 text-3xl font-extrabold">{meta.name}</h2>
              {meta.oneLiner && (
                <p className="mt-1 text-lg font-medium text-[#e8b86b]">
                  “{meta.oneLiner}”
                </p>
              )}
              {meta.description && (
                <p className="mt-3 text-[#cfc4b4]">{meta.description}</p>
              )}

              {/* ── F/E/D pillar breakdown bars ── */}
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

            {/* ── Three first moves (teasers) ── */}
            <section className="mx-auto mt-12 max-w-lg">
              <h3 className="text-center text-xl font-bold">
                Three first moves worth starting
              </h3>
              <p className="mt-1 text-center text-sm text-[#9a8f82]">
                One for each pillar — a taste of your personalized FED plan.
              </p>
              <div className="mt-6 space-y-3">
                {teasers.map((t) => (
                  <div key={t.pillar} className="card">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8b86b] text-sm font-bold text-[#191614]">
                        {t.pillar === "fasting" ? "F" : t.pillar === "exercise" ? "E" : "D"}
                      </span>
                      <span className="text-sm font-semibold text-[#e8b86b]">
                        {t.label}
                      </span>
                    </div>
                    <p className="mt-2 text-[#cfc4b4]">{t.copy}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Get FED paywall CTA ── */}
            <section className="card mx-auto mt-12 max-w-lg text-center shadow-glow">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9a8f82]">
                Get FED
              </p>
              <h3 className="mt-2 text-2xl font-extrabold">
                Turn your diagnosis into your daily plan
              </h3>
              <p className="mt-3 text-[#cfc4b4]">
                The full FED app — your fasting timer, today’s move, today’s
                plate, and a simple tracker — built around <em>your</em> profile.
                Starting at{" "}
                <span className="font-semibold text-[#e8b86b]">{priceLabel || "$19–29/mo"}</span>.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {paywallUrl ? (
                  <a href={paywallUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
                    Get FED — founding membership
                  </a>
                ) : (
                  <a href="#paywall" className="btn-primary w-full">
                    Get FED — founding membership
                    <span className="ml-2 text-xs opacity-80">(its live link lands here soon)</span>
                  </a>
                )}
                <Link to="/app" className="btn-secondary w-full">
                  Unlock your plan in the app
                </Link>
              </div>
              <p className="mt-4 text-xs text-[#9a8f82]">
                General wellness — supportive, honest guidance. It is not
                medical advice and makes no weight-loss or health promises.
              </p>
            </section>

            <div className="mt-8 flex justify-center">
              <Link to="/" className="text-sm text-[#9a8f82] hover:text-[#e8b86b]">
                ← Back home
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

/** Shown when someone lands on /result without a completed quiz result. */
function NoResult() {
  return (
    <div className="text-center">
      <p className="mb-4 text-sm uppercase tracking-[0.2em] text-[#c99a4e]">
        Your FED diagnosis
      </p>
      <h1 className="text-4xl font-extrabold">Your result is on its way</h1>
      <p className="mx-auto mt-6 max-w-lg text-[#cfc4b4]">
        Take the 2-minute quiz and your FED score, profile, and first moves
        will be revealed here.
      </p>
      <div className="mt-10">
        <Link to="/quiz" className="btn-primary">
          Take the FED quiz
        </Link>
      </div>
    </div>
  );
}

/** Warm email-capture gate that guards the score reveal. */
function EmailGate({
  email,
  setEmail,
  error,
  submitting,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="text-center">
      <p className="mb-4 text-sm uppercase tracking-[0.2em] text-[#c99a4e]">
        Your FED diagnosis
      </p>
      <h1 className="text-3xl font-extrabold leading-snug sm:text-4xl">
        Your score is ready —<br />we just need to know where to send it
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-[#cfc4b4]">
        Enter your email and we’ll reveal your FED score, the profile that
        explains <em>why you feel this way</em>, and the first moves that are
        actually worth starting. No spam — ever.
      </p>
      <div className="mx-auto mt-8 flex max-w-sm flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="you@example.com"
          className="rounded-full border border-[#352d26] bg-[#191614] px-5 py-3 text-[#f5eee2] placeholder-[#6b6155] outline-none focus:border-[#e8b86b]"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={onSubmit} disabled={submitting} className="btn-primary w-full">
          {submitting ? "Saving…" : "Reveal my FED score"}
        </button>
      </div>
      <p className="mt-8 text-xs text-[#6b6155]">
        We’ll keep it to the score, the plan, and the occasional honest note.
      </p>
    </div>
  );
}
