import type { ClientMessage, PhaseView, PlayerView } from "@sonar/game";
import type { RoomState } from "@/lib/room";

export type PhaseOf<Tag extends PhaseView["_tag"]> = Extract<PhaseView, { _tag: Tag }>;

/** What every phase screen gets: the full view, its own phase narrowed, and a way to act. */
export interface PhaseScreenProps<Tag extends PhaseView["_tag"]> {
  readonly view: PlayerView;
  readonly phase: PhaseOf<Tag>;
  readonly clockOffset: number;
  readonly rejection: RoomState["rejection"];
  readonly send: (message: ClientMessage) => void;
}
