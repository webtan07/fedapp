import { createFileRoute } from "@tanstack/react-router";
import { getHealth, type HealthResult } from "~/routes/api/health";

export const Route = createFileRoute("/health")({
  loader: () => getHealth(),
  component: HealthPage,
});

/** Small verification page: renders the healthcheck result as JSON. */
function HealthPage() {
  const data = Route.useLoaderData() as HealthResult;
  return (
    <div className="min-h-dvh bg-[#191614] px-6 py-16">
      <pre className="mx-auto max-w-2xl overflow-auto rounded-2xl border border-[#352d26] bg-[#221e1b] p-6 text-sm text-[#cfc4b4]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
