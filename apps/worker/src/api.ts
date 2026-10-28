import { D1Client } from "@effect/sql-d1";
import { SonarApi } from "@sonar/game";
import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { Stats } from "./stats.ts";

const StatsHandlers = HttpApiBuilder.group(
  SonarApi,
  "stats",
  Effect.fn(function* (handlers) {
    const stats = yield* Stats;
    return handlers
      .handle("stats", () => stats.global)
      .handle("record", ({ headers }) => stats.record(headers["x-sonar-token"]));
  }),
);

const ApiLive = HttpApiBuilder.layer(SonarApi).pipe(
  Layer.provide(StatsHandlers),
  Layer.provide(Stats.layer),
  Layer.provide(D1Client.layer({ db: env.DB })),
  Layer.provide(HttpServer.layerServices),
);

export const { handler: handleApi } = HttpRouter.toWebHandler(ApiLive);
