import { Schema } from "effect";
import { placementCells, sameCoord } from "./board.ts";
import {
  Callsign,
  EndReason,
  Fleet,
  MatchMode,
  otherSeat,
  Seat,
  Shot,
  Timestamp,
} from "./domain.ts";
import type { Match } from "./match.ts";

/**
 * What one player is allowed to see. The opponent's fleet never appears here until a ship is
 * sunk (only that ship) or the game is over (all of it).
 */
const Opponent = Schema.Struct({
  callsign: Callsign,
  connected: Schema.Boolean,
  graceUntil: Schema.optionalKey(Timestamp),
});

const Board = {
  myFleet: Fleet,
  /** Shots the opponent fired at me. */
  incoming: Schema.Array(Shot),
  /** Shots I fired at the opponent. */
  outgoing: Schema.Array(Shot),
};

export const PhaseView = Schema.Union([
  Schema.TaggedStruct("Waiting", { expiresAt: Timestamp }),
  Schema.TaggedStruct("Placing", {
    myDraft: Fleet,
    myReady: Schema.Boolean,
    opponentReady: Schema.Boolean,
    deadline: Timestamp,
  }),
  Schema.TaggedStruct("Battle", {
    ...Board,
    /** Opponent ships I've sunk, revealed. */
    enemySunk: Fleet,
    myTurn: Schema.Boolean,
    deadline: Timestamp,
  }),
  Schema.TaggedStruct("Over", {
    ...Board,
    enemyFleet: Fleet,
    won: Schema.Boolean,
    reason: EndReason,
    rematch: Schema.Struct({ me: Schema.Boolean, opponent: Schema.Boolean }),
  }),
  Schema.TaggedStruct("Closed", {}),
]);
export type PhaseView = typeof PhaseView.Type;

export const PlayerView = Schema.Struct({
  room: Schema.String,
  mode: MatchMode,
  round: Schema.Int,
  /** Lets the client correct for clock skew when counting down to deadlines. */
  serverNow: Timestamp,
  me: Schema.Struct({ seat: Seat, callsign: Callsign }),
  opponent: Schema.NullOr(Opponent),
  phase: PhaseView,
});
export type PlayerView = typeof PlayerView.Type;

const sunkShips = (fleet: Fleet, incoming: ReadonlyArray<Shot>) =>
  fleet.filter((ship) =>
    placementCells(ship).every((cell) =>
      incoming.some((shot) => shot.result === "hit" && sameCoord(shot.at, cell)),
    ),
  );

const projectPhase = (match: Match, seat: Seat): PhaseView => {
  const phase = match.phase;
  const them = otherSeat(seat);
  switch (phase._tag) {
    case "Waiting":
    case "Closed":
      return phase;
    case "Placing":
      return {
        _tag: "Placing",
        myDraft: phase.drafts[seat],
        myReady: phase.ready[seat],
        opponentReady: phase.ready[them],
        deadline: phase.deadline,
      };
    case "Battle": {
      const outgoing = phase.shots.filter((shot) => shot.by === seat);
      return {
        _tag: "Battle",
        myFleet: phase.fleets[seat],
        incoming: phase.shots.filter((shot) => shot.by === them),
        outgoing,
        enemySunk: sunkShips(phase.fleets[them], outgoing),
        myTurn: phase.turn === seat,
        deadline: phase.deadline,
      };
    }
    case "Over":
      return {
        _tag: "Over",
        myFleet: phase.fleets[seat],
        incoming: phase.shots.filter((shot) => shot.by === them),
        outgoing: phase.shots.filter((shot) => shot.by === seat),
        enemyFleet: phase.fleets[them],
        won: phase.winner === seat,
        reason: phase.reason,
        rematch: { me: phase.rematch[seat], opponent: phase.rematch[them] },
      };
  }
};

export const viewFor = (match: Match, seat: Seat, room: string, now: number): PlayerView => {
  const me = match.players[seat];
  const opponent = match.players[otherSeat(seat)];
  return {
    room,
    mode: match.mode,
    round: match.round,
    serverNow: now,
    me: { seat, callsign: me?.callsign ?? "" },
    opponent: opponent
      ? {
          callsign: opponent.callsign,
          connected: opponent.connected,
          ...(opponent.graceUntil === undefined ? {} : { graceUntil: opponent.graceUntil }),
        }
      : null,
    phase: projectPhase(match, seat),
  };
};
