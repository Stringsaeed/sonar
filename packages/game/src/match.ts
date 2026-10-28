import { Clock, Duration, Effect, Random, Schema } from "effect";
import {
  ALL_COORDS,
  completeFleet,
  fleetProblem,
  isCompleteFleet,
  placementCells,
  sameCoord,
  shipAt,
} from "./board.ts";
import {
  Callsign,
  Coord,
  EndReason,
  Fleet,
  MatchMode,
  otherSeat,
  PlayerToken,
  Seat,
  Shot,
  Timestamp,
} from "./domain.ts";
import { CLOCKS } from "./rules.ts";

// ---------------------------------------------------------------------------------------------
// State. This is also the shape the Room persists, so every part of it is a Schema.
// ---------------------------------------------------------------------------------------------

export const Player = Schema.Struct({
  token: PlayerToken,
  callsign: Callsign,
  connected: Schema.Boolean,
  /** Set while disconnected: when the reconnect window closes. */
  graceUntil: Schema.optionalKey(Timestamp),
});
export type Player = typeof Player.Type;

const Pair = <S extends Schema.Top>(schema: S) => Schema.Tuple([schema, schema]);

export const Waiting = Schema.TaggedStruct("Waiting", { expiresAt: Timestamp });

export const Placing = Schema.TaggedStruct("Placing", {
  drafts: Pair(Fleet),
  ready: Pair(Schema.Boolean),
  deadline: Timestamp,
  startedAt: Timestamp,
});

export const Battle = Schema.TaggedStruct("Battle", {
  fleets: Pair(Fleet),
  shots: Schema.Array(Shot),
  turn: Seat,
  deadline: Timestamp,
  startedAt: Timestamp,
});

export const Over = Schema.TaggedStruct("Over", {
  fleets: Pair(Fleet),
  shots: Schema.Array(Shot),
  winner: Seat,
  reason: EndReason,
  startedAt: Timestamp,
  endedAt: Timestamp,
  rematch: Pair(Schema.Boolean),
});

export const Closed = Schema.TaggedStruct("Closed", {});

export const Phase = Schema.Union([Waiting, Placing, Battle, Over, Closed]);
export type Phase = typeof Phase.Type;

export const Match = Schema.Struct({
  mode: MatchMode,
  /** Increments on every rematch, so each game in a room is a distinct match. */
  round: Schema.Int,
  players: Pair(Schema.NullOr(Player)),
  phase: Phase,
});
export type Match = typeof Match.Type;

type Pair<A> = readonly [A, A];
type PhaseOf<Tag extends Phase["_tag"]> = Extract<Phase, { _tag: Tag }>;

// ---------------------------------------------------------------------------------------------
// Actions and outcomes
// ---------------------------------------------------------------------------------------------

export type Action =
  | { readonly _tag: "Join"; readonly token: PlayerToken; readonly callsign: Callsign }
  | { readonly _tag: "Disconnect"; readonly token: PlayerToken }
  | { readonly _tag: "Draft"; readonly seat: Seat; readonly fleet: Fleet }
  | { readonly _tag: "Ready"; readonly seat: Seat; readonly fleet: Fleet }
  | { readonly _tag: "Fire"; readonly seat: Seat; readonly at: Coord }
  | { readonly _tag: "Forfeit"; readonly seat: Seat }
  | { readonly _tag: "Leave"; readonly seat: Seat }
  | { readonly _tag: "Rematch"; readonly seat: Seat }
  /** A deadline may have passed: lobby expiry, placement or turn clock, or a reconnect window. */
  | { readonly _tag: "Tick" };

export const RejectionReason = Schema.Literals([
  "room-full",
  "room-closed",
  "wrong-phase",
  "not-your-turn",
  "already-fired",
  "invalid-fleet",
]);
export type RejectionReason = typeof RejectionReason.Type;

export class Rejection extends Schema.TaggedError<Rejection>()("Rejection", {
  reason: RejectionReason,
}) {}

