import type { CSSProperties } from "react";
import "./radar-scope.css";

const PERIOD_SECONDS = 4;

// Blips sit at a bearing (degrees clockwise from north) and a radius (fraction of the scope).
// Each flash is delayed so it lands exactly as the sweep passes over it.
const BLIPS = [
  { bearing: 38, radius: 0.62, hostile: false },
  { bearing: 112, radius: 0.34, hostile: false },
  { bearing: 161, radius: 0.71, hostile: true },
  { bearing: 205, radius: 0.5, hostile: false },
  { bearing: 252, radius: 0.78, hostile: false },
  { bearing: 297, radius: 0.28, hostile: true },
  { bearing: 333, radius: 0.55, hostile: false },
];

const TICKS = Array.from({ length: 72 }, (_, i) => {
  const angle = (i * 5 * Math.PI) / 180;
  const major = i % 6 === 0;
  const inner = major ? 89 : 93;
  return {
    x1: 100 + Math.sin(angle) * inner,
    y1: 100 - Math.cos(angle) * inner,
    x2: 100 + Math.sin(angle) * 97,
    y2: 100 - Math.cos(angle) * 97,
    major,
  };
});

const BEARINGS = [0, 90, 180, 270].map((deg) => {
  const angle = (deg * Math.PI) / 180;
  return {
    label: String(deg).padStart(3, "0"),
    x: 100 + Math.sin(angle) * 82,
    y: 100 - Math.cos(angle) * 82 + 2.5,
  };
});

export function RadarScope({ callsign }: { callsign: string }) {
  return (
    <div
      className="radar-scope w-full"
      style={{ "--radar-period": `${PERIOD_SECONDS}s` } as CSSProperties}
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 size-full"
        aria-hidden="true"
        fill="none"
        stroke="rgb(57 255 136 / 0.28)"
      >
        {[24, 48, 72, 96].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} strokeWidth="0.6" />
        ))}
        <line x1="100" y1="4" x2="100" y2="196" strokeWidth="0.5" />
        <line x1="4" y1="100" x2="196" y2="100" strokeWidth="0.5" />
        <line x1="32" y1="32" x2="168" y2="168" strokeWidth="0.3" strokeDasharray="2 3" />
        <line x1="168" y1="32" x2="32" y2="168" strokeWidth="0.3" strokeDasharray="2 3" />
        {TICKS.map(({ major, ...line }, i) => (
          <line key={i} {...line} strokeWidth={major ? 0.9 : 0.4} stroke="rgb(57 255 136 / 0.5)" />
        ))}
        {BEARINGS.map(({ label, x, y }) => (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="6"
            fill="rgb(57 255 136 / 0.6)"
            stroke="none"
            className="font-mono"
          >
            {label}
          </text>
        ))}
      </svg>

      {BLIPS.map(({ bearing, radius, hostile }) => {
        const angle = (bearing * Math.PI) / 180;
        return (
          <span
            key={bearing}
            aria-hidden="true"
            className={`radar-blip ${hostile ? "text-sonar-coral" : "text-sonar-green"}`}
            style={{
              left: `${50 + Math.sin(angle) * radius * 50}%`,
              top: `${50 - Math.cos(angle) * radius * 50}%`,
              animationDelay: `${(bearing / 360) * PERIOD_SECONDS - PERIOD_SECONDS}s`,
            }}
          />
        );
      })}

      <div className="radar-sweep" aria-hidden="true" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-[14%] text-center">
        <p className="hud-label mb-2 !text-[0.6rem] sm:!text-xs">
          Pilot <span className="text-sonar-green">{callsign}</span> on deck
        </p>
        <h1 className="glow-green font-display text-[clamp(3rem,14vw,6rem)] leading-[0.85]">
          SONAR
        </h1>
        <p className="mt-3 max-w-[18rem] text-[0.7rem] font-semibold tracking-wide text-sonar-ink/80 sm:text-sm">
          Classic Battleship. Strict 1v1. No sign-up. 30 seconds a shot.
        </p>
      </div>
    </div>
  );
}
