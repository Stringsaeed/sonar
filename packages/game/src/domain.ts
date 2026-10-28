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
