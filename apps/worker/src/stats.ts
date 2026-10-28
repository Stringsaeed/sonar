import { GlobalStats, MatchSummary, PlayerRecord, type PlayerToken } from "@sonar/game";
import { Context, DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/sql";

const RECENT_MATCHES = 10;

const Tally = Schema.Struct({ wins: Schema.Int, losses: Schema.Int });

export class Stats extends Context.Service<
  Stats,
  {
    readonly global: Effect.Effect<GlobalStats>;
    readonly record: (token: PlayerToken) => Effect.Effect<PlayerRecord>;
  }
>()("sonar/worker/Stats") {
  static readonly layer = Layer.effect(
    Stats,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const findGlobal = SqlSchema.findOne({
        Request: Schema.Number,
        Result: GlobalStats,
        execute: (startOfDay) => sql`
          SELECT
            (SELECT COUNT(*) FROM matches WHERE ended_at >= ${startOfDay}) AS matchesToday,
            (SELECT COUNT(*) FROM matches) AS matchesAllTime,
            (SELECT COALESCE(SUM(ships_sunk), 0) FROM match_players) AS shipsSunk,
            (SELECT COALESCE(SUM(shots_fired), 0) FROM match_players) AS shotsFired
        `,
      });

      const findTally = SqlSchema.findOne({
        Request: Schema.String,
        Result: Tally,
        execute: (token) => sql`
          SELECT
            COALESCE(SUM(won), 0) AS wins,
            COALESCE(SUM(1 - won), 0) AS losses
          FROM match_players WHERE token = ${token}
        `,
      });

      const findRecent = SqlSchema.findAll({
        Request: Schema.String,
        Result: Schema.Struct({ ...MatchSummary.fields, won: Schema.BooleanFromBit }),
        execute: (token) => sql`
          SELECT
            m.id AS id,
            m.mode AS mode,
            them.callsign AS opponent,
            me.won AS won,
            m.end_reason AS endReason,
            m.ended_at AS endedAt,
            m.ended_at - m.started_at AS durationMs,
            me.shots_fired AS shotsFired
          FROM match_players me
          JOIN matches m ON m.id = me.match_id
          JOIN match_players them ON them.match_id = me.match_id AND them.seat != me.seat
          WHERE me.token = ${token}
          ORDER BY m.ended_at DESC
          LIMIT ${RECENT_MATCHES}
        `,
      });

      const global = Effect.gen(function* () {
        const today = DateTime.startOf(yield* DateTime.now, "day");
        return yield* findGlobal(DateTime.toEpochMillis(today));
      }).pipe(Effect.orDie, Effect.withSpan("Stats.global"));

      const record = Effect.fn("Stats.record")(function* (token: PlayerToken) {
        const [tally, recent] = yield* Effect.all([findTally(token), findRecent(token)], {
          concurrency: "unbounded",
        });
        return { ...tally, recent };
      }, Effect.orDie);

      return Stats.of({ global, record });
    }),
  );
}
