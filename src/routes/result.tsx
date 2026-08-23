import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import type { Intensity, Pillar, Profile } from "~/db/schema";
import {
  captureEmail,
  getProfileData,
  markRevealed,
} from "~/routes/api/result";
import { unlockWithTesterCode } from "~/routes/api/app";
import { DynamicShareCard } from "~/components/share-card";
import { toPng } from "html-to-image";
import { FEDWordmark } from "~/components/brand";
import { DisclaimerNote, LegalFooter } from "~/components/footer";

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
  const navigate = useNavigate();
  const hasResult = search.total !== undefined && search.profile !== undefined;
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  // Discount-code (tester) flow on the paywall. The shared code is loaded from
  // the server with the rest of the profile config; a valid code flips the CTA
  // to a free "get FED" unlock. Email is prefilled from the capture gate so the
  // tester's account is set up — they can edit it if they paid/registered with
  // a different one.
  const [testerCode, setTesterCode] = useState("");
  const [testerOpen, setTesterOpen] = useState(false);
  const [testerCodeInput, setTesterCodeInput] = useState("");
  const [testerEmail, setTesterEmail] = useState<string>(() => emailInSession() ?? "");
  const [testerCodeValid, setTesterCodeValid] = useState(false);
  const [testerState, setTesterState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [testerError, setTesterError] = useState<string | null>(null);
  const [testerBusy, setTesterBusy] = useState(false);

  // Case-insensitive + trimmed — must match unlockWithTesterCode exactly.
  const isCodeValid = (v: string) =>
    !!testerCode && v.trim().toLowerCase() === testerCode.trim().toLowerCase();

  const onTesterUnlock = async () => {
    setTesterError(null);
    const code = testerCodeInput.trim();
    // Only block on a truly empty field (helpful prompt). Anything non-empty is
    // handed to the SERVER for validation — the server is the source of truth
    // (config.testerCode from the env) and produces the accurate error message.
    // This is the fix for the correct code (FEDTEST) being rejected on the
    // client: previously this returned early when `testerCode` state was empty
    // (e.g. getProfileData had failed/slow), so the code never reached the server.
    if (!code) {
      setTesterError("Enter your tester code to unlock FED for free.");
      return;
    }
    // Email is optional-ish: fall back to the capture-gate email if the field
    // is blank so we can still set up their account.
    const sessionEmail = emailInSession();
    const tEmail =
      testerEmail.trim().toLowerCase() || (sessionEmail ?? "").toLowerCase();
    if (!tEmail || !/^\S+@\S+\.\S+$/.test(tEmail)) {
      setTesterError("Enter an email so we can set up your tester account.");
      return;
    }
    setTesterBusy(true);
    setTesterState("busy");
    try {
      const res = await unlockWithTesterCode({ data: { code, email: tEmail } });
      try {
        sessionStorage.setItem(EMAIL_KEY, res.email);
        sessionStorage.setItem(USER_ID_KEY, String(res.userId));
      } catch {
        /* storage unavailable — ignore */
      }
      setTesterState("done");
      // Route straight into the now-unlocked app (same journey as a payer).
      navigate({ to: "/app" });
    } catch (e) {
      setTesterError(
        e instanceof Error
          ? e.message
          : "We couldn’t apply your code just now. Please try again.",
      );
      setTesterState("error");
    } finally {
      setTesterBusy(false);
    }
  };

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
  // Tracks a transient profile-load failure so we can retry (and surface a
  // gentle notice if it ultimately fails). Harden only — validation of the
  // tester code no longer depends on this load succeeding (server-authoritative).
  const [profileError, setProfileError] = useState(false);
  const profileRetryRef = useRef(0);

  useEffect(() => {
    if (!search.profile) return;
    let active = true;
    const load = () => {
      getProfileData({ data: search.profile })
        .then((r) => {
          if (!active) return;
          setProfile(r.profile);
          setPaywallUrl(r.paywallUrl);
          setPriceLabel(r.priceLabel);
          setTesterCode(r.testerCode ?? "");
          setProfileError(false);
          profileRetryRef.current = 0;
        })
        .catch(() => {
          if (!active) return;
          // One automatic retry for transient failures (DB warm-up / cold call),
          // then surface a gentle notice instead of silently leaving state empty.
          if (profileRetryRef.current < 1) {
            profileRetryRef.current += 1;
            load();
          } else {
            setProfileError(true);
          }
        });
    };
    load();
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

  // Capture the DOM card to a shareable PNG and trigger a download.
  const shareCard = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `fed-profile-${(search.profile ?? "share").toLowerCase()}.png`;
      a.click();
    } catch {
      /* fall to nothing — card is still visible on screen to screenshot */
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream">
      <main className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
        <nav className="mb-8 flex items-center justify-between">
          <FEDWordmark withSun size={32} />
          <span className="text-sm text-ink-soft">~2 minutes · no stats</span>
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
            {/* Shareable profile card — rendered real user data, captured to PNG. */}
            <div id="fed-share-card-slot" className="mx-auto mb-12 w-fit">
              <DynamicShareCard
                ref={cardRef}
                data={{
                  profileName: meta.name,
                  total,
                  intensity: search.intensity ?? "mid",
                  oneLiner: meta.oneLiner || "Your energy is on its way back.",
                }}
              />
              <button onClick={shareCard} disabled={sharing} className="btn-primary mt-4 w-full">
                {sharing ? "Preparing…" : "Share my result"}
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                Download an image of your FED profile to share on social or with a friend.
              </p>
            </div>

            <p className="text-center text-sm uppercase tracking-[0.2em] text-muted">
              Your FED read
            </p>

            {/* ── Score reveal ── */}
            <div className="mt-2 text-center">
              <div className="font-display text-8xl font-extrabold text-terracotta sm:text-9xl">
                {total}
                <span className="text-3xl text-ink-soft">/24</span>
              </div>
              <p className="mt-3 text-sm uppercase tracking-[0.2em] text-peach">
                {search.intensity} intensity
              </p>
              <DisclaimerNote className="mt-4" />
            </div>

            {/* ── Profile ── */}
            <div className="card mx-auto mt-10 text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Your profile</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold">{meta.name}</h2>
              {meta.oneLiner && (
                <p className="mt-1 text-lg font-medium text-peach">“{meta.oneLiner}”</p>
              )}
              {meta.description && <p className="mt-3 text-ink-soft">{meta.description}</p>}

              {/* ── F/E/D pillar breakdown bars ── */}
              <div className="mt-6 space-y-3">
                {PILLARS.map((p) => {
                  const raw = search[p.key] ?? 0;
                  const pct = Math.min(100, (raw / 8) * 100);
                  return (
                    <div key={p.key}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-ink-soft">
                          {p.sub} · {p.label}
                        </span>
                        <span className="text-muted">{raw}/8</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-paper-deep">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-peach to-amber transition-all"
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
              <h3 className="text-center font-display text-xl font-bold">
                Three first moves worth starting
              </h3>
              <p className="mt-1 text-center text-sm text-ink-soft">
                One for each pillar — a taste of your personalized FED plan.
              </p>
              <DisclaimerNote className="mt-3" />
              <div className="mt-6 space-y-3">
                {teasers.map((t) => (
                  <div key={t.pillar} className="card">
                    <div className="flex items-center gap-2">
                      <span className="pillar-chip">{t.pillar === "fasting" ? "F" : t.pillar === "exercise" ? "E" : "D"}</span>
                      <span className="text-sm font-semibold text-terracotta">{t.label}</span>
                    </div>
                    <p className="mt-2 text-ink-soft">{t.copy}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Get FED paywall CTA ── */}
            <section className="card mx-auto mt-12 max-w-lg text-center shadow-glow">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Get FED</p>
              <h3 className="mt-2 font-display text-2xl font-extrabold">
                Turn your FED result into your daily plan
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
                Fasting timer, daily move &amp; plate, and a simple energy tracker —
                in the plan that finally fits you.
              </p>

              {/* Primary path — real $19 Stripe founding checkout. */}
              <a
                href={paywallUrl || "#"}
                onClick={(e) => {
                  if (!paywallUrl) e.preventDefault();
                }}
                className="btn-primary mt-6 w-full"
              >
                Get FED — {priceLabel}
              </a>
              <p className="mt-4 text-xs text-muted">
                Cancel anytime. Founding members lock today’s rate for life.
              </p>

              {/* Gentle notice if the profile copy couldn't load — the plan CTA
                  and tester-code unlock still work (server-authoritative). */}
              {profileError && (
                <p className="mt-4 text-xs text-muted">
                  Some details couldn’t load just now — your plan and code still work.
                </p>
              )}

              {/* Discreet discount-code path for testers — turns the $19 into $0. */}
              {!testerOpen ? (
                <button
                  onClick={() => setTesterOpen(true)}
                  className="mt-4 text-sm font-medium text-peach underline decoration-dotted underline-offset-4 transition hover:text-warm"
                >
                  Have a code?
                </button>
              ) : (
                <div className="mt-5 rounded-2xl border border-line bg-paper-deep/50 p-4 text-left">
                  <p className="text-sm font-semibold text-ink">
                    Got a founding code? Apply it here.
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Enter your code and your unlock becomes free — no charge, which is
                    how this happens to all the first ones through.
                  </p>
                  <div className="mt-3 flex flex-col gap-3">
                    <input
                      type="text"
                      value={testerCodeInput}
                      onChange={(e) => {
                        setTesterCodeInput(e.target.value);
                        setTesterCodeValid(isCodeValid(e.target.value));
                        if (testerError) setTesterError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && onTesterUnlock()}
                      placeholder="Your code"
                      disabled={testerState === "busy" || testerState === "done"}
                      className="rounded-full border border-line bg-paper px-5 py-3 text-ink placeholder-muted outline-none focus:border-peach disabled:opacity-60"
                    />
                    <input
                      type="email"
                      value={testerEmail}
                      onChange={(e) => setTesterEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && onTesterUnlock()}
                      placeholder="you@example.com"
                      disabled={testerState === "busy" || testerState === "done"}
                      className="rounded-full border border-line bg-paper px-5 py-3 text-ink placeholder-muted outline-none focus:border-peach disabled:opacity-60"
                    />
                    {testerCodeValid && (
                      <p className="text-sm font-medium text-ink">
                        Code accepted — your price is now{" "}
                        <span className="font-bold text-warm">$0</span>.
                      </p>
                    )}
                    {testerError && <p className="text-sm text-terracotta">{testerError}</p>}
                    <button
                      onClick={onTesterUnlock}
                      disabled={testerBusy || testerState === "done"}
                      className={testerCodeValid ? "btn-primary w-full" : "btn-secondary w-full"}
                    >
                      {testerState === "busy"
                        ? "Unlocking…"
                        : testerCodeValid
                          ? "Get FED — $0 · founding tester"
                          : "Apply code"}
                    </button>
                    {testerState === "done" && (
                      <p className="text-sm text-ink">You’re in — opening your plan…</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <div className="mt-8 flex justify-center">
              <Link to="/" className="text-sm text-ink-soft hover:text-peach">
                ← Back home
              </Link>
            </div>
          </>
        )}
      </main>
      {/* Medical disclaimer footer + legal links — compliance requirement. */}
      <LegalFooter />
    </div>
  );
}

/** Shown when someone lands on /result without a completed quiz result. */
function NoResult() {
  return (
    <div className="text-center">
      <p className="mb-4 text-sm uppercase tracking-[0.2em] text-muted">Your FED read</p>
      <h1 className="font-display text-4xl font-extrabold">Your result is on its way</h1>
      <p className="mx-auto mt-6 max-w-lg text-ink-soft">
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
      <p className="mb-4 text-sm uppercase tracking-[0.2em] text-muted">Your FED read</p>
      <h1 className="font-display text-3xl font-extrabold leading-snug sm:text-4xl">
        Your score is ready —<br />we just need to know where to send it
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-ink-soft">
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
          className="rounded-full border border-line bg-paper px-5 py-3 text-ink placeholder-muted outline-none focus:border-peach"
        />
        {error && <p className="text-sm text-terracotta">{error}</p>}
        <button onClick={onSubmit} disabled={submitting} className="btn-primary w-full">
          {submitting ? "Saving…" : "Reveal my FED score"}
        </button>
      </div>
      <p className="mt-8 text-xs text-muted">
        We’ll keep it to the score, the plan, and the occasional honest note.
      </p>
    </div>
  );
}
