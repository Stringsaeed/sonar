import { Schema } from "effect";
import { Callsign, PlayerToken } from "./domain.ts";

export const Hello = Schema.TaggedStruct("Hello", {
  token: PlayerToken,
  callsign: Callsign,
});

export const ClientMessage = Schema.Union([Hello]);
export type ClientMessage = typeof ClientMessage.Type;

export const Welcome = Schema.TaggedStruct("Welcome", {
  room: Schema.String,
  players: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 2 })),
});

export const Rejected = Schema.TaggedStruct("Rejected", {
  reason: Schema.Literals(["malformed", "room-full", "rate-limited"]),
});

export const ServerMessage = Schema.Union([Welcome, Rejected]);
export type ServerMessage = typeof ServerMessage.Type;

export const ClientMessageJson = Schema.fromJsonString(ClientMessage);
export const ServerMessageJson = Schema.fromJsonString(ServerMessage);
