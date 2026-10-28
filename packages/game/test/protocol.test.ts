import { describe, expect, it } from "@effect/vitest";
import { Effect, Exit, Schema } from "effect";
import {
  ClientMessage,
  ClientMessageJson,
  ServerMessage,
  ServerMessageJson,
} from "../src/index.ts";

describe("protocol", () => {
  it.prop("client messages survive the JSON wire", [ClientMessage], ([message]) => {
    const wire = Schema.encodeSync(ClientMessageJson)(message);
    const again = Schema.encodeSync(ClientMessageJson)(Schema.decodeSync(ClientMessageJson)(wire));
    expect(again).toBe(wire);
  });

  it.prop("server messages survive the JSON wire", [ServerMessage], ([message]) => {
    const wire = Schema.encodeSync(ServerMessageJson)(message);
    const again = Schema.encodeSync(ServerMessageJson)(Schema.decodeSync(ServerMessageJson)(wire));
    expect(again).toBe(wire);
  });

  it.effect("rejects a hello with a forged token", () =>
    Effect.gen(function* () {
      const exit = yield* Schema.decodeUnknownEffect(ClientMessageJson)(
        JSON.stringify({ _tag: "Hello", token: "not-a-uuid", callsign: "Kraken" }),
      ).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});
