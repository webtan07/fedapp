import { createFileRoute } from "@tanstack/react-router";
import {
  LegalH,
  LegalLayout,
  LegalP,
  LegalUl,
} from "~/components/legal-layout";
export const Route = createFileRoute("/legal/disclaimer")({
  component: DisclaimerPage,
});

/**
 * Medical / Wellness Disclaimer.
 *
 * FED is a general wellness product — quitting or starting a fasting /
 * exercise / diet change can carry real risk for some people, so this page is
 * honest about what FED is and isn't, and points anyone who needs it to their
 * doctor. (Australian consumer-law framing: no medical-treatment claims, no
 * misleading promises.)
 */
function DisclaimerPage() {
  return (
    <LegalLayout
      eyebrow="Wellness Disclaimer"
      title="Medical &amp; Wellness Disclaimer"
      updated="21 August 2026"
    >
      <LegalP>
        Please read this before relying on anything in FED. It is important
        that you understand what this product is — and what it is not.
      </LegalP>

      <LegalH>FED is a general wellness product, not a medical product</LegalH>
      <LegalP>
        FED is a self-paced general wellness program built around three
        everyday pillars — fasting (eating windows), gentle exercise, and food
        choices. Its quiz, "FED score", profiles, and daily plan are designed
        to help you{" "}
        <em>notice and gently work with your own energy habits</em>. They are{" "}
        <strong>not</strong> a medical assessment, diagnosis, or treatment plan,
        and they do not take the place of advice from a qualified health
        professional.
      </LegalP>

      <LegalH>It is not a treatment for any condition</LegalH>
      <LegalP>
        FED does not diagnose, treat, cure, or prevent any illness, disease, or
        medical condition, and it is not intended to manage or replace the
        treatment of any existing condition. If you are being treated for a
        condition or take medication, your doctor — not an app — should guide
        any changes to your eating, fasting, or exercise.
      </LegalP>

      <LegalH>Consult your doctor before you start</LegalH>
      <LegalP>
        Check with your doctor or another qualified health provider before
        making any change to your diet, fasting, or exercise routine — and
        especially before starting if any of these apply to you:
      </LegalP>
      <LegalUl
        items={[
          <>you have a medical condition or a history of an eating disorder,</>,
          <>you are pregnant, planning to become pregnant, or are nursing,</>,
          <>you take medication (fasting or dietary changes can affect some medicines),</>,
          <>you have been inactive for a long time and plan to take up exercise, or</>,
          <>you are under 18.</>,
        ]}
      />

      <LegalH>If you have symptoms, seek professional care</LegalH>
      <LegalP>
        FED is not a substitute for professional care. If you have persistent
        or new symptoms, pain, or are concerned about your health in any way,
        please stop and talk to a qualified health professional. In an
        emergency, contact emergency services.
      </LegalP>

      <LegalH>Your check-ins are for your own reflection</LegalH>
      <LegalP>
        The energy, sleep, weight, and waist readings you record in the tracker
        are personal reflections for you. They are not medical measurements, a
        diagnosis, or something FED makes clinical claims about.
      </LegalP>

      <LegalH>Your responsibility</LegalH>
      <LegalP>
        You are responsible for making decisions that are safe for you,
        including talking to your doctor before making any changes. FED's
        content is general information and encouragement — not personalised
        medical advice. Please see our{" "}
        <a href="/legal/terms" className="underline hover:text-peach">
          Terms
        </a>{" "}
        for more on limits of liability.
      </LegalP>
    </LegalLayout>
  );
}
