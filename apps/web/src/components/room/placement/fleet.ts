import {
  BOARD_SIZE,
  FLEET,
  fleetProblem,
  placementCells,
  sameCoord,
  shipAt,
  type Coord,
  type Fleet,
  type Orientation,
  type Placement,
  type ShipKind,
} from "@sonar/game";

export const COLUMNS = Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i));
export const ROWS = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1);

export const CELLS: ReadonlyArray<Coord> = Array.from(
  { length: BOARD_SIZE * BOARD_SIZE },
  (_, i) => ({ x: i % BOARD_SIZE, y: Math.floor(i / BOARD_SIZE) }),
);

export const cellName = ({ x, y }: Coord) => `${COLUMNS[x]}${y + 1}`;

export const shipName = (kind: ShipKind) => kind.charAt(0).toUpperCase() + kind.slice(1);

export const inBounds = ({ x, y }: Coord) => x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;

/**
 * The ship in hand. `offset` is which of its cells the pointer or cursor is holding, so a ship
 * picked up by its stern moves (and rotates) around its stern rather than jumping to its bow.
 */
export interface Held {
  readonly kind: ShipKind;
  readonly offset: number;
}

export const heldAt = (held: Held, orientation: Orientation, anchor: Coord): Placement => ({
  kind: held.kind,
  orientation,
  origin:
    orientation === "horizontal"
      ? { x: anchor.x - held.offset, y: anchor.y }
      : { x: anchor.x, y: anchor.y - held.offset },
});

/** Grabs a placed ship by one of its cells. */
export const grab = (ship: Placement, cell: Coord): Held => ({
  kind: ship.kind,
  offset: Math.max(
    0,
    placementCells(ship).findIndex((c) => sameCoord(c, cell)),
  ),
});

export const placementOf = (fleet: Fleet, kind: ShipKind) => fleet.find((p) => p.kind === kind);

/** `fleet` with `placement` added or moved, kept in FLEET order so drafts are stable. */
export const withShip = (fleet: Fleet, placement: Placement): Fleet =>
  FLEET.flatMap(({ kind }) => {
    const ship = kind === placement.kind ? placement : placementOf(fleet, kind);
    return ship ? [ship] : [];
  });

export const nextUnplaced = (fleet: Fleet) =>
  FLEET.find(({ kind }) => !placementOf(fleet, kind))?.kind;

/** Why `placement` can't go into `fleet`, in words, or undefined when it fits. */
export const placementProblem = (fleet: Fleet, placement: Placement) => {
  const problem = fleetProblem(withShip(fleet, placement));
  if (problem === undefined) return undefined;
  const others = fleet.filter((p) => p.kind !== placement.kind);
  const blocker = placementCells(placement)
    .map((cell) => shipAt(others, cell))
    .find((ship) => ship !== undefined);
  if (problem === "overlap" && blocker) return `it would overlap your ${blocker.kind}`;
  return "it would run off the board";
};