const reject = (reason: RejectionReason) => Effect.fail(new Rejection({ reason }));

export interface MatchResult {
  readonly mode: MatchMode;
  readonly round: number;
  readonly winner: Seat;
  readonly reason: EndReason;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly players: Pair<{
    readonly token: PlayerToken;
    readonly callsign: Callsign;
    readonly shotsFired: number;
    readonly shipsSunk: number;
  }>;
}

export interface Transition {
  readonly match: Match;
  /** Present when this step finished a game: the record to persist. */
  readonly ended?: MatchResult;
  /** Seat that joined or rejoined in this step. */
  readonly seated?: Seat;
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const ms = Duration.toMillis;

const setPair = <A>(pair: Pair<A>, seat: Seat, value: A): Pair<A> =>
  seat === 0 ? [value, pair[1]] : [pair[0], value];

const seatOf = (match: Match, token: PlayerToken): Seat | undefined => {
  if (match.players[0]?.token === token) return 0;
  if (match.players[1]?.token === token) return 1;
  return undefined;
};

const shotsBy = (shots: ReadonlyArray<Shot>, seat: Seat) =>
  shots.filter((shot) => shot.by === seat);

const allSunk = (fleet: Fleet, incoming: ReadonlyArray<Shot>) =>
  fleet.every((ship) =>
    placementCells(ship).every((cell) =>
      incoming.some((shot) => shot.result === "hit" && sameCoord(shot.at, cell)),
    ),
  );

export const newMatch = Effect.fnUntraced(function* (mode: MatchMode) {
  const now = yield* Clock.currentTimeMillis;
  return {
    mode,
    round: 1,
    players: [null, null],
    phase: {
      _tag: "Waiting",
      expiresAt: now + ms(mode === "quick" ? CLOCKS.quickLobbyExpiry : CLOCKS.lobbyExpiry),
    },
  } satisfies Match as Match;
});

const startPlacing = (match: Match, now: number): Match => ({
  ...match,
  phase: {
    _tag: "Placing",
    drafts: [[], []],
    ready: [false, false],
    deadline: now + ms(CLOCKS.placement),
    startedAt: now,
  },
});

const startBattle = Effect.fnUntraced(function* (
  match: Match,
  placing: PhaseOf<"Placing">,
  now: number,
) {
  const fleets: Pair<Fleet> = [
    yield* completeFleet(placing.drafts[0]),
    yield* completeFleet(placing.drafts[1]),
  ];
  const turn: Seat = (yield* Random.nextBoolean) ? 0 : 1;
  return {
    ...match,
    phase: {
      _tag: "Battle",
      fleets,
      shots: [],
      turn,
      deadline: now + ms(CLOCKS.turn),
      startedAt: placing.startedAt,
    },
  } satisfies Match as Match;
});

const finish = (
  match: Match,
  fleets: Pair<Fleet>,
  shots: ReadonlyArray<Shot>,
  startedAt: number,
  winner: Seat,
  reason: EndReason,
  now: number,
): Transition => {
  const [a, b] = match.players;
  const sunkBy = (seat: Seat) => shotsBy(shots, seat).filter((shot) => shot.sunk).length;
  const ended: MatchResult | undefined =
    a && b
      ? {
          mode: match.mode,
          round: match.round,
          winner,
          reason,
          startedAt,
          endedAt: now,
          players: [
            {
              token: a.token,
              callsign: a.callsign,
              shotsFired: shotsBy(shots, 0).length,
              shipsSunk: sunkBy(0),
            },
            {
              token: b.token,
              callsign: b.callsign,
              shotsFired: shotsBy(shots, 1).length,
              shipsSunk: sunkBy(1),
            },
          ],
        }
      : undefined;
  return {
    match: {
      ...match,
      phase: {
        _tag: "Over",
        fleets,
        shots,
        winner,
        reason,
        startedAt,
        endedAt: now,
        rematch: [false, false],
      },
    },
    ...(ended ? { ended } : {}),
  };
};

const fire = (
  match: Match,
  battle: PhaseOf<"Battle">,
  seat: Seat,
  at: Coord,
  auto: boolean,
  now: number,
): Transition => {
  const target = otherSeat(seat);
  const targetFleet = battle.fleets[target];
  const ship = shipAt(targetFleet, at);
  const previous = shotsBy(battle.shots, seat);
  const sunk =
    ship &&
    placementCells(ship).every(
      (cell) =>
        sameCoord(cell, at) ||
        previous.some((shot) => shot.result === "hit" && sameCoord(shot.at, cell)),
    );
  const shot: Shot = {
    at,
    by: seat,
    result: ship ? "hit" : "miss",
    ...(sunk ? { sunk: ship.kind } : {}),
    auto,
    firedAt: now,
  };
  const shots = [...battle.shots, shot];
  if (allSunk(targetFleet, shotsBy(shots, seat))) {
    return finish(match, battle.fleets, shots, battle.startedAt, seat, "sunk", now);
  }
  return {
    match: {
      ...match,
      phase: { ...battle, shots, turn: target, deadline: now + ms(CLOCKS.turn) },
    },
  };
};

/** The turn clock ran out: fire at a random untouched cell of open water, so it's always a miss. */
const autoMiss = Effect.fnUntraced(function* (
  match: Match,
  battle: PhaseOf<"Battle">,
  now: number,
) {
  const seat = battle.turn;
  const fired = shotsBy(battle.shots, seat);
  const untouched = ALL_COORDS.filter((cell) => !fired.some((shot) => sameCoord(shot.at, cell)));
  const water = untouched.filter((cell) => !shipAt(battle.fleets[otherSeat(seat)], cell));
  const pool = water.length > 0 ? water : untouched;
  const at = pool[yield* Random.nextIntBetween(0, pool.length, { halfOpen: true })]!;
  return fire(match, battle, seat, at, true, now);
});

const forfeit = (match: Match, loser: Seat, reason: EndReason, now: number): Transition => {
  const phase = match.phase;
  if (phase._tag === "Battle") {
    return finish(match, phase.fleets, phase.shots, phase.startedAt, otherSeat(loser), reason, now);
  }
  if (phase._tag === "Placing") {
    return finish(match, phase.drafts, [], phase.startedAt, otherSeat(loser), reason, now);
  }
  return { match };
};

const closed = (match: Match): Transition => ({ match: { ...match, phase: { _tag: "Closed" } } });

/** The first seat whose reconnect window has run out, if any. */
const lapsedSeat = (match: Match, now: number): Seat | undefined => {
  const lapsed = (seat: Seat) => {
    const player = match.players[seat];
    return player?.graceUntil !== undefined && player.graceUntil <= now;
  };
  if (lapsed(0)) return 0;
  if (lapsed(1)) return 1;
  return undefined;
};

/** The earliest moment something in this match happens on its own. Undefined once closed. */
export const nextDeadline = (match: Match): number | undefined => {
  const phase = match.phase;
  const candidates = match.players.flatMap((player) =>
    player?.graceUntil === undefined ? [] : [player.graceUntil],
  );
  switch (phase._tag) {
    case "Waiting":
      candidates.push(phase.expiresAt);
      break;
    case "Placing":
    case "Battle":
      candidates.push(phase.deadline);
      break;
    case "Over":
      break;
    case "Closed":
      return undefined;
  }
  return candidates.length > 0 ? Math.min(...candidates) : undefined;
};

// ---------------------------------------------------------------------------------------------
// The reducer
// ---------------------------------------------------------------------------------------------

const tick = Effect.fnUntraced(function* (match: Match, now: number) {
  const phase = match.phase;
  const lapsed = lapsedSeat(match, now);
  switch (phase._tag) {
    case "Waiting":
      return phase.expiresAt <= now || lapsed !== undefined ? closed(match) : { match };
    case "Placing":
      if (lapsed !== undefined) return forfeit(match, lapsed, "disconnect", now);
      if (phase.deadline <= now) return { match: yield* startBattle(match, phase, now) };
      return { match };
    case "Battle":
      if (lapsed !== undefined) return forfeit(match, lapsed, "disconnect", now);
      if (phase.deadline <= now) return yield* autoMiss(match, phase, now);
      return { match };
    case "Over":
      // Someone walked away from the result screen: the pairing is over.
      return lapsed !== undefined ? closed(match) : { match };
    case "Closed":
      return { match };
  }
});

export const step = Effect.fnUntraced(function* (
  match: Match,
  action: Action,
): Effect.fn.Return<Transition, Rejection> {
  const now = yield* Clock.currentTimeMillis;
  const phase = match.phase;

  if (action._tag === "Tick") return yield* tick(match, now);
  if (phase._tag === "Closed") return yield* reject("room-closed");

  switch (action._tag) {
    case "Join": {
      const existing = seatOf(match, action.token);
      if (existing !== undefined) {
        const player = match.players[existing]!;
        const { graceUntil: _, ...rest } = player;
        return {
          match: {
            ...match,
            players: setPair(match.players, existing, { ...rest, connected: true }),
          },
          seated: existing,
        };
      }
      if (phase._tag !== "Waiting") return yield* reject("room-full");
      const seat: Seat | undefined =
        match.players[0] === null ? 0 : match.players[1] === null ? 1 : undefined;
      if (seat === undefined) return yield* reject("room-full");
      const players = setPair(match.players, seat, {
        token: action.token,
        callsign: action.callsign,
        connected: true,
      });
      const joined = { ...match, players };
      return {
        match: players[0] && players[1] ? startPlacing(joined, now) : joined,
        seated: seat,
      };
    }

    case "Disconnect": {
      const seat = seatOf(match, action.token);
      if (seat === undefined) return { match };
      const player = match.players[seat]!;
      return {
        match: {
          ...match,
          players: setPair(match.players, seat, {
            ...player,
            connected: false,
            graceUntil: now + ms(CLOCKS.reconnect),
          }),
        },
      };
    }

    case "Draft":
    case "Ready": {
      if (phase._tag !== "Placing" || phase.ready[action.seat]) return yield* reject("wrong-phase");
      const valid =
        action._tag === "Ready"
          ? isCompleteFleet(action.fleet)
          : fleetProblem(action.fleet) === undefined;
      if (!valid) return yield* reject("invalid-fleet");
      const placing = {
        ...phase,
        drafts: setPair(phase.drafts, action.seat, action.fleet),
        ready: action._tag === "Ready" ? setPair(phase.ready, action.seat, true) : phase.ready,
      };
      if (placing.ready[0] && placing.ready[1]) {
        return { match: yield* startBattle(match, placing, now) };
      }
      return { match: { ...match, phase: placing } };
    }

    case "Fire": {
      if (phase._tag !== "Battle") return yield* reject("wrong-phase");
      if (phase.turn !== action.seat) return yield* reject("not-your-turn");
      if (shotsBy(phase.shots, action.seat).some((shot) => sameCoord(shot.at, action.at))) {
        return yield* reject("already-fired");
      }
      return fire(match, phase, action.seat, action.at, false, now);
    }

    case "Forfeit": {
      if (phase._tag !== "Placing" && phase._tag !== "Battle") return yield* reject("wrong-phase");
      return forfeit(match, action.seat, "forfeit", now);
    }

    case "Leave": {
      if (phase._tag === "Placing" || phase._tag === "Battle") {
        return forfeit(match, action.seat, "forfeit", now);
      }
      // Leaving the lobby or the result screen ends the room for both players.
      return closed(match);
    }

    case "Rematch": {
      if (phase._tag !== "Over") return yield* reject("wrong-phase");
      const rematch = setPair(phase.rematch, action.seat, true);
      if (rematch[0] && rematch[1]) {
        return { match: startPlacing({ ...match, round: match.round + 1 }, now) };
      }
      return { match: { ...match, phase: { ...phase, rematch } } };
    }
  }
});
