import type { MatchResult } from "@sonar/game";
import { Context, Effect, Layer } from "effect";

/** Writes finished matches to D1 — the source for players' records and the global stats. */
export class MatchRecords extends Context.Service<
  MatchRecords,
  { readonly save: (result: MatchResult) => Effect.Effect<void> }
>()("sonar/worker/MatchRecords") {
  static readonly layer = (db: D1Database) =>
    Layer.succeed(
      MatchRecords,
      MatchRecords.of({
        // D1 has no SQL transactions; a batch is its atomic unit.
        save: Effect.fn("MatchRecords.save")(function* (result: MatchResult) {
          const id = crypto.randomUUID();
          const insertPlayer = db.prepare(
            `INSERT INTO match_players (match_id, seat, token, callsign, won, shots_fired, ships_sunk)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          );
          yield* Effect.promise(() =>
            db.batch([
              db
                .prepare(
                  "INSERT INTO matches (id, mode, end_reason, started_at, ended_at) VALUES (?, ?, ?, ?, ?)",
                )
                .bind(id, result.mode, result.reason, result.startedAt, result.endedAt),
              ...result.players.map((player, seat) =>
                insertPlayer.bind(
                  id,
                  seat,
                  player.token,
                  player.callsign,
                  seat === result.winner ? 1 : 0,
                  player.shotsFired,
                  player.shipsSunk,
                ),
              ),
            ]),
          );
        }),
      }),
    );
}
