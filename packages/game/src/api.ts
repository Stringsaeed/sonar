import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import { Callsign, EndReason, MatchMode, PlayerToken } from "./domain.ts";

export const GlobalStats = Schema.Struct({
  matchesToday: Schema.Int,
  matchesAllTime: Schema.Int,
  shipsSunk: Schema.Int,
  shotsFired: Schema.Int,
});
export type GlobalStats = typeof GlobalStats.Type;

export const MatchSummary = Schema.Struct({
  id: Schema.String,
  mode: MatchMode,
  opponent: Callsign,
  won: Schema.Boolean,
  endReason: EndReason,
  endedAt: Schema.Number,
  durationMs: Schema.Number,
  shotsFired: Schema.Int,
});
export type MatchSummary = typeof MatchSummary.Type;

export const PlayerRecord = Schema.Struct({
  wins: Schema.Int,
  losses: Schema.Int,
  recent: Schema.Array(MatchSummary),
});
export type PlayerRecord = typeof PlayerRecord.Type;

export class StatsApi extends HttpApiGroup.make("stats", { topLevel: true })
  .add(HttpApiEndpoint.get("stats", "/stats", { success: GlobalStats }))
  .add(
    HttpApiEndpoint.get("record", "/record", {
      headers: { "x-sonar-token": PlayerToken },
      success: PlayerRecord,
    }),
  ) {}

export class SonarApi extends HttpApi.make("sonar").add(StatsApi).prefix("/api") {}
