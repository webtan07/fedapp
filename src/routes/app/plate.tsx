import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, Locked } from "~/components/app-shell";
import { SunBadge } from "~/components/brand";
import { getTodayPlate, markPlateDone, type TodayPlateState } from "~/routes/api/app";

export const Route = createFileRoute("/app/plate")({
  component: PlateScreen,
});

function userId(): number | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem("fed_userId");
  return v ? Number(v) : null;
}

export function PlateScreen() {
  const [state, setState] = useState<TodayPlateState | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const uid = userId();
    if (!uid) {
      setState((p) => p ?? { hasPlan: false, today: "", plate: null, done: false });
      return;
    }
    try {
      setState(await getTodayPlate({ data: uid }));
    } catch {
      /* noop */
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const complete = async () => {
    const uid = userId();
    if (!uid) return;
    setBusy(true);
    try {
      await markPlateDone({ data: uid });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (state && !state.hasPlan) {
    return (
      <AppShell active="Plate">
        <Locked title="Plate" blurb="Your nourishing plate idea lives here once you're in." />
      </AppShell>
    );
  }

  return (
    <AppShell active="Plate">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-4 w-fit">
          <SunBadge size={64} />
        </div>
        <h1 className="text-3xl font-extrabold">Today’s Plate</h1>
        <p className="mt-2 text-ink-soft">
          Not a diet — an energy approach. One small, warm idea for your plate.
        </p>

        {state?.plate && (
          <div className="card mt-8 text-left">
            <div className="flex items-center gap-3">
              <span className="pillar-chip">D</span>
              <h2 className="font-display text-2xl font-bold">{state.plate.title}</h2>
            </div>
            <p className="mt-4 text-ink-soft">{state.plate.description}</p>
            <p className="mt-4 text-xs text-muted">
              Nothing forbidden. Fuel that supports your energy — no guilt, no rules.
            </p>

            {state.done ? (
              <p className="mt-6 rounded-lg bg-paper-deep px-4 py-3 text-center font-semibold text-berry">
                ✓ Great — fuel on your own terms today.
              </p>
            ) : (
              <button onClick={complete} disabled={busy} className="btn-primary mt-6 w-full">
                {busy ? "Saving…" : "I did it"}
              </button>
            )}
          </div>
        )}
        {state && !state.plate && (
          <p className="mt-8 text-ink-soft">Come back tomorrow — your plate idea will be here.</p>
        )}
      </div>
    </AppShell>
  );
}
