/**
 * FED brand primitives — inline SVG wordmark + sun badge.
 *
 * The logo raster (fed-logo.png) shipped with a solid cream background, so we
 * re-draw the wordmark as an inline SVG here for crisp, transparent rendering
 * in the nav / footer / share card, using the brand palette:
 *   cream #FFF4E6 · peach #FF8A5C · amber #FFB24D · terracotta #E85D3D
 *   berry #D84A6A · cocoa ink #3B2A2C · signature gradient #FF8A5C→#FFB24D
 */
export const FED_GRADIENT = "linear-gradient(100deg,#FF8A5C 0%,#FFB24D 100%)";

const DISPLAY_FONT =
  "'Baloo 2','Quicksand','Nunito','ui-rounded','Trebuchet MS','Verdana',sans-serif";

/**
 * The FED sun — a warm sunrise badge. `filled` renders the solid gradient disk
 * (for the share-card gradient band); otherwise a soft dawn-glow disc.
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
        <radialGradient id="fedSunGrad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#FFB24D" />
          <stop offset="100%" stopColor="#FF8A5C" />
        </radialGradient>
      </defs>
      {filled && (
        <circle cx="32" cy="32" r="22" fill="url(#fedSunGrad)" />
      )}
      {/* sunrise rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 32 + Math.cos(rad) * (filled ? 26 : 24);
        const y1 = 32 + Math.sin(rad) * (filled ? 26 : 24);
        const x2 = 32 + Math.cos(rad) * 31;
        const y2 = 32 + Math.sin(rad) * 31;
        return (
          <line
            key={a}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#FFB24D"
            strokeWidth="4"
            strokeLinecap="round"
            opacity={filled ? 0.9 : 0.7}
          />
        );
      })}
      {!filled && <circle cx="32" cy="32" r="20" fill="#FF8A5C" opacity="0.85" />}
    </svg>
  );
}

/**
 * The FED wordmark — all-caps, sunrise gradient, optional sun to the left.
 * Renders as a crisp inline SVG (never the solid-bg PNG). `withSun` draws the
 * sun before the mark (nav/app header); `textOnly` is for tight spots.
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
  const textX = withSun ? 84 : 12;
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
          <stop offset="0%" stopColor="#FF8A5C" />
          <stop offset="100%" stopColor="#FFB24D" />
        </linearGradient>
      </defs>
      {withSun && (
        <g>
          <circle cx="30" cy="22" r="15" fill="url(#fedSunGrad2)" opacity="0.35" />
          <circle cx="30" cy="22" r="10" fill="url(#fedSunGrad2)" />
        </g>
      )}
      <defs>
        <radialGradient id="fedSunGrad2" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#FFB24D" />
          <stop offset="100%" stopColor="#FF8A5C" />
        </radialGradient>
      </defs>
      <text
        x={textX}
        y="33"
        fontFamily={DISPLAY_FONT}
        fontSize="30"
        fontWeight="800"
        letterSpacing="1.5"
        fill="url(#fedWord)"
      >
        FED
      </text>
    </svg>
  );
}
