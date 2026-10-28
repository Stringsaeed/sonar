import { SonarApi } from "@sonar/game";
import { FetchHttpClient } from "effect/http";
import { AtomHttpApi } from "effect/reactivity";
import { loadIdentity } from "./identity.ts";

export class SonarClient extends AtomHttpApi.Service<SonarClient>()("sonar/web/SonarClient", {
  api: SonarApi,
  httpClient: FetchHttpClient.layer,
  baseUrl: globalThis.location?.origin,
}) {}

export const globalStatsAtom = SonarClient.query("stats", "stats", {});

export const myRecordAtom = SonarClient.query("stats", "record", {
  headers: { "x-sonar-token": loadIdentity().token },
});
