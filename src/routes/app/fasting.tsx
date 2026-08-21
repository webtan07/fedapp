import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, Locked } from "~/components/app-shell";
import { SunBadge } from "~/components/brand";
import {
  endFastAction,
  getFastingState,
  startFastAction,
  type FastingState,
} from "~/routes/api/app";

export const Route = createFileRoute("/app/fasting")({
  component: FastingScreen,
});

function userId(): number | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem("fed_userId");
  return v ? Number(v) : null;
}

function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${p(m)}m` : `${p(m)}m ${p(s)}s`;
}

export function FastingScreen() {
  const [state, setState] = useState<FastingState | null>(null);
  const [tickMs, setTickMs] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const uid = userId();
    if (!uid) {
      setState((p) => p ?? { hasPlan: false, current: null, todayActive: false, yesterdayActive: false, streak: 0, history: [] });
      return;
    }
    try {
      setState(await getFastingState({ data: uid }));
    } catch {
      /* leave as-is */
    }
  }, []);

  useEffect(() => {
    load();
    // Ticking only drives the DISPLAY of elapsed time; the authoritative start
    // timestamp always comes from the server (survives refresh / timezones).
    const t = setInterval(() => setTickMs((n) => n + 1000), 1000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (fn: () => Promise<{ ok: boolean }>) => {
    const uid = userId();
    if (!uid) return;
    setBusy(true);
    try {
      await fn();
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (state && !state.hasPlan) {
    return (
      <AppShell active="Fasting">
        <Locked title="Fasting" blurb="Start and track your eating windows here once you're in. Upgrade to unlock the timer and your streak." />
      </AppShell>
    );
  }

  const currentElapsed = state?.current ? state.current.elapsedMs + tickMs : 0;

  return (
    <AppShell active="Fasting">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-4 w-fit">
          <SunBadge size={72} />
        </div>
        <h1 className="text-3xl font-extrabold">Fasting Timer</h1>
        <p className="mt-2 text-ink-soft">
          Close your eating window and let your system do its thing.
        </p>

        {state?.current ? (
          <div className="card mt-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Current fast</p>
            <div className="mt-3 font-display text-5xl font-extrabold text-terracotta">
              {fmtElapsed(currentElapsed)}
            </div>
            <p className="mt-2 text-sm text-ink-soft">started {new Date(state.current.startedAt).toLocaleTimeString()}</p>
            <button
              onClick={() => act(endFastAction)}
              disabled={busy}
              className="btn-secondary mt-6 w-full"
            >
              End fast
            </button>
          </div>
        ) : (
          <div className="card mt-8">
            <p className="text-sm text-ink-soft">No fast running right now.</p>
            <button
              onClick={() => act(startFastAction)}
              disabled={busy}
              className="btn-primary mt-6 w-full"
            >
              Start a fast
            </button>
          </div>
        )}

        {/* Streak */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="card text-center">
            <div className="font-display text-4xl font-extrabold text-peach">
              {state?.streak ?? 0}
            </div>
            <p className="mt-1 text-sm text-ink-soft">day streak</p>
          </div>
          <div className="card text-center">
            <div className="font-display text-4xl font-extrabold text-amber">
              {state?.todayActive ? "✓" : "—"}
            </div>
            <p className="mt-1 text-sm text-ink-soft">fasted today</p>
          </div>
        </div>

        {/* History */}
        {state && state.history.length > 0 && (
          <div className="card mt-8 text-left">
            <h3 className="font-display text-lg font-bold">Recent fasts</h3>
            <ul className="mt-3 divide-y divide-line">
              {state.history.slice(0, 6).map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink">
                    {new Date(h.startedAt).toLocaleDateString()} {new Date(h.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-semibold text-terracotta">
                    {h.minutes ? `${Math.floor(h.minutes / 60)}h ${h.minutes % 60}m` : "in progress"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
