import { createFileRoute } from "@tanstack/react-router";
import {
  LegalH,
  LegalLayout,
  LegalP,
  LegalUl,
} from "~/components/legal-layout";
import { CONTACT_EMAIL } from "~/site";
export const Route = createFileRoute("/legal/terms")({
  component: TermsPage,
});

/**
 * Terms of Use + Subscription / Refund / Cancellation.
 *
 * Clear and fair, framed for Australian consumer law: no misleading or
 * deceptive claims, honest refunds, no liability for health outcomes, no
 * manufactured urgency. Price is labelled as the current founding offer.
 */
function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Terms &amp; Refunds"
      title="Terms of Use, Membership &amp; Refunds"
      updated="21 August 2026"
    >
      <LegalH>1. Acceptance of these terms</LegalH>
      <LegalP>
        By accessing or using FED (the "Service") you agree to these Terms of
        Use. If you don't agree, please don't use the Service. If you're under
        18, please have a parent or guardian review and accept these terms for
        you.
      </LegalP>

      <LegalH>2. A general wellness product — not medical advice</LegalH>
      <LegalP>
        FED provides general wellness information and a self-paced plan around
        fasting, exercise, and diet. It is{" "}
        <strong>not</strong> medical advice, diagnosis, or treatment, and it
        does not replace advice from a qualified health professional. Always
        consult your doctor before changing your diet, fasting, or exercise
        routine — especially if you have a medical condition, take medication,
        or are pregnant or nursing. See our{" "}
        <a href="/legal/disclaimer" className="underline hover:text-peach">
          Medical &amp; Wellness Disclaimer
        </a>
        .
      </LegalP>

      <LegalH>3. Your responsibilities</LegalH>
      <LegalUl
        items={[
          <>provide accurate information about yourself,</>,
          <>
            make your own health decisions and talk to your doctor about any
            changes,
          </>,
          <>
            use the Service lawfully and not try to disrupt or misuse it,
          </>,
          <>
            understand that your check-in data is personal reflection, not
            medical information.
          </>,
        ]}
      />

      <LegalH>4. Membership and pricing</LegalH>
      <LegalP>
        FED is a subscription membership. Our{" "}
        <strong>current founding offer is $19 per month</strong>
        {" "}(labelled as the current founding offer price). This offer is
        available to founding members and may change at any time for new
        members. Unless we tell you otherwise, individual founding members keep
        their founding price while their membership remains active.
      </LegalP>
      <LegalP>
        Prices are shown in Australian dollars and may include GST where
        applicable. We'll always be clear about the price before you pay.
      </LegalP>

      <LegalH>5. Billing, refunds and cancellation</LegalH>
      <LegalP>
        You can <strong>cancel your membership at any time</strong>, and you'll
        keep access for the rest of the billing period you've already paid for.
        Cancelling is easy and takes effect at the end of your current period —
        you won't be charged again.
      </LegalP>
      <LegalP>
        If you're not happy, <strong>we'll refund your first payment</strong> if
        you contact us within 14 days of making it. Beyond that, refunds for
        subsequent periods are handled fairly on a case-by-case basis — just
        contact us and we'll sort it out. (Billing is processed by our payment
        provider, Stripe; see your receipt for its terms.)
      </LegalP>

      <LegalH>6. No liability for health outcomes</LegalH>
      <LegalP>
        To the fullest extent permitted by law, FED and its owners are not
        liable for any injury, loss, or damage arising from your use of the
        Service or from following its general wellness guidance. Nothing in
        these terms limits any right you have under the Australian Consumer Law
        that cannot be limited.
      </LegalP>

      <LegalH>7. Our rights</LegalH>
      <LegalP>
        We may suspend or end access if you misuse the Service or breach these
        terms. We may also update, improve, or discontinue features of the
        Service from time to time.
      </LegalP>

      <LegalH>8. Changes to these terms</LegalH>
      <LegalP>
        We may update these terms from time to time. We'll post the latest
        version on this page and update the date above. If we make changes that
        affect your membership or rights, we'll let you know by email or a
        notice in the Service before they take effect. Continued use after a
        change means you accept the updated terms.
      </LegalP>

      <LegalH>9. Governing law</LegalH>
      <LegalP>
        These terms are governed by the laws of Australia and the state of New
        South Wales, and you agree to the non-exclusive jurisdiction of its
        courts.
      </LegalP>

      <LegalH>10. Contact</LegalH>
      <LegalP>
        Questions about these terms, membership, or a refund? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-peach">
          {CONTACT_EMAIL}
        </a>{" "}
        and we'll help.
      </LegalP>
    </LegalLayout>
  );
}
