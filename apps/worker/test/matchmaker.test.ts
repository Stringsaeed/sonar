import {
  type MatchmakerClientMessage,
  MatchmakerClientMessageJson,
  type MatchmakerServerMessage,
  MatchmakerServerMessageJson,
} from "@sonar/game";
import { exports } from "cloudflare:workers";
import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

// Every test shares the one matchmaker, so assertions look at each socket's own messages only.
const connect = async () => {
  const response = await exports.default.fetch(
    new Request("https://sonar.test/ws/matchmaker/main", { headers: { Upgrade: "websocket" } }),
  );
  const socket = response.webSocket;
  if (!socket) throw new Error(`expected a websocket upgrade, got ${response.status}`);
  const messages: MatchmakerServerMessage[] = [];
  socket.addEventListener("message", (event) => {
    messages.push(Schema.decodeUnknownSync(MatchmakerServerMessageJson)(event.data));
  });
  socket.accept();
  return {
    messages,
    send: (message: MatchmakerClientMessage) =>
      socket.send(Schema.encodeSync(MatchmakerClientMessageJson)(message)),
    close: () => socket.close(),
  };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
const matched = (messages: MatchmakerServerMessage[]) => messages.find((m) => m._tag === "Matched");
const token = () => crypto.randomUUID() as never;

describe("Matchmaker", () => {
  it("pairs two queued players into the same fresh quick room", async () => {
    const a = await connect();
    const b = await connect();
    a.send({ _tag: "Enqueue", token: token() });
    b.send({ _tag: "Enqueue", token: token() });
    await settle();
    const room = matched(a.messages);
    expect(room).toMatchObject({
      _tag: "Matched",
      room: expect.stringMatching(/^q-[0-9a-f-]{36}$/),
    });
    expect(matched(b.messages)).toEqual(room);
    a.close();
    b.close();
  });

  it("never pairs a player with their own other tab", async () => {
    const shared = token();
    const tab1 = await connect();
    const tab2 = await connect();
    tab1.send({ _tag: "Enqueue", token: shared });
    tab2.send({ _tag: "Enqueue", token: shared });
    await settle();
    expect(matched(tab1.messages)).toBeUndefined();

    const stranger = await connect();
    stranger.send({ _tag: "Enqueue", token: token() });
    await settle();
    // Both tabs follow the player into the match.
    expect(matched(tab1.messages)).toEqual(matched(stranger.messages));
    expect(matched(tab2.messages)).toEqual(matched(stranger.messages));
    for (const s of [tab1, tab2, stranger]) s.close();
  });

  it("drops a player from the queue when they back out", async () => {
    const quitter = await connect();
    quitter.send({ _tag: "Enqueue", token: token() });
    await settle();
    quitter.send({ _tag: "Dequeue" });
    await settle();
    expect(quitter.messages.at(-1)).toMatchObject({ _tag: "Presence", queued: false });

    const late = await connect();
    late.send({ _tag: "Enqueue", token: token() });
    await settle();
    expect(matched(quitter.messages)).toBeUndefined();
    expect(late.messages.at(-1)).toMatchObject({ _tag: "Presence", queued: true });
    late.close();
    quitter.close();
  });

  it("tells everyone at the dock how many are online and queued", async () => {
    const watcher = await connect();
    await settle();
    const before = watcher.messages.at(-1);
    const joiner = await connect();
    await settle();
    const after = watcher.messages.at(-1);
    if (before?._tag !== "Presence" || after?._tag !== "Presence")
      throw new Error("expected Presence");
    expect(after.online).toBe(before.online + 1);
    watcher.close();
    joiner.close();
  });
});
