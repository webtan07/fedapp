import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, Locked } from "~/components/app-shell";
import { SunBadge } from "~/components/brand";
import { getTodayMove, markMoveDone, type TodayMoveState } from "~/routes/api/app";

export const Route = createFileRoute("/app/move")({
  component: MoveScreen,
});

function userId(): number | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem("fed_userId");
  return v ? Number(v) : null;
}

export function MoveScreen() {
  const [state, setState] = useState<TodayMoveState | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const uid = userId();
    if (!uid) {
      setState((p) => p ?? { hasPlan: false, today: "", move: null, done: false });
      return;
    }
    try {
      setState(await getTodayMove({ data: uid }));
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
      await markMoveDone({ data: uid });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (state && !state.hasPlan) {
    return (
      <AppShell active="Move">
        <Locked title="Move" blurb="Your gentle daily movement lives here once you're in." />
      </AppShell>
    );
  }

  return (
    <AppShell active="Move">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-4 w-fit">
          <SunBadge size={64} />
        </div>
        <h1 className="text-3xl font-extrabold">Today’s Move</h1>
        <p className="mt-2 text-ink-soft">
          Movement that calms a tired system — not one more grind.
        </p>

        {state?.move && (
          <div className="card mt-8 text-left">
            <div className="flex items-center gap-3">
              <span className="pillar-chip">E</span>
              <div>
                <h2 className="font-display text-2xl font-bold">{state.move.title}</h2>
                <p className="text-sm text-muted">
                  {state.move.durationMin} min · {state.move.difficulty}
                </p>
              </div>
            </div>
            <p className="mt-4 text-ink-soft">{state.move.instructions}</p>

            {state.done ? (
              <p className="mt-6 rounded-lg bg-paper-deep px-4 py-3 text-center font-semibold text-berry">
                ✓ Beautifully done today — show up for yourself.
              </p>
            ) : (
              <button onClick={complete} disabled={busy} className="btn-primary mt-6 w-full">
                {busy ? "Saving…" : "I did it"}
              </button>
            )}
          </div>
        )}
        {state && !state.move && (
          <p className="mt-8 text-ink-soft">Come back tomorrow — your move will be here.</p>
        )}
      </div>
    </AppShell>
  );
}
