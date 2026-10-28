// PROTOTYPE — throwaway. Shared toy drawings for variant C.
import type { ShipKind } from "@sonar/game";
import type { ReactNode } from "react";

const INK = "#23395d";

export const SHIP_COLORS: Record<ShipKind, { body: string; lip: string }> = {
  carrier: { body: "#ffd23f", lip: "#e5a800" },
  battleship: { body: "#ff7eb6", lip: "#e0518f" },
  cruiser: { body: "#b9a3ff", lip: "#8d72e6" },
  submarine: { body: "#ff9f5a", lip: "#e07a2e" },
  destroyer: { body: "#7ee8b5", lip: "#3fbf86" },
};

export const SHIP_NAMES: Record<ShipKind, string> = {
  carrier: "Carrier",
  battleship: "Battleship",
  cruiser: "Cruiser",
  submarine: "Submarine",
  destroyer: "Destroyer",
};

/** Side-view bath toy boat. Width grows with the ship length; one porthole per cell. */
export function ToyBoat({
  length = 3,
  color = "#ffd23f",
  lip = "#e5a800",
  className,
}: {
  length?: number;
  color?: string;
  lip?: string;
  className?: string;
}) {
  const w = 28 + length * 16;
  const mast = w * 0.42;
  return (
    <svg viewBox={`0 0 ${w} 60`} className={className} aria-hidden="true">
      <rect x={mast - 1.5} y={3} width={3} height={22} rx={1.5} fill={INK} />
      <path d={`M${mast + 1} 4 L${mast + 15} 9 L${mast + 1} 14 Z`} fill="#ff6b5e" />
      <rect x={w * 0.24} y={19} width={w * 0.4} height={16} rx={6} fill="#fff" />
      <circle cx={w * 0.34} cy={27} r={3} fill="#9be3ff" />
      <circle cx={w * 0.5} cy={27} r={3} fill="#9be3ff" />
      <rect x={w * 0.7} y={13} width={9} height={20} rx={3.5} fill="#ff7eb6" />
      <rect x={w * 0.7} y={13} width={9} height={5} rx={2.5} fill={INK} />
      <path d={`M3 32 H${w - 3} Q${w - 7} 55 ${w - 20} 56 H20 Q7 55 3 32 Z`} fill={lip} />
      <path d={`M3 32 H${w - 3} Q${w - 8} 50 ${w - 20} 51 H20 Q8 50 3 32 Z`} fill={color} />
      <rect x={3} y={30} width={w - 6} height={5} rx={2.5} fill="#fff" opacity={0.9} />
      {Array.from({ length }, (_, i) => (
        <circle
          key={i}
          cx={16 + ((w - 32) / Math.max(1, length - 1)) * (length === 1 ? 0.5 : i)}
          cy={42}
          r={3.4}
          fill="#fff"
          stroke={INK}
          strokeOpacity={0.25}
          strokeWidth={1.2}
        />
      ))}
    </svg>
  );
}

export type Mood = "happy" | "worried" | "party" | "sad";

