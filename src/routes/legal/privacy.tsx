import { createFileRoute } from "@tanstack/react-router";
import {
  LegalH,
  LegalLayout,
  LegalP,
  LegalUl,
} from "~/components/legal-layout";
import { CONTACT_EMAIL } from "~/site";
export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyPage,
});

/**
 * Privacy Policy.
 *
 * Written honestly and concretely to what the app actually does today
 * (email capture, quiz answers, self-reported check-ins). Framed around the
 * Australian Privacy Principles (Privacy Act 1988 (Cth)). No fake third-party
 * trackers are claimed — the app has none installed.
 */
function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Privacy Policy"
      title="Privacy Policy"
      updated="21 August 2026"
    >
      <LegalP>
        We're glad you're here. This policy explains, in plain language, what
        information FED collects, why we collect it, and the choices you have.
        We aim to collect as little as we need — and we never sell or rent your
        personal information.
      </LegalP>

      <LegalH>What we collect</LegalH>
      <LegalUl
        items={[
          <>
            <strong>Your email address</strong> — so we can save and send you
            your FED result, your plan, and (only if you want them) occasional
            notes. You are not required to give us an email to browse FED; it
            is only needed where you ask us to deliver your result and plan.
          </>,
          <>
            <strong>Your quiz answers and result</strong> — the answers you
            give (12 questions across Fasting, Exercise, Diet) and the FED
            score and profile they produce, so we can personalise your plan to
            you.
          </>,
          <>
            <strong>Self-reported check-in data</strong> — energy, sleep,
            weight, and waist values you choose to log, plus fasting start/end
            times and which daily move or plate you mark done. This powers the
            app's tracker and streak features. Weight and waist are optional.
          </>,
        ]}
      />

      <LegalH>How we use it</LegalH>
      <LegalP>We use the information above to:</LegalP>
      <LegalUl
        items={[
          <>run the app — show you your plan, streak, and tracker,</>,
          <>personalise your FED plan, score, and profile,</>,
          <>
            send you your result and any plan/account emails you've asked for
            (you can opt out of marketing notes at any time),
          </>,
          <>
            study our product in aggregate (for example, how often people
            complete the quiz) so we can make FED better. Aggregated, de-identified
            trends are not personal information.
          </>,
        ]}
      />

      <LegalH>What we don't do</LegalH>
      <LegalUl
        items={[
          <>we don't sell, rent, or trade your personal information,</>,
          <>
            the FED website does not currently use advertising or cross-site
            tracking cookies, and none of its features require them,
          </>,
          <>
            we don't claim to provide medical advice or store information as
            medical records.
          </>,
        ]}
      />

      <LegalH>How we store and protect it</LegalH>
      <LegalP>
        Your information is stored securely in a hosted database and protected
        with industry-standard measures. Access is limited to the people and
        services that need it to run FED. Standard server logs may be kept
        briefly for security and troubleshooting.
      </LegalP>

      <LegalH>Your rights</LegalH>
      <LegalP>
        Under the Australian Privacy Principles you can ask us to:
      </LegalP>
      <LegalUl
        items={[
          <>tell you what personal information we hold about you,</>,
          <>correct any information that is wrong or out of date,</>,
          <>delete the personal information we hold about you,</>,
          <>stop using your information for a purpose you no longer want.</>,
        ]}
      />
      <LegalP>
        You can also simply stop logging check-in data at any time — it is
        never required. To exercise any of these rights, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-peach">
          {CONTACT_EMAIL}
        </a>{" "}
        and we'll help within a reasonable time (usually 30 days).
      </LegalP>

      <LegalH>Complaints</LegalH>
      <LegalP>
        If you have a concern about how we handle your information, please
        contact us first so we can try to fix it. You also have the right to
        complain to the Office of the Australian Information Commissioner
        (OAIC) at oaic.gov.au.
      </LegalP>

      <LegalH>Changes to this policy</LegalH>
      <LegalP>
        If we change how we handle your information, we'll update this page and
        the date above. We'll keep collecting only what we need, and we won't
        reduce your rights.
      </LegalP>

      <LegalH>Contact</LegalH>
      <LegalP>
        For any privacy question or request, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-peach">
          {CONTACT_EMAIL}
        </a>
        .
      </LegalP>
    </LegalLayout>
  );
}
