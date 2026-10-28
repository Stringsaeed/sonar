import { FLEET, placementCells, type Fleet, type ShipKind } from "@sonar/game";
import { Check, Hand } from "lucide-react";
import type { PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { cellName, placementOf, shipName, type Held } from "./fleet";

export function ShipTray({
  fleet,
  held,
  locked,
  onSelect,
  onGrab,
}: {
  fleet: Fleet;
  held: Held | undefined;
  locked: boolean;
  onSelect: (kind: ShipKind) => void;
  onGrab: (event: PointerEvent, held: Held) => void;
}) {
  return (
    <section aria-labelledby="ship-tray-title" className="hud-panel p-3 sm:p-4">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 id="ship-tray-title" className="hud-label">
          Your fleet
        </h2>
        <span className="hud-label">
          <span className="text-sonar-green">{fleet.length}</span>/{FLEET.length} deployed
        </span>
      </div>
      <ul className="mt-2.5 grid gap-1.5">
        {FLEET.map(({ kind, length }, i) => {
          const placed = placementOf(fleet, kind);
          const selected = held?.kind === kind;
          const where = placed
            ? `placed ${cellName(placed.origin)} to ${cellName(placementCells(placed).at(-1)!)}`
            : "not placed";
          return (
            <li key={kind}>
              <button
                type="button"
                disabled={locked}
                aria-pressed={selected}
                aria-label={`${shipName(kind)}, ${length} cells, ${where}`}
                onClick={() => onSelect(kind)}
                onPointerDown={(event) => onGrab(event, { kind, offset: 0 })}
                className={cn(
                  "flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-2xl border-2 px-3 py-2 text-left transition-[background-color,border-color,box-shadow] select-none",
                  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default",
                  selected
                    ? "border-sonar-cyan bg-sonar-cyan/10 shadow-[0_0_18px_rgb(127_233_255/0.3)]"
                    : "border-white/8 bg-sonar-abyss/60 enabled:hover:border-sonar-green/40",
                  !locked && "cursor-grab active:cursor-grabbing",
                )}
              >
                <kbd
                  aria-hidden="true"
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-md border font-mono text-[0.65rem] font-extrabold max-sm:hidden",
                    selected
                      ? "border-sonar-cyan/60 text-sonar-cyan"
                      : "border-white/15 text-sonar-ink/55",
                  )}
                >
                  {i + 1}
                </kbd>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-display text-sm tracking-wide",
                    selected ? "text-sonar-cyan" : placed ? "text-sonar-ink" : "text-sonar-ink/70",
                  )}
                >
                  {shipName(kind)}
                </span>
                <span className="flex shrink-0 gap-[3px]" aria-hidden="true">
                  {Array.from({ length }, (_, cell) => (
                    <span
                      key={cell}
                      className={cn(
                        "h-2 w-3 rounded-[3px] border-[1.5px]",
                        placed
                          ? "border-sonar-green bg-sonar-green shadow-[0_0_6px_var(--color-sonar-green)]"
                          : selected
                            ? "border-sonar-cyan"
                            : "border-sonar-ink/30",
                      )}
                    />
                  ))}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-5 shrink-0 place-items-center",
                    selected ? "text-sonar-cyan" : "text-sonar-green",
                  )}
                >
                  {selected ? (
                    <Hand className="size-4" strokeWidth={2.5} />
                  ) : placed ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
