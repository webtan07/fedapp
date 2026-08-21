import type { Pillar } from "~/db/schema";

/**
 * FED quiz question set — 12 symptom-framed questions, 4 per pillar.
 *
 * Voice: warm, empowering, never shaming, never clinical. Each prompt is a
 * "does this sound like you?" statement that a 40+ burned-out reader will
 * recognise. Later these same questions reappear on the result page as the
 * personalised plan ("here's what we'll work on together").
 *
 * Answer options are fixed across all questions: Yes / Sometimes / No,
 * scored 2 / 1 / 0 (higher = more of that pillar's symptoms present).
 */
export type AnswerValue = 0 | 1 | 2;
export type AnswerOptionId = "yes" | "sometimes" | "no";

export interface QuizQuestion {
  /** Stable key, used as the jsonb key in quiz_attempts.answers and in quiz_answers.question_key. */
  key: string;
  /** Which pillar this symptom maps to. */
  pillar: Pillar;
  /** Symptom-framed prompt, in the reader's voice. */
  prompt: string;
}

/** The three fixed answer options with their scores. */
export const ANSWER_OPTIONS: readonly {
  id: AnswerOptionId;
  label: string;
  value: AnswerValue;
}[] = [
  { id: "yes", label: "Yes", value: 2 },
  { id: "sometimes", label: "Sometimes", value: 1 },
  { id: "no", label: "No", value: 0 },
];

export const QUESTIONS: readonly QuizQuestion[] = [
  // ── Fasting (eating windows / hunger / energy timing) ──
  {
    key: "f1",
    pillar: "fasting",
    prompt:
      "You crash hard an hour or two after your biggest meal — even when it felt like a “good” meal.",
  },
  {
    key: "f2",
    pillar: "fasting",
    prompt:
      "You find yourself grazing and snacking all day long, often without really noticing you’re eating.",
  },
  {
    key: "f3",
    pillar: "fasting",
    prompt:
      "Between lunch and dinner your energy and focus take a nosedive, no matter what you had.",
  },
  {
    key: "f4",
    pillar: "fasting",
    prompt:
      "You wake hungry and the idea of going even a few steady hours without food feels like a battle.",
  },

  // ── Exercise (movement / motivation / stored stress) ──
  {
    key: "e1",
    pillar: "exercise",
    prompt:
      "By the end of the day you feel so drained that the last thing you want is to move your body.",
  },
  {
    key: "e2",
    pillar: "exercise",
    prompt:
      "A workout more often leaves you more wiped out than energised — more chore than relief.",
  },
  {
    key: "e3",
    pillar: "exercise",
    prompt:
      "You carry tension in your shoulders, jaw, or neck for most of the day without even noticing.",
  },
  {
    key: "e4",
    pillar: "exercise",
    prompt:
      "You’ve quietly given up on exercise because it always felt like a grind, never like something that actually helps.",
  },

  // ── Diet (cravings / food / metabolism / digestion) ──
  {
    key: "d1",
    pillar: "diet",
    prompt:
      "Sugar or carb cravings tend to hit in the afternoon or evening — and they’re hard to ignore.",
  },
  {
    key: "d2",
    pillar: "diet",
    prompt:
      "Heavier or richer meals leave you bloated, foggy, or sluggish for hours afterwards.",
  },
  {
    key: "d3",
    pillar: "diet",
    prompt:
      "No matter how “good” you eat, your energy or weight won’t budge — and it’s exhausting to keep trying.",
  },
  {
    key: "d4",
    pillar: "diet",
    prompt:
      "You tend to eat fast or on autopilot, halfway through a meal before you’ve really tasted it.",
  },
];

export const QUESTION_COUNT = QUESTIONS.length;
