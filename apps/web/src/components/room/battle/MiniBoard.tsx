import { coordKey, sameCoord, type Fleet, type Shot } from "@sonar/game";
import { Ping } from "./effects";
import { ShipSprite } from "../ShipSprite";
import { cellArea, isSunk, shipArea } from "./model";
import type { Arrival } from "./useArrivals";

/** My own waters, small: where my ships sit and where the enemy has fired. */
export function MiniBoard({
  fleet,
  incoming,
  arrival,
}: {
  fleet: Fleet;
  incoming: ReadonlyArray<Shot>;
  /** Their latest shot to land while watching. */
  arrival: Arrival | undefined;
}) {
  const hits = incoming.filter((shot) => shot.result === "hit").length;
  const lost = fleet.filter((ship) => isSunk(ship, incoming)).length;

  return (
    <div
      className="battle-mini grid aspect-square grid-cols-10 grid-rows-10 overflow-hidden rounded-lg"
      role="img"
      aria-label={`Your fleet: ${hits} ${hits === 1 ? "hit" : "hits"} taken, ${lost} of ${fleet.length} ships lost.`}
    >
      {fleet.map((ship) => (
        <span key={ship.kind} style={shipArea(ship)} className="p-px">
          <ShipSprite
            kind={ship.kind}
            orientation={ship.orientation}
            tone={isSunk(ship, incoming) ? "sunk" : "ship"}
            className="ship-sprite-compact"
          />
        </span>
      ))}
      {incoming.map((shot) => {
        const fresh = arrival !== undefined && sameCoord(arrival.shot.at, shot.at);
        return (
          <span
            key={coordKey(shot.at)}
            style={cellArea(shot.at)}
            className="relative z-[2] grid place-items-center"
          >
            {shot.result === "hit" ? (
              <span className="size-[62%] rounded-full bg-sonar-coral shadow-[0_0_8px_var(--color-sonar-coral)]" />
            ) : (
              <span className="size-[28%] rounded-full bg-sonar-cyan/60" />
            )}
            {fresh && <Ping key={arrival.id} hit={shot.result === "hit"} rings={2} />}
          </span>
        );
      })}
    </div>
  );
}
