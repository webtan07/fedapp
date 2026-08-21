import { Link } from "@tanstack/react-router";
import { FEDWordmark } from "./brand";

/**
 * Shared legal footer for all public pages + the paywalled app.
 *
 * Renders the three legal links (Disclaimer / Privacy / Terms), the full
 * medical-disclaimer line (kept on the sales page & the check-in app where a
 * "personalized plan" is shown), and the copyright line — in the warm brand
 * voice.
 *
 * `contained` is for the app-shell (already inside a `max-w` wrapper, no top
 * border); the full-width variant with a top border is used on standalone
 * pages. `wordmark` shows the FED wordmark in the footer.
 */
export function LegalFooter({
  wordmark = false,
  contained = false,
}: {
  wordmark?: boolean;
  contained?: boolean;
}) {
  const links = (
    <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-ink-soft">
      <Link to="/legal/disclaimer" className="hover:text-peach">
        Medical &amp; Wellness Disclaimer
      </Link>
      <Link to="/legal/privacy" className="hover:text-peach">
        Privacy Policy
      </Link>
      <Link to="/legal/terms" className="hover:text-peach">
        Terms &amp; Refunds
      </Link>
    </nav>
  );
  const body = (
    <>
      {wordmark && <FEDWordmark size={30} withSun className="mx-auto" />}
      <div className={wordmark ? "mt-6" : ""}>{links}</div>
      <p className="mx-auto mt-5 max-w-2xl text-xs leading-relaxed text-ink-soft">
        FED is a general wellness product, not medical advice. It does not
        diagnose, treat, or prevent any disease. Always consult your doctor or
        another qualified health provider before changing your diet, fasting,
        or exercise routine — especially if you have a medical condition, take
        medication, or are pregnant or nursing.
      </p>
      <p className="mt-4 text-xs text-muted">
        © {new Date().getFullYear()} FED
      </p>
    </>
  );
  if (contained) {
    return (
      <footer className="mx-auto max-w-3xl px-6 pb-8 pt-4 text-center">
        {body}
      </footer>
    );
  }
  return (
    <footer className="border-t border-line px-6 py-10">
      <div className="mx-auto max-w-3xl text-center">{body}</div>
    </footer>
  );
}

/** Short "not medical advice — see disclaimer" note for near-plan / score copy. */
export function DisclaimerNote({ className = "" }: { className?: string }) {
  return (
    <p className={"text-xs text-muted " + className}>
      Wellness guidance, not medical advice — see our{" "}
      <Link to="/legal/disclaimer" className="underline hover:text-peach">
        disclaimer
      </Link>
      .
    </p>
  );
}
