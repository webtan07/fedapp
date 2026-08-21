import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/result")({
  component: ResultPage,
});

/** Placeholder result / sales page — the FED score reveal + plan go here. */
function ResultPage() {
  return (
    <div className="min-h-dvh bg-[#191614]">
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-[#c99a4e]">
          Your FED diagnosis
        </p>
        <h1 className="text-4xl font-extrabold">Your result is on its way</h1>
        <p className="mx-auto mt-6 max-w-lg text-[#cfc4b4]">
          This is where your FED score, profile, and first three moves will be
          revealed. Built next in the quiz feature task.
        </p>
        <div className="mt-10">
          <Link to="/" className="btn-secondary">
            Back home
          </Link>
        </div>
      </main>
    </div>
  );
}
