import {
  ALL_COORDS,
  BOARD_SIZE,
  coordKey,
  sameCoord,
  shipAt,
  type Coord,
  type Fleet,
  type Shot,
} from "@sonar/game";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Explosion, Ping } from "./effects";
import { ShipSprite } from "../ShipSprite";
import { cellArea, cellLabel, COLUMNS, isSunk, ROWS, shipArea, shotAt, type Turn } from "./model";
import { SinkStamp } from "./SinkStamp";
import type { Arrival } from "./useArrivals";

const STEPS: Record<string, Coord> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const clamp = (n: number) => Math.min(BOARD_SIZE - 1, Math.max(0, n));

/** Where roving focus goes for a key, or undefined if the key isn't a grid move. */
const moveFocus = (from: Coord, event: KeyboardEvent): Coord | undefined => {
  const step = STEPS[event.key];
  if (step) return { x: clamp(from.x + step.x), y: clamp(from.y + step.y) };
  const corner = event.ctrlKey || event.metaKey;
  if (event.key === "Home") return corner ? { x: 0, y: 0 } : { x: 0, y: from.y };
  if (event.key === "End") {
    return corner ? { x: BOARD_SIZE - 1, y: BOARD_SIZE - 1 } : { x: BOARD_SIZE - 1, y: from.y };
  }
  return undefined;
};

function AxisLabel({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "grid place-items-center font-display text-[0.7rem] transition-colors sm:text-sm",
        active ? "text-sonar-green" : "text-sonar-green/45",
      )}
    >
      {children}
    </span>
  );
}

