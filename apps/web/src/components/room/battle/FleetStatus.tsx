import { Skull } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { shipName, type ShipStatus } from "./model";

/** One side's ships with a pip per hull section: hollow when unknown, coral when hit. */
export function FleetStatus({
  title,
  tone,
  ships,
}: {
  title: string;
  tone: "green" | "coral";
  ships: ReadonlyArray<ShipStatus>;
}) {
  const titleId = useId();
  const afloat = ships.filter((ship) => !ship.sunk).length;
  return (
    <div>
      <div className="mb-2 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <h3
          id={titleId}
          className={cn(
            "truncate font-display text-xs sm:text-sm",
            tone === "green" ? "text-sonar-green" : "text-sonar-coral",
          )}
        >
          {title}
        </h3>
        <span className="hud-label shrink-0 !text-[0.58rem]">
          {afloat}/{ships.length} afloat
        </span>
      </div>
      <ul className="space-y-1.5" aria-labelledby={titleId}>
        {ships.map((ship) => (
          <li
            key={ship.kind}
            className={cn(
              "flex items-center justify-between gap-2 text-[0.68rem] font-extrabold tracking-wider sm:text-xs",
              ship.sunk ? "text-sonar-coral" : "text-sonar-ink/85",
            )}
          >
            <span
              className={cn(
                "flex items-center gap-1.5 truncate",
                ship.sunk && "line-through decoration-2",
              )}
            >
              {ship.sunk && <Skull className="size-3 shrink-0" aria-hidden="true" />}
              {shipName(ship.kind)}
              <span className="sr-only">
                {ship.sunk
                  ? ", sunk"
                  : ship.hits
                    ? `, ${ship.hits} of ${ship.length} hit`
                    : ", afloat"}
              </span>
            </span>
            <span className="flex shrink-0 gap-[3px]" aria-hidden="true">
              {Array.from({ length: ship.length }, (_, i) => {
                const damaged = ship.sunk || (ship.hits !== undefined && i < ship.hits);
                return (
                  <span
                    key={i}
                    className={cn(
                      "h-2 w-3 rounded-[3px] border-[1.5px] border-current",
                      damaged
                        ? "bg-current text-sonar-coral shadow-[0_0_6px_currentColor]"
                        : ship.hits === undefined
                          ? "text-sonar-ink/30"
                          : "bg-current text-sonar-green shadow-[0_0_6px_currentColor]",
                    )}
                  />
                );
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
