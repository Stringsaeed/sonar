import {
  type ClientMessage,
  ClientMessageJson,
  type Fleet,
  type PlayerView,
  type ServerMessage,
  ServerMessageJson,
} from "@sonar/game";
import { runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

const ROWS_FLEET: Fleet = [
  { kind: "carrier", origin: { x: 0, y: 0 }, orientation: "horizontal" },
  { kind: "battleship", origin: { x: 0, y: 1 }, orientation: "horizontal" },
  { kind: "cruiser", origin: { x: 0, y: 2 }, orientation: "horizontal" },
  { kind: "submarine", origin: { x: 0, y: 3 }, orientation: "horizontal" },
  { kind: "destroyer", origin: { x: 0, y: 4 }, orientation: "horizontal" },
];
const SHIP_CELLS = [5, 4, 3, 3, 2].flatMap((length, y) =>
  Array.from({ length }, (_, x) => ({ x, y })),
);

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const freshCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

interface Client {
  readonly messages: ServerMessage[];
  readonly send: (message: ClientMessage) => void;
  readonly close: () => void;
  /** Waits for the next View that satisfies `predicate`. */
  readonly view: (predicate?: (view: PlayerView) => boolean) => Promise<PlayerView>;
}

const connect = async (room: string): Promise<Client> => {
  const response = await exports.default.fetch(
    new Request(`https://sonar.test/ws/room/${room}`, { headers: { Upgrade: "websocket" } }),
  );
  const socket = response.webSocket;
  if (!socket) throw new Error(`expected a websocket upgrade, got ${response.status}`);
  const messages: ServerMessage[] = [];
  socket.addEventListener("message", (event) => {
    messages.push(Schema.decodeUnknownSync(ServerMessageJson)(event.data));
  });
  socket.accept();
  const view = async (predicate: (view: PlayerView) => boolean = () => true) => {
    for (let i = 0; i < 100; i++) {
      const found = messages.findLast(
        (m): m is Extract<ServerMessage, { _tag: "View" }> =>
          m._tag === "View" && predicate(m.view),
      );
      if (found) return found.view;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`no matching view; got ${JSON.stringify(messages.at(-1))}`);
  };
  return {
    messages,
    send: (message) => socket.send(Schema.encodeSync(ClientMessageJson)(message)),
    close: () => socket.close(),
    view,
  };
};

const join = async (room: string, callsign: string) => {
  const client = await connect(room);
  client.send({ _tag: "Hello", token: crypto.randomUUID() as never, callsign });
  await client.view();
  return client;
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("Room", () => {
  it("seats two players and starts placement on its own", async () => {
    const room = freshCode();
    const host = await join(room, "Silent Kraken");
    expect((await host.view()).phase._tag).toBe("Waiting");
    const guest = await join(room, "Brave Barnacle");
    const view = await guest.view((v) => v.phase._tag === "Placing");
    expect(view.opponent?.callsign).toBe("Silent Kraken");
    await host.view((v) => v.phase._tag === "Placing");
  });

  it("turns away a third player", async () => {
    const room = freshCode();
    await join(room, "A");
    await join(room, "B");
    const third = await connect(room);
    third.send({ _tag: "Hello", token: crypto.randomUUID() as never, callsign: "C" });
    await settle();
    expect(third.messages).toEqual([{ _tag: "Rejected", reason: "room-full" }]);
  });

  it("refuses unknown room names and protocol violations", async () => {
    const response = await exports.default.fetch(
      new Request("https://sonar.test/ws/room/not-a-room", { headers: { Upgrade: "websocket" } }),
    );
    expect(response.status).toBe(404);

    const client = await connect(freshCode());
    client.send({ _tag: "Fire", at: { x: 1, y: 1 } });
    await settle();
    expect(client.messages).toContainEqual({ _tag: "Rejected", reason: "not-seated" });
  });

  it("plays a full game, never leaks the enemy fleet, and records the result", async () => {
    const room = freshCode();
    const a = await join(room, "Silent Kraken");
    const b = await join(room, "Brave Barnacle");
    a.send({ _tag: "Ready", fleet: ROWS_FLEET });
    b.send({ _tag: "Ready", fleet: ROWS_FLEET });

    const start = await a.view((v) => v.phase._tag === "Battle");
    const [shooter, other] = start.phase._tag === "Battle" && start.phase.myTurn ? [a, b] : [b, a];
    for (const [i, cell] of SHIP_CELLS.entries()) {
      shooter.send({ _tag: "Fire", at: cell });
      if (i === SHIP_CELLS.length - 1) break;
      await other.view((v) => v.phase._tag === "Battle" && v.phase.myTurn);
      other.send({ _tag: "Fire", at: { x: i % 10, y: 9 - Math.floor(i / 10) } });
      await shooter.view((v) => v.phase._tag === "Battle" && v.phase.myTurn);
    }

    const won = await shooter.view((v) => v.phase._tag === "Over");
    const lost = await other.view((v) => v.phase._tag === "Over");
    expect(won.phase).toMatchObject({ _tag: "Over", won: true, reason: "sunk" });
    expect(lost.phase).toMatchObject({ _tag: "Over", won: false, reason: "sunk" });

    for (const message of other.messages) {
      if (message._tag !== "View" || message.view.phase._tag !== "Battle") continue;
      const sunkCells = message.view.phase.enemySunk.length;
      expect(sunkCells).toBeLessThanOrEqual(5);
      expect(JSON.stringify(message.view)).not.toContain("fleets");
    }

    const rows = await env.DB.prepare(
      "SELECT callsign, won, shots_fired, ships_sunk FROM match_players WHERE callsign IN (?, ?) ORDER BY won DESC",
    )
      .bind("Silent Kraken", "Brave Barnacle")
      .all();
    expect(rows.results.at(0)).toMatchObject({ won: 1, shots_fired: 17, ships_sunk: 5 });
  });

  it("arms its alarm for the turn clock", async () => {
    const room = freshCode();
    const a = await join(room, "A");
    const b = await join(room, "B");
    a.send({ _tag: "Ready", fleet: ROWS_FLEET });
    b.send({ _tag: "Ready", fleet: ROWS_FLEET });
    const view = await a.view((v) => v.phase._tag === "Battle");
    if (view.phase._tag !== "Battle") throw new Error("expected Battle");

    const stub = env.Room.get(env.Room.idFromName(room));
    const alarm = await runInDurableObject(stub, (_, state) => state.storage.getAlarm());
    expect(alarm).toBe(view.phase.deadline);
  });

  it("lets a dropped player back into their seat", async () => {
    const room = freshCode();
    const token = crypto.randomUUID() as never;
    const first = await connect(room);
    first.send({ _tag: "Hello", token, callsign: "Silent Kraken" });
    await first.view();
    await join(room, "Brave Barnacle");
    first.close();
    await settle();

    const again = await connect(room);
    again.send({ _tag: "Hello", token, callsign: "Silent Kraken" });
    const view = await again.view((v) => v.phase._tag === "Placing");
    expect(view.me).toMatchObject({ seat: 0, callsign: "Silent Kraken" });
  });
});
