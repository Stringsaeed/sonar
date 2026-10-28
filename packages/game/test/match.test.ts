import { describe, expect, it } from "@effect/vitest";
import { Effect, Exit, Random, Schema } from "effect";
import { TestClock } from "effect/testing";
import {
  ALL_COORDS,
  type Action,
  type Coord,
  type Fleet,
  type Match,
  newMatch,
  nextDeadline,
  placementCells,
  type PlayerToken,
  randomFleet,
  type Seat,
  step,
  viewFor,
} from "../src/index.ts";

const ALICE = "6f1c1d2e-7a4b-4c1d-9e3f-0a1b2c3d4e5f" as PlayerToken;
const BOB = "0b7e6f5d-4c3b-4a29-8e17-f6e5d4c3b2a1" as PlayerToken;
const CAROL = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d" as PlayerToken;

// Ships stacked in rows 0-4, all starting at column 0.
const ROWS_FLEET: Fleet = [
  { kind: "carrier", origin: { x: 0, y: 0 }, orientation: "horizontal" },
  { kind: "battleship", origin: { x: 0, y: 1 }, orientation: "horizontal" },
  { kind: "cruiser", origin: { x: 0, y: 2 }, orientation: "horizontal" },
  { kind: "submarine", origin: { x: 0, y: 3 }, orientation: "horizontal" },
  { kind: "destroyer", origin: { x: 0, y: 4 }, orientation: "horizontal" },
];
const SHIP_CELLS = ROWS_FLEET.flatMap(placementCells);
const WATER: ReadonlyArray<Coord> = ALL_COORDS.filter((c) => c.y >= 5);

const apply = Effect.fnUntraced(function* (match: Match, ...actions: ReadonlyArray<Action>) {
  let current = match;
  for (const action of actions) current = (yield* step(current, action)).match;
  return current;
});

const seatedPair = Effect.gen(function* () {
  return yield* apply(
    yield* newMatch("private"),
    { _tag: "Join", token: ALICE, callsign: "Silent Kraken" },
    { _tag: "Join", token: BOB, callsign: "Brave Barnacle" },
  );
});

const inBattle = Effect.gen(function* () {
  return yield* apply(
    yield* seatedPair,
    { _tag: "Ready", seat: 0, fleet: ROWS_FLEET },
    { _tag: "Ready", seat: 1, fleet: ROWS_FLEET },
  );
});

const turnOf = (match: Match): Seat => {
  if (match.phase._tag !== "Battle") throw new Error(`expected Battle, got ${match.phase._tag}`);
  return match.phase.turn;
};

const rejection = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function* () {
    const exit = yield* Effect.exit(effect);
    return Exit.isFailure(exit) ? JSON.stringify(exit.cause) : "succeeded";
  });

describe("joining", () => {
  it.effect("two players fill the room and placement starts on its own", () =>
    Effect.gen(function* () {
      const match = yield* seatedPair;
      expect(match.phase._tag).toBe("Placing");
      expect(match.players.map((p) => p?.callsign)).toEqual(["Silent Kraken", "Brave Barnacle"]);
    }),
  );

  it.effect("a third player is turned away", () =>
    Effect.gen(function* () {
      const match = yield* seatedPair;
      const result = yield* rejection(
        step(match, { _tag: "Join", token: CAROL, callsign: "Ghost" }),
      );
      expect(result).toContain("room-full");
    }),
  );

  it.effect("the lobby closes if nobody joins in time", () =>
    Effect.gen(function* () {
      const lobby = yield* apply(yield* newMatch("private"), {
        _tag: "Join",
        token: ALICE,
        callsign: "Silent Kraken",
      });
      yield* TestClock.adjust("10 minutes");
      expect((yield* apply(lobby, { _tag: "Tick" })).phase._tag).toBe("Closed");
    }),
  );

  it.effect("the host leaving the lobby closes the room", () =>
    Effect.gen(function* () {
      const lobby = yield* apply(yield* newMatch("private"), {
        _tag: "Join",
        token: ALICE,
        callsign: "Silent Kraken",
      });
      expect((yield* apply(lobby, { _tag: "Leave", seat: 0 })).phase._tag).toBe("Closed");
    }),
  );
});

