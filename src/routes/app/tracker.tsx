import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, Locked } from "~/components/app-shell";
import { SunBadge } from "~/components/brand";
import { getTracker, saveTracker, type TrackerState } from "~/routes/api/app";

export const Route = createFileRoute("/app/tracker")({
  component: TrackerScreen,
});

function userId(): number | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem("fed_userId");
  return v ? Number(v) : null;
}

interface SliderDef {
  key: "energy" | "sleep" | "weight" | "waist";
  label: string;
  hint: string;
  min: number;
  max: number;
  /** 0-1 fraction shown on the track (energy/sleep 0-10, body 0-100). */
  display: "energy" | "body";
}

const SLIDERS: SliderDef[] = [
  { key: "energy", label: "Energy", hint: "How is your energy today?", min: 0, max: 10, display: "energy" },
  { key: "sleep", label: "Sleep", hint: "How did you sleep?", min: 0, max: 10, display: "energy" },
  { key: "weight", label: "Weight", hint: "Today’s reading (kg) — just a number, not a verdict.", min: 0, max: 120, display: "body" },
  { key: "waist", label: "Waist", hint: "Today’s reading (cm) — optional.", min: 0, max: 150, display: "body" },
];

export function TrackerScreen() {
  const [state, setState] = useState<TrackerState | null>(null);
  const [draft, setDraft] = useState<{ energy: number; sleep: number; weight: number; waist: number }>({
    energy: 5,
    sleep: 5,
    weight: 60,
    waist: 80,
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const uid = userId();
    if (!uid) {
      setState((p) =>
        p ?? { hasPlan: false, today: "", values: { energy: null, sleep: null, weight: null, waist: null }, recap: null, recent: [] },
      );
      return;
    }
    try {
      const s = await getTracker({ data: uid });
      setState(s);
      const v = s.values;
      setDraft({
        energy: v.energy ?? 5,
        sleep: v.sleep ?? 5,
        weight: v.weight ?? 60,
        waist: v.waist ?? 80,
      });
    } catch {
      /* noop */
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const change = (key: keyof typeof draft, value: number) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    const uid = userId();
    if (!uid) return;
    setBusy(true);
    try {
      await saveTracker({
        data: { userId: uid, ...draft },
      });
      setSaved(true);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (state && !state.hasPlan) {
    return (
      <AppShell active="Tracker">
        <Locked title="Tracker" blurb="Track energy, sleep and your body your way here once you’re in." />
      </AppShell>
    );
  }

  return (
    <AppShell active="Tracker">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-4 w-fit">
          <SunBadge size={64} />
        </div>
        <h1 className="text-3xl font-extrabold">Today’s Check-in</h1>
        <p className="mt-2 text-ink-soft">
          A few honest seconds a day — that’s where your energy story gets written.
        </p>

        {/* Auto progress recap — surfaced once enough data exists. */}
        {state?.recap && (
          <div className="card mt-6 border-0 bg-gradient-to-br from-peach to-amber text-left text-cream shadow-glow">
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">
              Your {state.recap.days}-day recap
            </p>
            <p className="mt-2 font-display text-lg font-bold leading-snug text-cream">
              {state.recap.line}
            </p>
            <p className="mt-3 text-sm opacity-90">
              Avg energy {state.recap.avgEnergy}/10 · {state.recap.trendingUp ? "trending up ↑" : "holding steady"}
            </p>
          </div>
        )}

        <div className="card mt-8 text-left">
          {SLIDERS.map((s) => {
            const val = draft[s.key];
            const frac =
              s.display === "energy"
                ? val / 10
                : (val - s.min) / (s.max - s.min);
            return (
              <div key={s.key} className="mb-6 last:mb-0">
                <div className="flex items-baseline justify-between">
                  <label className="font-semibold">
                    {s.label}
                    {s.key !== "weight" && s.key !== "waist" && (
                      <span className="ml-1 text-xs font-normal text-muted"> · {s.hint}</span>
                    )}
                  </label>
                  <span className="font-display text-xl font-bold text-peach">
                    {s.display === "energy" ? `${val}/10` : val}
                  </span>
                </div>
                {s.key === "weight" || s.key === "waist" ? (
                  <p className="mb-2 text-xs text-muted">{s.hint}</p>
                ) : null}
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  value={val}
                  onChange={(e) => change(s.key, Number(e.target.value))}
                  className="w-full accent-[#C1673C]"
                />
                <div
                  className="mt-1 h-1.5 rounded-full bg-gradient-to-r from-peach to-amber"
                  style={{
                    width: `calc(${Math.min(100, Math.max(0, frac * 100))}% )`,
                  }}
                />
              </div>
            );
          })}

          <button onClick={save} disabled={busy} className="btn-primary w-full">
            {busy ? "Saving…" : saved ? "Saved ✓" : "Save today’s check-in"}
          </button>
        </div>

        {state && state.recent.length > 0 && (
          <div className="card mt-8 text-left">
            <h3 className="font-display text-lg font-bold">
              Your energy, day by day {state.recent.length >= 14 ? "· 14+ days" : ""}
            </h3>
            <div className="mt-3 flex h-16 items-end gap-1">
              {state.recent.slice(0, 14).map((c) => (
                <div
                  key={c.date}
                  className="flex-1 rounded-t bg-gradient-to-t from-peach to-amber"
                  style={{ height: c.energy !== null ? `${(c.energy / 10) * 100}%` : "10%" }}
                  title={`${c.date}: ${c.energy ?? "–"}/10`}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Energy readings (last up to 14 days). No judgments — just your own trend.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
