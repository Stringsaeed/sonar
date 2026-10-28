import {
  BOARD_SIZE,
  FLEET,
  placementCells,
  sameCoord,
  SHIP_LENGTH,
  type Coord,
  type Fleet,
  type Placement,
  type ShipKind,
  type Shot,
} from "@sonar/game";
import type { CSSProperties } from "react";

/** Whose move it is, from my side of the table. */
export type Turn = "mine" | "theirs" | "over";

export const COLUMNS = Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i));
export const ROWS = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1);

export const cellLabel = ({ x, y }: Coord) => `${COLUMNS[x]}${y + 1}`;
export const shipName = (kind: ShipKind) => kind.toUpperCase();

export const shotAt = (shots: ReadonlyArray<Shot>, cell: Coord) =>
  shots.find((shot) => sameCoord(shot.at, cell));

const hitsOn = (ship: Placement, shots: ReadonlyArray<Shot>) =>
  placementCells(ship).filter((cell) => shotAt(shots, cell)?.result === "hit").length;

export const isSunk = (ship: Placement, shots: ReadonlyArray<Shot>) =>
  hitsOn(ship, shots) === SHIP_LENGTH[ship.kind];

type GridArea = Pick<CSSProperties, "gridColumn" | "gridRow">;

/** Places a ship as one CSS grid item spanning its cells. */
export const shipArea = ({ origin, orientation, kind }: Placement): GridArea => {
  const span = `span ${SHIP_LENGTH[kind]}`;
  return orientation === "horizontal"
    ? { gridColumn: `${origin.x + 1} / ${span}`, gridRow: origin.y + 1 }
    : { gridColumn: origin.x + 1, gridRow: `${origin.y + 1} / ${span}` };
};

export const cellArea = ({ x, y }: Coord): GridArea => ({ gridColumn: x + 1, gridRow: y + 1 });

export interface ShipStatus {
  readonly kind: ShipKind;
  readonly length: number;
  readonly sunk: boolean;
  /** Undefined when the ship's position is still unknown to us. */
  readonly hits: number | undefined;
}

/**
 * Damage per ship class. `known` is every ship whose position we can see: the whole fleet for
 * mine (or theirs once the game is over), only the sunk ones for theirs during battle.
 */
export const fleetStatus = (
  known: Fleet,
  shots: ReadonlyArray<Shot>,
  complete: boolean,
): ReadonlyArray<ShipStatus> =>
  FLEET.map(({ kind, length }) => {
    const ship = known.find((placement) => placement.kind === kind);
    if (!ship) return { kind, length, sunk: false, hits: complete ? 0 : undefined };
    const hits = hitsOn(ship, shots);
    return { kind, length, sunk: hits === length, hits };
  });

export interface LogEntry {
  readonly shot: Shot;
  /** True when I fired it. */
  readonly mine: boolean;
}

/** Both sides' shots, oldest first. */
export const shotLog = (
  incoming: ReadonlyArray<Shot>,
  outgoing: ReadonlyArray<Shot>,
): ReadonlyArray<LogEntry> =>
  [
    ...incoming.map((shot) => ({ shot, mine: false })),
    ...outgoing.map((shot) => ({ shot, mine: true })),
  ].sort((a, b) => a.shot.firedAt - b.shot.firedAt);

/** One sentence for screen readers. */
export const describeShot = ({ shot, mine }: LogEntry, opponent: string) => {
  const cell = cellLabel(shot.at);
  if (shot.auto) {
    return `${mine ? "Your" : `${opponent}'s`} clock ran out. Auto miss at ${cell}.`;
  }
  const sunk = shot.sunk
    ? mine
      ? ` You sank their ${shot.sunk}.`
      : ` Your ${shot.sunk} is sunk.`
    : "";
  return `${mine ? "You" : opponent} fired at ${cell}: ${shot.result}.${sunk}`;
};
