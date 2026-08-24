import { createFileRoute } from "@tanstack/react-router";
import { getFunnelStats } from "~/routes/api/funnel";

export const Route = createFileRoute("/admin/funnel")({
  loader: () => getFunnelStats(),
  component: FunnelAdminPage,
});

/**
 * Tiny internal read view for funnel analytics — aggregated per-event COUNTS
 * only (never individual rows, so no PII leaves the DB). Useful for eyeballing
 * phase-0 conversion rates (quiz_started → quiz_completed → email_captured →
 * score_revealed → checkout_clicked → tester_unlocked) without touching SQL.
 */
function FunnelAdminPage() {
  const data = Route.useLoaderData();
  const counts = data.counts ?? [];

  return (
    <div className="min-h-dvh bg-cream px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl font-extrabold text-ink">FED funnel</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Live counts per event (aggregated). No individual rows are shown.
        </p>
        {counts.length === 0 ? (
          <p className="mt-8 text-sm text-muted">
            No funnel events recorded yet. Take the quiz once and events start landing here.
          </p>
        ) : (
          <table className="mt-6 w-full overflow-hidden rounded-2xl border border-line bg-paper text-left text-sm">
            <thead className="bg-paper-deep text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3 text-right">Count</th>
                <th className="px-4 py-3 text-right">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c) => (
                <tr key={c.event} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">{c.event}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">{c.count}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted">
                    {new Date(c.lastAt as string).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
