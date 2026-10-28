import { describe, expect, it } from "@effect/vitest";
import { Effect, Random, Schema } from "effect";
import {
  completeFleet,
  fleetProblem,
  isCompleteFleet,
  type Fleet,
  randomFleet,
} from "../src/index.ts";

const carrierAt = (x: number, y: number) =>
  ({ kind: "carrier", origin: { x, y }, orientation: "horizontal" }) as const;

describe("fleet rules", () => {
  it("lets ships touch but not overlap", () => {
    const touching: Fleet = [
      carrierAt(0, 0),
      { kind: "battleship", origin: { x: 0, y: 1 }, orientation: "horizontal" },
    ];
    const overlapping: Fleet = [
      carrierAt(0, 0),
      { kind: "battleship", origin: { x: 2, y: 0 }, orientation: "vertical" },
    ];
    expect(fleetProblem(touching)).toBeUndefined();
    expect(fleetProblem(overlapping)).toBe("overlap");
  });

  it("keeps ships on the board", () => {
    expect(fleetProblem([carrierAt(6, 0)])).toBe("out-of-bounds");
    expect(fleetProblem([carrierAt(5, 9)])).toBeUndefined();
  });

  it("allows each ship once", () => {
    expect(fleetProblem([carrierAt(0, 0), carrierAt(0, 5)])).toBe("duplicate-ship");
  });

  it.effect.prop("a random fleet is always complete and legal", [Schema.Int], ([seed]) =>
    Effect.gen(function* () {
      const fleet = yield* randomFleet.pipe(Random.withSeed(seed));
      expect(isCompleteFleet(fleet)).toBe(true);
    }),
  );

  it.effect("completing a draft keeps what the player already placed", () =>
    Effect.gen(function* () {
      const fleet = yield* completeFleet([carrierAt(5, 9)]);
      expect(isCompleteFleet(fleet)).toBe(true);
      expect(fleet).toContainEqual(carrierAt(5, 9));
    }),
  );
});