/** The enemy's waters as the main radar screen. Each cell is a button you fire with. */
export function EnemyBoard({
  opponent,
  outgoing,
  known,
  turn,
  armed,
  firing,
  arrival,
  sink,
  onFire,
}: {
  opponent: string;
  outgoing: ReadonlyArray<Shot>;
  /** Enemy ships whose position we know: the sunk ones in battle, all of them once it's over. */
  known: Fleet;
  turn: Turn;
  /** Whether a click right now would fire. */
  armed: boolean;
  /** The cell we've fired at and are waiting on the server for. */
  firing: Coord | undefined;
  /** My latest shot to land while watching. */
  arrival: Arrival | undefined;
  sink: Arrival | undefined;
  onFire: (at: Coord) => void;
}) {
  const hintId = useId();
  const [focus, setFocus] = useState<Coord>({ x: 4, y: 4 });
  const cells = useRef<Array<HTMLButtonElement | null>>([]);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reducedMotion = useReducedMotion();

  // Kick the whole screen on a fresh hit.
  useEffect(() => {
    if (reducedMotion || arrival?.shot.result !== "hit" || !scope.current) return;
    void animate(
      scope.current,
      { x: [0, -9, 8, -6, 4, 0], rotate: [0, -0.6, 0.5, 0] },
      { duration: 0.42 },
    );
  }, [arrival, animate, scope, reducedMotion]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey) return;
    const next = moveFocus(focus, event);
    if (!next) return;
    event.preventDefault();
    setFocus(next);
    cells.current[coordKey(next)]?.focus();
  };

  return (
    <div ref={scope} className="relative">
      <div className="battle-screen" data-turn={turn}>
        <div className="grid grid-cols-[1.4rem_1fr] grid-rows-[1.4rem_1fr] gap-1 sm:grid-cols-[1.8rem_1fr] sm:grid-rows-[1.8rem_1fr]">
          <span aria-hidden="true" />
          <div className="grid grid-cols-10" aria-hidden="true">
            {COLUMNS.map((column, x) => (
              <AxisLabel key={column} active={x === focus.x}>
                {column}
              </AxisLabel>
            ))}
          </div>
          <div className="grid grid-rows-10" aria-hidden="true">
            {ROWS.map((row, y) => (
              <AxisLabel key={row} active={y === focus.y}>
                {row}
              </AxisLabel>
            ))}
          </div>

          <div
            className="battle-grid group relative grid aspect-square grid-cols-10 grid-rows-10 overflow-hidden rounded-[10px]"
            data-armed={armed}
            role="group"
            aria-label={`${opponent}'s waters`}
            aria-describedby={hintId}
            onKeyDown={onKeyDown}
          >
            <span id={hintId} className="sr-only">
              Arrow keys to aim, Home and End to jump along a row, Enter to fire.
            </span>
            <span
              className="battle-grid-rings pointer-events-none absolute inset-0 z-[1]"
              aria-hidden="true"
            />
            <span className="battle-grid-sweep z-[3]" aria-hidden="true" />

            {known.map((ship) =>
              isSunk(ship, outgoing) ? (
                <motion.span
                  key={ship.kind}
                  className="relative z-[2] p-[2px] sm:p-[3px]"
                  style={shipArea(ship)}
                  initial={{ opacity: 0, scale: 1.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  aria-hidden="true"
                >
                  <ShipSprite kind={ship.kind} orientation={ship.orientation} tone="sunk" />
                </motion.span>
              ) : (
                // Only reachable once the game is over: a survivor revealed where it hid.
                <motion.span
                  key={ship.kind}
                  className="relative z-[2] p-[2px] sm:p-[3px]"
                  style={shipArea(ship)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  aria-hidden="true"
                >
                  <ShipSprite kind={ship.kind} orientation={ship.orientation} tone="revealed" />
                </motion.span>
              ),
            )}

            {ALL_COORDS.map((cell) => {
              const shot = shotAt(outgoing, cell);
              const ship = shipAt(known, cell);
              const pending = firing !== undefined && sameCoord(firing, cell);
              const fresh = arrival !== undefined && sameCoord(arrival.shot.at, cell);
              const blocked = !armed || shot !== undefined;
              const status = shot ? shot.result : pending ? "firing" : "not fired";
              const shipNote = ship ? `, ${ship.kind}${isSunk(ship, outgoing) ? " sunk" : ""}` : "";
              return (
                <button
                  key={coordKey(cell)}
                  ref={(el) => {
                    cells.current[coordKey(cell)] = el;
                  }}
                  type="button"
                  style={cellArea(cell)}
                  tabIndex={sameCoord(focus, cell) ? 0 : -1}
                  aria-label={`${cellLabel(cell)}, ${status}${shipNote}`}
                  aria-disabled={blocked}
                  data-state={shot ? shot.result : pending ? "pending" : "open"}
                  className={cn(
                    "relative z-[4] grid cursor-crosshair place-items-center outline-none aria-disabled:cursor-default",
                    "before:pointer-events-none before:absolute before:inset-[22%] before:rounded-full before:border-2 before:border-sonar-green before:opacity-0 before:shadow-[0_0_10px_var(--color-sonar-green)]",
                    "group-data-[armed=true]:data-[state=open]:hover:bg-sonar-green/15 group-data-[armed=true]:data-[state=open]:hover:shadow-[inset_0_0_0_2px_rgb(57_255_136/0.7)] group-data-[armed=true]:data-[state=open]:hover:before:opacity-100",
                    "focus-visible:z-[6] focus-visible:bg-sonar-green/20 focus-visible:shadow-[inset_0_0_0_3px_#fff,0_0_18px_rgb(57_255_136/0.8)] group-data-[armed=true]:data-[state=open]:focus-visible:before:opacity-100",
                  )}
                  onFocus={() => setFocus(cell)}
                  onClick={() => {
                    setFocus(cell);
                    if (!blocked) onFire(cell);
                  }}
                >
                  {shot?.result === "hit" && (
                    <span className="battle-hit aspect-square w-[58%] rounded-full" />
                  )}
                  {shot?.result === "miss" && (
                    <span className="aspect-square w-[26%] rounded-full border-2 border-sonar-cyan/70 shadow-[0_0_8px_rgb(127_233_255/0.4)]" />
                  )}
                  {pending && (
                    <span className="absolute inset-[18%] animate-pulse rounded-full border-2 border-dashed border-sonar-amber shadow-[0_0_12px_rgb(255_201_74/0.7)]" />
                  )}
                  {fresh && <Ping key={arrival.id} hit={arrival.shot.result === "hit"} />}
                  {fresh && arrival.shot.result === "hit" && <Explosion key={`x${arrival.id}`} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <SinkStamp sink={sink} />
    </div>
  );
}
