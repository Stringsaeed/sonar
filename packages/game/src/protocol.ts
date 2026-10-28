import { Schema } from "effect";
import { Callsign, Coord, Fleet, PlayerToken } from "./domain.ts";
import { RejectionReason } from "./match.ts";
import { PlayerView } from "./view.ts";

export const ClientMessage = Schema.Union([
  /** First message on every connection; also how a dropped player reclaims their seat. */
  Schema.TaggedStruct("Hello", { token: PlayerToken, callsign: Callsign }),
  /** Placement in progress, so a placement timeout can keep what's already placed. */
  Schema.TaggedStruct("Draft", { fleet: Fleet }),
  /** Lock in a complete fleet. */
  Schema.TaggedStruct("Ready", { fleet: Fleet }),
  Schema.TaggedStruct("Fire", { at: Coord }),
  Schema.TaggedStruct("Forfeit", {}),
  Schema.TaggedStruct("Rematch", {}),
  /** Leave the room: forfeits a game in progress, or ends the pairing from the lobby or result. */
  Schema.TaggedStruct("Leave", {}),
]);
export type ClientMessage = typeof ClientMessage.Type;

export const ServerMessage = Schema.Union([
  Schema.TaggedStruct("View", { view: PlayerView }),
  Schema.TaggedStruct("Rejected", {
    reason: Schema.Union([
      RejectionReason,
      Schema.Literals(["malformed", "not-seated", "rate-limited"]),
    ]),
  }),
]);
export type ServerMessage = typeof ServerMessage.Type;

export const ClientMessageJson = Schema.fromJsonString(ClientMessage);
export const ServerMessageJson = Schema.fromJsonString(ServerMessage);
