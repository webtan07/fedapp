import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "~/components/app-shell";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

function AppHome() {
  return (
    <AppShell active="My Plan">
      <div className="card">
        <h1 className="text-2xl font-bold">Today’s FED plan</h1>
        <p className="mt-3 text-[#9a8f82]">
          Your three first moves — one for Fasting, one for Exercise, one for
          Diet — appear here once your plan is generated.
        </p>
      </div>
    </AppShell>
  );
}
