/**
 * Hand-checked verification of the FED quiz scoring module.
 * Run with: bun run src/quiz/verify-scoring.ts
 * Asserts each expected output; exits non-zero on any mismatch.
 */
import {
  scoreQuiz,
  intensityFor,
  dominantPillarFor,
  ALL_HIGH_PER_PILLAR,
  type QuizAnswers,
} from "./scoring";
import { QUESTIONS } from "./questions";

let failures = 0;
function check(label: string, cond: boolean, got?: unknown, want?: unknown) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}

/** Build an answer set from question->value overrides (unset questions default to 0). */
const from = (o: Record<string, number>): QuizAnswers => {
  const a: QuizAnswers = {};
  for (const q of QUESTIONS) a[q.key] = 0;
  Object.entries(o).forEach(([k, v]) => (a[k] = v));
  return a;
};
/** All questions in a pillar set to the same value. */
const pillarAll = (pillar: string, v: number): QuizAnswers => {
  const a: QuizAnswers = {};
  for (const q of QUESTIONS) a[q.key] = 0;
  for (const q of QUESTIONS) if (q.pillar === pillar) a[q.key] = v;
  return a;
};

console.log("Score → intensity tiers");
check("intensityFor(3) === low", intensityFor(3) === "low", intensityFor(3), "low");
check("intensityFor(8) === low", intensityFor(8) === "low");
check("intensityFor(9) === mid", intensityFor(9) === "mid");
check("intensityFor(16) === mid", intensityFor(16) === "mid");
check("intensityFor(17) === high", intensityFor(17) === "high");
check("intensityFor(24) === high", intensityFor(24) === "high");

console.log("Dominant-pillar tie-break (Fasting > Exercise > Diet)");
check("dominant(8,8,0) === fasting", dominantPillarFor(8, 8, 0) === "fasting");
check("dominant(0,8,8) === exercise", dominantPillarFor(0, 8, 8) === "exercise");
check("dominant(0,0,8) === diet", dominantPillarFor(0, 0, 8) === "diet");
check("dominant(8,0,0) === fasting", dominantPillarFor(8, 0, 0) === "fasting");
check("dominant(4,4,4) === fasting (three-way tie)", dominantPillarFor(4, 4, 4) === "fasting");

console.log("All-No answers → everything 0, Low");
{
  const r = scoreQuiz(from({}));
  check("total 0", r.total === 0, r.total, 0);
  check("fp/ep/dp all 0", r.fp === 0 && r.ep === 0 && r.dp === 0, [r.fp, r.ep, r.dp], [0, 0, 0]);
  check("intensity low", r.intensity === "low", r.intensity, "low");
}

console.log("All-Yes answers → all 8, total 24, High, Completely FED Up");
{
  const r = scoreQuiz(from({ f1: 2, f2: 2, f3: 2, f4: 2, e1: 2, e2: 2, e3: 2, e4: 2, d1: 2, d2: 2, d3: 2, d4: 2 }));
  check("fp/ep/dp all 8", r.fp === 8 && r.ep === 8 && r.dp === 8, [r.fp, r.ep, r.dp], [8, 8, 8]);
  check("total 24", r.total === 24, r.total, 24);
  check("intensity high", r.intensity === "high", r.intensity, "high");
  check("profile completely-fed-up", r.profileSlug === "completely-fed-up", r.profileSlug);
}

console.log("Diet dominant (dp 8) → wired-and-tired");
{
  const r = scoreQuiz(pillarAll("diet", 2));
  check("dp 8, fp 0, ep 0", r.dp === 8 && r.fp === 0 && r.ep === 0, [r.fp, r.ep, r.dp], [0, 0, 8]);
  check("dominant diet", r.dominantPillar === "diet");
  check("profile wired-and-tired", r.profileSlug === "wired-and-tired", r.profileSlug);
}
console.log("Fasting dominant (fp 8) → cortisol-crash");
{
  const r = scoreQuiz(pillarAll("fasting", 2));
  check("dominant fasting", r.dominantPillar === "fasting");
  check("profile cortisol-crash", r.profileSlug === "cortisol-crash", r.profileSlug);
}
console.log("Exercise dominant (ep 8) → slow-burn");
{
  const r = scoreQuiz(pillarAll("exercise", 2));
  check("profile slow-burn", r.profileSlug === "slow-burn", r.profileSlug);
}

console.log("Low total, clear diet dominant (dp 4) → low + wired-and-tired");
{
  const r = scoreQuiz(pillarAll("diet", 1)); // diet = 1*4 = 4
  check("total 4", r.total === 4, r.total, 4);
  check("intensity low", r.intensity === "low", r.intensity, "low");
  check("profile wired-and-tired", r.profileSlug === "wired-and-tired", r.profileSlug);
}

console.log("At threshold 6,6,6 → all-high → completely-fed-up (total 18, High)");
{
  const b = from({ f1: 2, f2: 2, f3: 1, f4: 1, e1: 2, e2: 2, e3: 1, e4: 1, d1: 2, d2: 2, d3: 1, d4: 1 });
  const r = scoreQuiz(b);
  check("fp/ep/dp all 6", r.fp === 6 && r.ep === 6 && r.dp === 6, [r.fp, r.ep, r.dp], [6, 6, 6]);
  check("total 18 high", r.total === 18 && r.intensity === "high", [r.total, r.intensity], [18, "high"]);
  check("profile completely-fed-up", r.profileSlug === "completely-fed-up", r.profileSlug);
}

console.log("Below threshold (5,5,6) → NOT all-high → diet dominant → wired-and-tired");
{
  const b = from({ f1: 2, f2: 1, f3: 1, f4: 1, e1: 2, e2: 1, e3: 1, e4: 1, d1: 2, d2: 2, d3: 1, d4: 1 });
  const r = scoreQuiz(b);
  check("fp5 ep5 dp6", r.fp === 5 && r.ep === 5 && r.dp === 6, [r.fp, r.ep, r.dp], [5, 5, 6]);
  check("total 16 mid", r.total === 16 && r.intensity === "mid", [r.total, r.intensity], [16, "mid"]);
  check("profile NOT completely-fed-up", r.profileSlug !== "completely-fed-up", r.profileSlug);
  check("profile wired-and-tired (diet dominant)", r.profileSlug === "wired-and-tired", r.profileSlug);
}

console.log("Tie fp==ep leading (4,4,0) → fasting wins → cortisol-crash");
{
  const r = scoreQuiz(from({ f1: 2, f2: 2, e1: 2, e2: 2 })); // fp4 ep4 dp0
  check("fp4 ep4 dp0", r.fp === 4 && r.ep === 4 && r.dp === 0, [r.fp, r.ep, r.dp], [4, 4, 0]);
  check("dominant fasting", r.dominantPillar === "fasting");
  check("profile cortisol-crash", r.profileSlug === "cortisol-crash", r.profileSlug);
}

console.log(`\nThreshold constant ALL_HIGH_PER_PILLAR === ${ALL_HIGH_PER_PILLAR}`);
check("ALL_HIGH_PER_PILLAR === 6", ALL_HIGH_PER_PILLAR === 6, ALL_HIGH_PER_PILLAR, 6);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) FAILED`);
  process.exit(1);
} else {
  console.log("\nAll scoring assertions passed.");
}
