import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ANSWER_OPTIONS, QUESTIONS, QUESTION_COUNT } from "~/quiz/questions";
import type { QuizAnswers } from "~/quiz/scoring";
import { submitQuiz } from "~/routes/api/quiz";

export const Route = createFileRoute("/quiz")({
  component: QuizPage,
});

const STEP_EMAIL = QUESTION_COUNT; // 0-indexed step index === question count
const TOTAL_STEPS = STEP_EMAIL + 1;

/**
 * Are you FED up? — the 12-question quiz.
 *
 * One question at a time, warm and empowering. After the last question we
 * capture an email (before the score reveal, per the funnel) and submit: the
 * server persists the attempt (user + quiz_attempt + 12 quiz_answers) and we
 * navigate to /result with the computed result in the URL.
 */
function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const isEmailStep = step === STEP_EMAIL;
  const question = QUESTIONS[step];
  const answered = (q: string) => answers[q] !== undefined;

  const choose = (q: string, value: number) => {
    const next = { ...answers, [q]: value };
    setAnswers(next);
    if (step < STEP_EMAIL) setStep(step + 1);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const progress = Math.round(((step + (isEmailStep ? 1 : 0)) / TOTAL_STEPS) * 100);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email so we can save and reveal your result.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitQuiz({ data: { email, answers } });
      const r = res.result;
      await navigate({
        to: "/result",
        search: {
          total: r.total,
          intensity: r.intensity,
          profile: r.profileSlug,
          fp: r.fp,
          ep: r.ep,
          dp: r.dp,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#191614]">
      <main className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
        <nav className="mb-10 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tight text-[#e8b86b]">
            FED
          </Link>
          <span className="text-sm text-[#9a8f82]">~2 minutes · no stats</span>
        </nav>

        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-[#9a8f82]">
            <span>
              {isEmailStep ? "Almost there" : `Question ${Math.min(step + 1, QUESTION_COUNT)} of ${QUESTION_COUNT}`}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#2a241f]">
            <div
              className="h-full rounded-full bg-[#e8b86b] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="card shadow-glow">
          {!isEmailStep && question ? (
            <>
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-[#c99a4e]">
                {question.pillar === "fasting"
                  ? "Fasting"
                  : question.pillar === "exercise"
                    ? "Exercise"
                    : "Diet"}
              </p>
              <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{question.prompt}</h1>

              <div className="mt-8 flex flex-col gap-3">
                {ANSWER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => choose(question.key, opt.value)}
                    className="btn-secondary w-full justify-between text-left"
                  >
                    <span>{opt.label}</span>
                    <span className="text-sm text-[#9a8f82]">
                      {opt.id === "yes"
                        ? "That’s me"
                        : opt.id === "sometimes"
                          ? "Some days"
                          : "Not really"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                {step > 0 ? (
                  <button onClick={back} className="text-sm text-[#9a8f82] hover:text-[#e8b86b]">
                    ← Back
                  </button>
                ) : (
                  <span />
                )}
                {answered(question.key) ? (
                  <span className="text-sm text-[#9a8f82]">Saved ✓</span>
                ) : (
                  <span className="text-sm text-[#9a8f82]">Pick what sounds like you</span>
                )}
              </div>
            </>
          ) : (
            <div>
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-[#c99a4e]">
                Your FED score
              </p>
              <h1 className="text-2xl font-bold leading-snug sm:text-3xl">
                Where should we send your result?
              </h1>
              <p className="mt-3 text-[#cfc4b4]">
                Enter your email and we’ll reveal your FED score, your profile,
                and the first moves that are actually worth starting. No spam —
                ever.
              </p>
              <div className="mt-8 flex flex-col gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-full border border-[#352d26] bg-[#191614] px-5 py-3 text-[#f5eee2] placeholder-[#6b6155] outline-none focus:border-[#e8b86b]"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary w-full"
                >
                  {submitting ? "Calculating…" : "Reveal my FED score"}
                </button>
                <button onClick={back} className="text-sm text-[#9a8f82] hover:text-[#e8b86b]">
                  ← Back to questions
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-[#6b6155]">
          FED is a general wellness product, not medical advice. Always consult
          your doctor before changing your diet, fasting, or exercise routine.
        </p>
      </main>
    </div>
  );
}
