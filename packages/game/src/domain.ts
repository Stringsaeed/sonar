import { Schema } from "effect";
import { BOARD_SIZE, FLEET, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "./rules.ts";

const BoardIndex = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: BOARD_SIZE - 1 }));

export const Coord = Schema.Struct({ x: BoardIndex, y: BoardIndex });
export type Coord = typeof Coord.Type;

export const Orientation = Schema.Literals(["horizontal", "vertical"]);
export type Orientation = typeof Orientation.Type;

export const ShipKind = Schema.Literals(FLEET.map((ship) => ship.kind));
export type ShipKind = typeof ShipKind.Type;

export const PlayerToken = Schema.String.check(Schema.isUUID()).pipe(Schema.brand("PlayerToken"));
export type PlayerToken = typeof PlayerToken.Type;

export const Callsign = Schema.String.check(Schema.isBetweenLength(1, 32));
export type Callsign = typeof Callsign.Type;

export const RoomCode = Schema.String.check(
  Schema.isPattern(new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`)),
).pipe(Schema.brand("RoomCode"));
export type RoomCode = typeof RoomCode.Type;

export const MatchMode = Schema.Literals(["quick", "private"]);
export type MatchMode = typeof MatchMode.Type;

export const EndReason = Schema.Literals(["sunk", "forfeit", "disconnect"]);
export type EndReason = typeof EndReason.Type;

/** Epoch milliseconds. */
export const Timestamp = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
export type Timestamp = typeof Timestamp.Type;

export const Seat = Schema.Literals([0, 1]);
export type Seat = typeof Seat.Type;

export const otherSeat = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

export const Placement = Schema.Struct({
  kind: ShipKind,
  origin: Coord,
  orientation: Orientation,
});
export type Placement = typeof Placement.Type;

/** Any subset of the fleet, at most one of each ship. Checked for overlap by `validateFleet`. */
export const Fleet = Schema.Array(Placement).check(Schema.isMaxLength(FLEET.length));
export type Fleet = typeof Fleet.Type;

export const ShotResult = Schema.Literals(["miss", "hit"]);
export type ShotResult = typeof ShotResult.Type;

export const Shot = Schema.Struct({
  at: Coord,
  by: Seat,
  result: ShotResult,
  sunk: Schema.optionalKey(ShipKind),
  /** Fired by the server because the turn clock ran out. */
  auto: Schema.Boolean,
  firedAt: Timestamp,
});
export type Shot = typeof Shot.Type;
