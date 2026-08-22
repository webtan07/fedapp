/**
 * FED brand primitives — inline SVG wordmark + sun badge.
 *
 * Rendered as crisp inline SVG for the nav / footer / share card, using the
 * refined, high-end palette:
 *   ivory #F4EEE4 · muted terracotta-peach #D97B4F · soft gold #C98F45
 *   deep terracotta #B04A2E · warm espresso #2B1F1C
 *   signature gradient #C1673C → #C98F45
 * The sun is a clean, minimal rising-disk mark (no chunky rays) so it reads
 * premium and restrained while keeping the warm "sunrise" DNA.
 */
export const FED_GRADIENT = "linear-gradient(100deg,#C1673C 0%,#C98F45 100%)";
const DISPLAY_FONT =
  "'Fraunces','Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif";
const SUN_CORE = "#C97B45";
const SUN_EDGE = "#C98F45";

/**
 * The FED sun — a clean, minimal warm disk. `filled` renders a solid gradient
 * disc (for the share-card gradient band); otherwise a soft dawn disc on a
 * thin ring. No chunky rays — sleek and high-end, yet still warm.
 */
export function SunBadge({ size = 64, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="fedSunGrad" cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor={SUN_EDGE} />
          <stop offset="100%" stopColor={SUN_CORE} />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="19" fill="url(#fedSunGrad)" />
      <circle
        cx="32"
        cy="32"
        r="19"
        fill="none"
        stroke={filled ? "rgba(255,255,255,0.35)" : "#B04A2E"}
        strokeOpacity={filled ? 1 : 0.18}
        strokeWidth="1.5"
      />
      {!filled && <circle cx="32" cy="32" r="7" fill="#B04A2E" opacity="0.28" />}
    </svg>
  );
}

/**
 * The FED wordmark — all-caps serif, refined sunrise gradient, optional
 * minimal sun to the left. `withSun` draws the sun before the mark (nav/app
 * header); `textOnly` is for tight spots.
 */
export function FEDWordmark({
  size = 30,
  withSun = true,
  className = "",
}: {
  /** Rough visual height in px (the svg scales from its viewBox). */
  size?: number;
  withSun?: boolean;
  className?: string;
}) {
  const textX = withSun ? 78 : 12;
  return (
    <svg
      viewBox="0 0 230 44"
      width="auto"
      height={size}
      className={className}
      style={{ display: "block" }}
      role="img"
      aria-label="FED"
    >
      <defs>
        <linearGradient id="fedWord" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C1673C" />
          <stop offset="100%" stopColor="#C98F45" />
        </linearGradient>
        <radialGradient id="fedSunGrad2" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={SUN_EDGE} />
          <stop offset="100%" stopColor={SUN_CORE} />
        </radialGradient>
      </defs>
      {withSun && (
        <g>
          <circle cx="24" cy="22" r="11" fill="url(#fedSunGrad2)" opacity="0.28" />
          <circle cx="24" cy="22" r="6.5" fill="url(#fedSunGrad2)" />
        </g>
      )}
      <text
        x={textX}
        y="32"
        fontFamily={DISPLAY_FONT}
        fontSize="30"
        fontWeight="700"
        letterSpacing="3"
        fill="url(#fedWord)"
      >
        FED
      </text>
    </svg>
  );
}