describe("placement", () => {
  it.effect("battle starts once both fleets are locked in", () =>
    Effect.gen(function* () {
      expect((yield* inBattle).phase._tag).toBe("Battle");
    }),
  );

  it.effect("an incomplete fleet can't be locked in", () =>
    Effect.gen(function* () {
      const result = yield* rejection(
        step(yield* seatedPair, { _tag: "Ready", seat: 0, fleet: ROWS_FLEET.slice(0, 4) }),
      );
      expect(result).toContain("invalid-fleet");
    }),
  );

  it.effect("when the placement clock runs out, unfinished fleets are completed at random", () =>
    Effect.gen(function* () {
      const drafted = yield* apply(
        yield* seatedPair,
        { _tag: "Draft", seat: 0, fleet: ROWS_FLEET.slice(0, 2) },
        { _tag: "Ready", seat: 1, fleet: ROWS_FLEET },
      );
      yield* TestClock.adjust("2 minutes");
      const match = yield* apply(drafted, { _tag: "Tick" });
      if (match.phase._tag !== "Battle") throw new Error("expected Battle");
      expect(match.phase.fleets[0]).toHaveLength(5);
      expect(match.phase.fleets[0].slice(0, 2)).toEqual(ROWS_FLEET.slice(0, 2));
    }),
  );
});

describe("battle", () => {
  it.effect("only the player whose turn it is may fire, once per cell", () =>
    Effect.gen(function* () {
      const match = yield* inBattle;
      const shooter = turnOf(match);
      const idle = shooter === 0 ? 1 : 0;
      expect(
        yield* rejection(step(match, { _tag: "Fire", seat: idle, at: { x: 9, y: 9 } })),
      ).toContain("not-your-turn");

      const fired = yield* apply(
        match,
        { _tag: "Fire", seat: shooter, at: { x: 9, y: 9 } },
        { _tag: "Fire", seat: idle, at: { x: 9, y: 9 } },
      );
      expect(
        yield* rejection(step(fired, { _tag: "Fire", seat: shooter, at: { x: 9, y: 9 } })),
      ).toContain("already-fired");
    }),
  );

  it.effect("sinking every ship wins, and the result is ready to record", () =>
    Effect.gen(function* () {
      let match = yield* inBattle;
      const winner = turnOf(match);
      const loser = winner === 0 ? 1 : 0;
      let ended;
      for (const [i, cell] of SHIP_CELLS.entries()) {
        const transition = yield* step(match, { _tag: "Fire", seat: winner, at: cell });
        match = transition.match;
        ended = transition.ended;
        if (match.phase._tag === "Over") break;
        match = yield* apply(match, { _tag: "Fire", seat: loser, at: WATER[i]! });
      }
      expect(match.phase._tag === "Over" && match.phase).toMatchObject({ winner, reason: "sunk" });
      expect(ended?.players[winner]).toMatchObject({ shotsFired: 17, shipsSunk: 5 });
      expect(ended?.players[loser]).toMatchObject({ shotsFired: 16, shipsSunk: 0 });
    }),
  );

  it.effect("a sunk ship is announced on the shot that finishes it", () =>
    Effect.gen(function* () {
      let match = yield* inBattle;
      const shooter = turnOf(match);
      const other = shooter === 0 ? 1 : 0;
      match = yield* apply(
        match,
        { _tag: "Fire", seat: shooter, at: { x: 0, y: 4 } },
        { _tag: "Fire", seat: other, at: { x: 9, y: 9 } },
        { _tag: "Fire", seat: shooter, at: { x: 1, y: 4 } },
      );
      if (match.phase._tag !== "Battle") throw new Error("expected Battle");
      const mine = match.phase.shots.filter((s) => s.by === shooter);
      expect(mine.map((s) => s.sunk)).toEqual([undefined, "destroyer"]);
    }),
  );

  it.effect("when the turn clock runs out, the shot is an automatic miss and the turn passes", () =>
    Effect.gen(function* () {
      const match = yield* inBattle;
      const shooter = turnOf(match);
      yield* TestClock.adjust("30 seconds");
      const after = yield* apply(match, { _tag: "Tick" });
      if (after.phase._tag !== "Battle") throw new Error("expected Battle");
      expect(after.phase.shots).toMatchObject([{ by: shooter, result: "miss", auto: true }]);
      expect(after.phase.turn).not.toBe(shooter);
    }),
  );

  it.effect("forfeiting hands the win to the opponent", () =>
    Effect.gen(function* () {
      const match = yield* apply(yield* inBattle, { _tag: "Forfeit", seat: 1 });
      expect(match.phase._tag === "Over" && match.phase).toMatchObject({
        winner: 0,
        reason: "forfeit",
      });
    }),
  );
});

