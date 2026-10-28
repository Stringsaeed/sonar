import { Schema } from "effect";
import { PlayerToken } from "./domain.ts";

export const MatchmakerClientMessage = Schema.Union([
  Schema.TaggedStruct("Enqueue", { token: PlayerToken }),
  Schema.TaggedStruct("Dequeue", {}),
]);
export type MatchmakerClientMessage = typeof MatchmakerClientMessage.Type;

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

export const MatchmakerServerMessage = Schema.Union([
  /** Live counts for everyone at the dock; `queued` is whether this connection is in the queue. */
  Schema.TaggedStruct("Presence", { online: Count, inQueue: Count, queued: Schema.Boolean }),
  /** Paired: connect to this room. */
  Schema.TaggedStruct("Matched", { room: Schema.String }),
]);
export type MatchmakerServerMessage = typeof MatchmakerServerMessage.Type;

export const MatchmakerClientMessageJson = Schema.fromJsonString(MatchmakerClientMessage);
export const MatchmakerServerMessageJson = Schema.fromJsonString(MatchmakerServerMessage);

export const QUICK_ROOM_PREFIX = "q-";
export const quickRoomName = (id: string) => `${QUICK_ROOM_PREFIX}${id}`;
export const isQuickRoom = (name: string) => name.startsWith(QUICK_ROOM_PREFIX);
