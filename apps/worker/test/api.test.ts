import type { GlobalStats } from "@sonar/game";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vite-plus/test";

const seedMatch = async () => {
  const id = crypto.randomUUID();
  const alice = crypto.randomUUID();
  const bob = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO matches (id, mode, end_reason, started_at, ended_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(id, "quick", "sunk", Date.now() - 60_000, Date.now()),
    env.DB.prepare(
      "INSERT INTO match_players (match_id, seat, token, callsign, won, shots_fired, ships_sunk) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(id, 0, alice, "Kraken", 1, 40, 5),
    env.DB.prepare(
      "INSERT INTO match_players (match_id, seat, token, callsign, won, shots_fired, ships_sunk) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(id, 1, bob, "Barnacle", 0, 38, 3),
  ]);
  return { id, alice, bob };
};

const get = (path: string, headers?: Record<string, string>) =>
  exports.default.fetch(new Request(`https://sonar.test${path}`, { headers: headers ?? {} }));

const stats = async () => {
  const response = await get("/api/stats");
  expect(response.status).toBe(200);
  return (await response.json()) as GlobalStats;
};

describe("/api", () => {
  it("totals finished matches into global stats", async () => {
    const before = await stats();
    await seedMatch();
    expect(await stats()).toEqual({
      matchesToday: before.matchesToday + 1,
      matchesAllTime: before.matchesAllTime + 1,
      shipsSunk: before.shipsSunk + 8,
      shotsFired: before.shotsFired + 78,
    });
  });

  it("returns a player's record from their token", async () => {
    const { id, bob } = await seedMatch();
    const record = await (await get("/api/record", { "x-sonar-token": bob })).json();
    expect(record).toMatchObject({
      wins: 0,
      losses: 1,
      recent: [{ id, opponent: "Kraken", won: false, endReason: "sunk", shotsFired: 38 }],
    });
  });

  it("rejects a record lookup without a valid token", async () => {
    const response = await get("/api/record", { "x-sonar-token": "nope" });
    expect(response.status).toBe(400);
  });
});