/** Captain Inky, the octopus mascot. */
export function Octopus({ mood = "happy", className }: { mood?: Mood; className?: string }) {
  const mouth = {
    happy: "M48 66 Q60 78 72 66",
    party: "M46 64 Q60 84 74 64 Z",
    worried: "M50 72 Q55 66 60 72 Q65 78 70 72",
    sad: "M48 74 Q60 64 72 74",
  }[mood];
  return (
    <svg viewBox="0 0 120 124" className={className} aria-hidden="true">
      <g fill="none" stroke="#ff7eb6" strokeWidth={11} strokeLinecap="round">
        <path className="toybox-wiggle" d="M32 80 Q18 98 26 114" />
        <path
          className="toybox-wiggle"
          style={{ animationDelay: "-0.6s" }}
          d="M46 88 Q40 104 50 116"
        />
        <path
          className="toybox-wiggle"
          style={{ animationDelay: "-1.2s" }}
          d="M60 90 Q62 106 58 118"
        />
        <path
          className="toybox-wiggle"
          style={{ animationDelay: "-1.8s" }}
          d="M74 88 Q82 104 72 116"
        />
        <path
          className="toybox-wiggle"
          style={{ animationDelay: "-2.2s" }}
          d="M88 80 Q102 98 94 114"
        />
      </g>
      <ellipse cx={60} cy={58} rx={40} ry={36} fill="#ff7eb6" />
      <ellipse cx={46} cy={40} rx={12} ry={8} fill="#fff" opacity={0.35} />
      {/* captain hat */}
      <path d="M30 30 Q60 2 90 30 Z" fill="#fff" />
      <rect x={24} y={26} width={72} height={9} rx={4.5} fill={INK} />
      <circle cx={60} cy={20} r={5} fill="#ffd23f" />
      {/* eyes */}
      <g className="toybox-blink">
        <ellipse cx={46} cy={52} rx={8} ry={9.5} fill="#fff" />
        <ellipse cx={74} cy={52} rx={8} ry={9.5} fill="#fff" />
        <circle cx={mood === "worried" ? 44 : 48} cy={54} r={4.5} fill={INK} />
        <circle cx={mood === "worried" ? 72 : 76} cy={54} r={4.5} fill={INK} />
      </g>
      {mood === "sad" || mood === "worried" ? (
        <g stroke={INK} strokeWidth={3} strokeLinecap="round">
          <path d="M38 44 L51 39" />
          <path d="M82 44 L69 39" />
        </g>
      ) : null}
      <circle cx={36} cy={66} r={6} fill="#ffb3d4" />
      <circle cx={84} cy={66} r={6} fill="#ffb3d4" />
      <path
        d={mouth}
        fill={mood === "party" ? INK : "none"}
        stroke={INK}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Pink-and-white life ring. */
export function LifeRing({ className }: { className?: string }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <circle cx={100} cy={106} r={r} fill="none" stroke="rgb(35 57 93 / 0.15)" strokeWidth={42} />
      <circle cx={100} cy={100} r={r} fill="none" stroke="#fff" strokeWidth={42} />
      <circle
        cx={100}
        cy={100}
        r={r}
        fill="none"
        stroke="#ff7eb6"
        strokeWidth={42}
        strokeDasharray={`${c / 8} ${c / 8}`}
      />
      <circle
        cx={100}
        cy={100}
        r={r + 21}
        fill="none"
        stroke="rgb(35 57 93 / 0.12)"
        strokeWidth={2}
      />
      <circle
        cx={100}
        cy={100}
        r={r}
        fill="none"
        stroke="#e5a800"
        strokeWidth={4}
        strokeDasharray="10 8"
        opacity={0.9}
      />
      <ellipse
        cx={70}
        cy={52}
        rx={18}
        ry={7}
        fill="#fff"
        opacity={0.6}
        transform="rotate(-30 70 52)"
      />
    </svg>
  );
}

/** A big cartoon "boom" for hits. */
export function Boom({ className }: { className?: string }) {
  const points = Array.from({ length: 16 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 16 - Math.PI / 2;
    const radius = i % 2 === 0 ? 48 : 30;
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <polygon
        points={points}
        fill="#ff6b5e"
        stroke="#fff"
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <circle cx={50} cy={50} r={15} fill="#ffd23f" />
    </svg>
  );
}

/** A little splash ring for misses. */
export function Splash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx={50} cy={50} r={30} fill="#fff" />
      <circle cx={50} cy={50} r={30} fill="none" stroke="#9be3ff" strokeWidth={8} />
      <circle cx={40} cy={40} r={8} fill="#c4ecff" />
    </svg>
  );
}

const WAVE =
  "M0 30 Q 50 0 100 30 T 200 30 T 300 30 T 400 30 T 500 30 T 600 30 T 700 30 T 800 30 V 120 H 0 Z";

/** Three layers of sliding cartoon waves with toy boats bobbing between them. */
export function Waves({ children }: { children?: ReactNode }) {
  return (
    <div className="toybox-waves" aria-hidden="true">
      <svg
        className="toybox-wave toybox-wave--back"
        style={{ top: "1.5rem" }}
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
      >
        <path d={WAVE} fill="#7fdcea" />
      </svg>
      {children}
      <svg
        className="toybox-wave toybox-wave--mid"
        style={{ top: "3.5rem" }}
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
      >
        <path d={WAVE} fill="#4fd1d9" />
      </svg>
      <svg
        className="toybox-wave"
        style={{ top: "5.5rem" }}
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
      >
        <path d={WAVE} fill="#29b3c8" />
      </svg>
    </div>
  );
}
