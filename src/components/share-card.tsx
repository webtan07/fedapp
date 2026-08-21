import { forwardRef } from "react";
import { FEDWordmark, SunBadge } from "./brand";

/**
 * The viral shareable profile card — re-created from the designer's
 * template reference (fed-share-card.png), but rendered with the REAL user's
 * data. Style recipe per ASSETS-INVENTORY.md:
 *   cream card · sunrise gradient band · round sun badge · bold rounded
 *   "YOUR FED PROFILE" · circled profile chip · real FED score /24 ·
 *   reassuring one-liner · "GET FED" wordmark + sun at the bottom.
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
        className="flex aspect-[4/5] flex-col overflow-hidden rounded-[2rem] bg-cream shadow-glow"
      >
        {/* Sunrise gradient band */}
        <div className="relative flex h-[27%] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-peach to-amber px-6 text-center">
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute -left-8 bottom-0 h-20 w-20 rounded-full bg-white/10" />
          <SunBadge size={52} filled />
          <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white">
            YOUR FED PROFILE
          </p>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <span className="rounded-full border border-peach/50 bg-paper px-6 py-2 font-display text-xl font-bold text-terracotta">
            {data.profileName}
          </span>
          <div className="font-display leading-none">
            <span className="text-8xl font-extrabold text-terracotta">{data.total}</span>
            <span className="ml-1 text-3xl font-bold text-ink-soft">/24</span>
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
