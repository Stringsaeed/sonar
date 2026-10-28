import { Effect, Random } from "effect";
import type { Coord, Fleet, Orientation, Placement, ShipKind } from "./domain.ts";
import { BOARD_SIZE, FLEET } from "./rules.ts";

export const SHIP_LENGTH = Object.fromEntries(
  FLEET.map((ship) => [ship.kind, ship.length]),
) as Record<ShipKind, number>;

export const sameCoord = (a: Coord, b: Coord) => a.x === b.x && a.y === b.y;

export const coordKey = ({ x, y }: Coord) => y * BOARD_SIZE + x;

export const ALL_COORDS: ReadonlyArray<Coord> = Array.from(
  { length: BOARD_SIZE * BOARD_SIZE },
  (_, i) => ({ x: i % BOARD_SIZE, y: Math.floor(i / BOARD_SIZE) }),
);

export const placementCells = ({ kind, origin, orientation }: Placement): ReadonlyArray<Coord> =>
  Array.from({ length: SHIP_LENGTH[kind] }, (_, i) =>
    orientation === "horizontal"
      ? { x: origin.x + i, y: origin.y }
      : { x: origin.x, y: origin.y + i },
  );

const inBounds = ({ x, y }: Coord) => x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;

export type FleetProblem = "duplicate-ship" | "out-of-bounds" | "overlap";

/** Checks a full or partial fleet: each ship at most once, on the board, no overlap. Touching is fine. */
export const fleetProblem = (fleet: Fleet): FleetProblem | undefined => {
  const kinds = new Set<ShipKind>();
  const occupied = new Set<number>();
  for (const placement of fleet) {
    if (kinds.has(placement.kind)) return "duplicate-ship";
    kinds.add(placement.kind);
    for (const cell of placementCells(placement)) {
      if (!inBounds(cell)) return "out-of-bounds";
      const key = coordKey(cell);
      if (occupied.has(key)) return "overlap";
      occupied.add(key);
    }
  }
  return undefined;
};

export const isCompleteFleet = (fleet: Fleet) =>
  fleet.length === FLEET.length && fleetProblem(fleet) === undefined;

export const shipAt = (fleet: Fleet, cell: Coord): Placement | undefined =>
  fleet.find((placement) => placementCells(placement).some((c) => sameCoord(c, cell)));

const ORIENTATIONS: ReadonlyArray<Orientation> = ["horizontal", "vertical"];

const legalPlacements = (fleet: Fleet, kind: ShipKind): Placement[] =>
  ORIENTATIONS.flatMap((orientation) =>
    ALL_COORDS.map((origin) => ({ kind, origin, orientation })).filter(
      (placement) => fleetProblem([...fleet, placement]) === undefined,
    ),
  );

const fillFrom = Effect.fnUntraced(function* (start: Fleet) {
  let fleet: Fleet = start;
  // Longest ships first: they have the fewest legal spots.
  for (const { kind } of FLEET) {
    if (fleet.some((placement) => placement.kind === kind)) continue;
    const options = legalPlacements(fleet, kind);
    if (options.length === 0) return undefined;
    const index = yield* Random.nextIntBetween(0, options.length, { halfOpen: true });
    fleet = [...fleet, options[index]!];
  }
  return fleet;
});

/**
 * Places whatever ships are missing from `draft` at random. If the draft leaves no room for the
 * rest (possible with a cramped manual layout), the draft is dropped and the whole fleet is random.
 */
export const completeFleet = Effect.fnUntraced(function* (draft: Fleet) {
  const kept = fleetProblem(draft) === undefined ? draft : [];
  return (yield* fillFrom(kept)) ?? (yield* fillFrom([]))!;
});

export const randomFleet = completeFleet([]);