describe("disconnects", () => {
  it.effect("a player who doesn't come back within a minute forfeits", () =>
    Effect.gen(function* () {
      const dropped = yield* apply(yield* inBattle, { _tag: "Disconnect", token: BOB });
      yield* TestClock.adjust("59 seconds");
      // The turn clock fires first; the match keeps going.
      let match = dropped;
      while ((nextDeadline(match) ?? Infinity) <= 59_000)
        match = yield* apply(match, { _tag: "Tick" });
      expect(match.phase._tag).toBe("Battle");
      yield* TestClock.adjust("1 second");
      match = yield* apply(match, { _tag: "Tick" });
      expect(match.phase._tag === "Over" && match.phase).toMatchObject({
        winner: 0,
        reason: "disconnect",
      });
    }),
  );

  it.effect("reconnecting in time clears the window", () =>
    Effect.gen(function* () {
      const match = yield* apply(
        yield* inBattle,
        { _tag: "Disconnect", token: BOB },
        { _tag: "Join", token: BOB, callsign: "Brave Barnacle" },
      );
      expect(match.players[1]).toEqual({ token: BOB, callsign: "Brave Barnacle", connected: true });
    }),
  );
});

describe("rematch", () => {
  it.effect("both players accepting starts a fresh placement in the same room", () =>
    Effect.gen(function* () {
      const match = yield* apply(
        yield* inBattle,
        { _tag: "Forfeit", seat: 0 },
        { _tag: "Rematch", seat: 0 },
        { _tag: "Rematch", seat: 1 },
      );
      expect(match.phase._tag).toBe("Placing");
      expect(match.round).toBe(2);
    }),
  );

  it.effect("leaving the result screen ends the pairing", () =>
    Effect.gen(function* () {
      const match = yield* apply(
        yield* inBattle,
        { _tag: "Forfeit", seat: 0 },
        { _tag: "Rematch", seat: 0 },
        { _tag: "Leave", seat: 1 },
      );
      expect(match.phase._tag).toBe("Closed");
    }),
  );
});

// Plays a whole game with both sides firing at random untouched cells.
const randomGame = Effect.gen(function* () {
  let match = yield* apply(
    yield* seatedPair,
    { _tag: "Ready", seat: 0, fleet: yield* randomFleet },
    { _tag: "Ready", seat: 1, fleet: yield* randomFleet },
  );
  const views: Array<ReturnType<typeof viewFor>> = [];
  for (let turn = 0; turn < 200 && match.phase._tag === "Battle"; turn++) {
    const { turn: seat, shots } = match.phase;
    const open = ALL_COORDS.filter(
      (c) => !shots.some((s) => s.by === seat && s.at.x === c.x && s.at.y === c.y),
    );
    const at = open[yield* Random.nextIntBetween(0, open.length, { halfOpen: true })]!;
    match = yield* apply(match, { _tag: "Fire", seat, at });
    views.push(viewFor(match, 0, "TEST", 0), viewFor(match, 1, "TEST", 0));
  }
  return { match, views };
});

describe("properties", () => {
  it.effect.prop("every game ends with a winner", [Schema.Int], ([seed]) =>
    Effect.gen(function* () {
      const { match } = yield* randomGame.pipe(Random.withSeed(seed));
      expect(match.phase._tag).toBe("Over");
    }),
  );

  it.effect.prop(
    "a player's view never reveals an enemy ship before it sinks",
    [Schema.Int],
    ([seed]) =>
      Effect.gen(function* () {
        const { views } = yield* randomGame.pipe(Random.withSeed(seed));
        for (const view of views) {
          if (view.phase._tag !== "Battle") continue;
          const revealed = view.phase.enemySunk.flatMap(placementCells);
          const hits = view.phase.outgoing.filter((s) => s.result === "hit").map((s) => s.at);
          // Every revealed cell must be one this player already hit.
          for (const cell of revealed) {
            expect(hits).toContainEqual(cell);
          }
          expect(JSON.stringify(view)).not.toContain('"fleets"');
        }
      }),
    { timeout: 30_000 },
  );
});
