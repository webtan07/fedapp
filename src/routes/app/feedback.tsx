import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "~/components/app-shell";
import { SunBadge } from "~/components/brand";
import { getFeedbackContext, submitFeedback } from "~/routes/api/app";
import type { FeedbackContext } from "~/routes/api/app";

export const Route = createFileRoute("/app/feedback")({
  component: FeedbackScreen,
});

function userId(): number | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem("fed_userId");
  return v ? Number(v) : null;
}

function FeedbackScreen() {
  const [ctx, setCtx] = useState<FeedbackContext | null>(null);
  const [whatWorked, setWhatWorked] = useState("");
  const [whatToChange, setWhatToChange] = useState("");
  const [rating, setRating] = useState(0); // 0 = not chosen (no pressure)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    const uid = userId();
    if (!uid) {
      setCtx({ isTester: false, email: null, profile: null });
      return;
    }
    try {
      setCtx(await getFeedbackContext({ data: uid }));
    } catch {
      setCtx({ isTester: false, email: null, profile: null });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const uid = userId();
    if (!uid) return;
    setBusy(true);
    setError(null);
    try {
      await submitFeedback({
        data: { userId: uid, whatWorked, whatToChange, rating: rating || null },
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t send that just now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────
  if (sent) {
    return (
      <AppShell active="Feedback">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-4 w-fit">
            <SunBadge size={72} />
          </div>
          <h1 className="text-3xl font-extrabold">Thank you — read loud and clear</h1>
          <p className="mt-3 text-ink-soft">
            Your note is on its way to the FED team (tagged with your profile so we can read it in
            context). Every honest word helps shape what FED becomes.
          </p>
          <button onClick={() => setSent(false)} className="btn-secondary mt-6">
            Send another note
          </button>
        </div>
      </AppShell>
    );
  }

  // ── Not a tester → friendly non-paywall notice (paying members never see the form) ──
  if (ctx && !ctx.isTester) {
    return (
      <AppShell active="Feedback">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-4 w-fit">
            <SunBadge size={64} />
          </div>
          <h1 className="text-3xl font-extrabold">This page is for our tester crew</h1>
          <p className="mt-3 text-ink-soft">
            The feedback note is a tester-only perk — it’s our way of learning from the people who
            helped us shape FED before launch. If that’s you and you got here by mistake, re-enter
            your tester code to unlock.
          </p>
        </div>
      </AppShell>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!ctx) {
    return (
      <AppShell active="Feedback">
        <div className="mx-auto max-w-lg text-center text-ink-soft">Loading…</div>
      </AppShell>
    );
  }

  // ── Tester form ──────────────────────────────────────────────────────────
  return (
    <AppShell active="Feedback">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <div className="mx-auto mb-4 w-fit">
            <SunBadge size={64} />
          </div>
          <h1 className="text-3xl font-extrabold">So — how’s it going?</h1>
          <p className="mt-2 text-ink-soft">
            You’re one of the first people to try FED. Tell us what’s working and what isn’t — no
            wrong answers, no pressure. Just your honest read.
          </p>
        </div>

        {/* Auto-tag context — shown so the tester knows it travels with the note. */}
        <div className="card mt-6 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Sent as</p>
          {ctx.email && <p className="mt-1 text-ink">{ctx.email}</p>}
          <p className="mt-1 text-ink-soft">
            {ctx.profile
              ? `FED profile: ${ctx.profile.name} · score ${ctx.profile.fedScore}/24 · ${ctx.profile.intensity}`
              : "FED profile: not saved yet — your note still counts."}
          </p>
        </div>

        <div className="card mt-6 text-left">
          <label className="block font-semibold">
            What worked?
            <span className="ml-1 text-xs font-normal text-muted">A line or two is plenty.</span>
          </label>
          <textarea
            value={whatWorked}
            onChange={(e) => setWhatWorked(e.target.value)}
            rows={4}
            placeholder="e.g. the gentle fasting window actually took the pressure off…"
            className="mt-2 w-full resize-y rounded-lg border border-line bg-paper px-4 py-3 text-ink placeholder-muted outline-none focus:border-peach"
          />

          <label className="mt-6 block font-semibold">
            What didn’t / what would you change?
            <span className="ml-1 text-xs font-normal text-muted">Be as specific as you like.</span>
          </label>
          <textarea
            value={whatToChange}
            onChange={(e) => setWhatToChange(e.target.value)}
            rows={4}
            placeholder="e.g. I’d love a reminder in the afternoons…"
            className="mt-2 w-full resize-y rounded-lg border border-line bg-paper px-4 py-3 text-ink placeholder-muted outline-none focus:border-peach"
          />

          {/* Low-pressure 1-5 star rating — optional, never required. */}
          <p className="mt-6 font-semibold">
            Overall feeling <span className="ml-1 text-xs font-normal text-muted">(optional)</span>
          </p>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating((r) => (r === n ? 0 : n))}
                className={
                  "text-3xl leading-none transition " +
                  (rating >= n ? "text-amber" : "text-line hover:text-amber/50")
                }
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-xs text-muted">
              {rating === 0 ? "tap to rate" : `${rating}/5`}
            </span>
          </div>

          {error && <p className="mt-4 text-sm text-terracotta">{error}</p>}

          <button
            onClick={submit}
            disabled={busy || (whatWorked.trim() === "" && whatToChange.trim() === "")}
            className="btn-primary mt-6 w-full"
          >
            {busy ? "Sending…" : "Send feedback"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Thanks for helping shape FED — really.
        </p>
      </div>
    </AppShell>
  );
}
