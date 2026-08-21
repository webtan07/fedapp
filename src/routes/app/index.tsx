import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Locked } from "~/components/app-shell";
import { SunBadge } from "~/components/brand";
import { DisclaimerNote } from "~/components/footer";
import { getAppAccess } from "~/routes/api/app";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

function userId(): number | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem("fed_userId");
  return v ? Number(v) : null;
}

function AppHome() {
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);

  useEffect(() => {
    const uid = userId();
    if (!uid) {
      setHasPlan(false);
      return;
    }
    getAppAccess({ data: uid })
      .then((r) => setHasPlan(r.hasPlan))
      .catch(() => setHasPlan(false));
  }, []);

  return (
    <AppShell active="My Plan">
      {hasPlan === false ? (
        <Locked title="My Plan" blurb="Your daily FED plan — fasting, move, plate and tracker — lives here once you’re in." />
      ) : (
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-4 w-fit">
            <SunBadge size={80} />
          </div>
          <h1 className="text-3xl font-extrabold">Today’s FED plan</h1>
          <p className="mt-2 text-ink-soft">
            Four small things, one day at a time. Energy comes back in the everyday.
          </p>
          <DisclaimerNote className="mt-3" />
          <div className="mt-8 grid gap-4 text-left">
            {[
              { href: "/app/fasting", label: "Fasting", d: "Start your window & keep your streak." },
              { href: "/app/move", label: "Move", d: "One gentle movement that calms." },
              { href: "/app/plate", label: "Plate", d: "One warm idea for today’s plate." },
              { href: "/app/tracker", label: "Tracker", d: "Check in — energy, sleep, and you." },
            ].map((p) => (
              <Link key={p.href} to={p.href} className="card flex items-center gap-4 transition hover:bg-paper-deep">
                <span className="pillar-chip">{p.label[0]}</span>
                <span>
                  <span className="font-display text-lg font-bold">{p.label}</span>
                  <span className="block text-sm text-ink-soft">{p.d}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
