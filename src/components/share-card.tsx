import { forwardRef } from "react";
import { FEDWordmark } from "./brand";
/**
 * The viral shareable profile card — re-created from the designer's
 * template reference (fed-share-card.png), but rendered with the REAL user's
 * data. Refined, high-end style: ivory card, a slim muted sunrise band, clean
 * serif "YOUR FED PROFILE", a soft-edge profile chip, a high-contrast serif
 * score /24, a reassuring one-liner, and the FED wordmark at the base.
 * Always an achievement, never a diagnosis — no medical cues.
 *
 * Rendering + capture: this is an ordinary DOM node (fixed width, 4:5 aspect).
 * The result page passes a `ref` to html-to-image's `toPng` to download a
 * high-res share image (pixelRatio: 2 → 960×1200).
 */
export interface ShareCardData {
  profileName: string;
  total: number;
  intensity?: string;
  oneLiner?: string;
}
export const DynamicShareCard = forwardRef<HTMLDivElement, { data: ShareCardData }>(
  function DynamicShareCard({ data }, ref) {
    return (
      <div
        ref={ref}
        style={{ width: "480px" }}
        className="flex aspect-[4/5] flex-col overflow-hidden rounded-2xl bg-paper shadow-glow ring-1 ring-line"
      >
        {/* Slim refined sunrise band */}
        <div className="flex h-[24%] flex-col items-center justify-center bg-gradient-to-r from-[#C1673C] to-[#C98F45] px-6 text-center">
          <p className="font-display text-2xl font-bold tracking-[0.18em] text-white">
            YOUR FED PROFILE
          </p>
        </div>
        {/* Body */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <span className="inline-flex items-center justify-center rounded-lg border border-peach/40 bg-cream px-6 py-2 font-sans text-xl font-semibold tracking-tight text-terracotta">
            {data.profileName}
          </span>
          <div className="font-display leading-none">
            <span className="text-8xl font-bold text-terracotta">{data.total}</span>
            <span className="ml-1 text-3xl font-semibold text-ink-soft">/24</span>
          </div>
          <p className="max-w-xs text-lg font-medium text-ink">
            {data.oneLiner || "Your energy is on its way back."}
          </p>
        </div>
        {/* Get FED wordmark */}
        <div className="flex items-center justify-center gap-2 pb-7 pt-2">
          <FEDWordmark size={30} withSun />
        </div>
      </div>
    );
  },
);
