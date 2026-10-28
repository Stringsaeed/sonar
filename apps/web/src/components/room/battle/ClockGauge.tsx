import { CLOCKS } from "@sonar/game";
import { Duration } from "effect";
import { cn } from "@/lib/utils";
import type { Turn } from "./model";

const TURN_SECONDS = Duration.toSeconds(CLOCKS.turn);
/** Under this many seconds the clock goes amber and starts to throb. */
const URGENT_SECONDS = 10;

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TICKS = Array.from({ length: TURN_SECONDS }, (_, i) => {
  const angle = (i / TURN_SECONDS) * 2 * Math.PI;
  return {
    x1: 50 + Math.cos(angle) * 31,
    y1: 50 + Math.sin(angle) * 31,
    x2: 50 + Math.cos(angle) * 34,
    y2: 50 + Math.sin(angle) * 34,
  };
});

/** A circular countdown for the current turn. */
export function ClockGauge({
  turn,
  secondsLeft,
  opponent,
}: {
  turn: Turn;
  secondsLeft: number | undefined;
  opponent: string;
}) {
  const left = turn === "over" ? 0 : Math.min(TURN_SECONDS, secondsLeft ?? TURN_SECONDS);
  const urgent = turn !== "over" && left < URGENT_SECONDS;
  const color =
    turn === "over"
      ? "rgb(216 251 232 / 0.3)"
      : urgent
        ? "var(--color-sonar-amber)"
        : turn === "mine"
          ? "var(--color-sonar-green)"
          : "var(--color-sonar-coral)";
  const label =
    turn === "over"
      ? "Turn clock stopped"
      : `${turn === "mine" ? "Your" : `${opponent}'s`} turn, ${left} seconds left`;

  return (
    <div
      className={cn(
        "relative size-[4.75rem] shrink-0 sm:size-28 lg:size-32",
        urgent && turn === "mine" && "battle-urgent",
      )}
      role="timer"
      aria-label={label}
    >
      <svg
        viewBox="0 0 100 100"
        className="size-full -rotate-90 overflow-visible"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="rgb(3 13 34 / 0.9)"
          stroke="rgb(255 255 255 / 0.08)"
          strokeWidth="9"
        />
        {TICKS.map((tick, i) => (
          <line key={i} {...tick} stroke="rgb(216 251 232 / 0.25)" strokeWidth="1" />
        ))}
        <circle
          className="transition-[stroke-dashoffset,stroke] duration-300 ease-linear"
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - left / TURN_SECONDS)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center" aria-hidden="true">
        <div>
          <div className="font-display text-2xl leading-none sm:text-4xl" style={{ color }}>
            {turn === "over" ? "--" : left}
          </div>
          <div className="hud-label !text-[0.55rem]">sec</div>
        </div>
      </div>
    </div>
  );
}
