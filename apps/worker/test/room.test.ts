import { ServerMessageJson } from "@sonar/game";
import { exports } from "cloudflare:workers";
import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

const connect = async (room: string) => {
  const response = await exports.default.fetch(
    new Request(`https://sonar.test/ws/room/${room}`, { headers: { Upgrade: "websocket" } }),
  );
  const socket = response.webSocket;
  if (!socket) throw new Error(`expected a websocket upgrade, got ${response.status}`);
  const messages: unknown[] = [];
  socket.addEventListener("message", (event) => {
    messages.push(Schema.decodeUnknownSync(ServerMessageJson)(event.data));
  });
  socket.accept();
  return { socket, messages };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("Room", () => {
  it("welcomes the first player into a room", async () => {
    const { messages } = await connect("K7QX4M");
    await settle();
    expect(messages).toEqual([{ _tag: "Welcome", room: "K7QX4M", players: 1 }]);
  });

  it("turns away a third player", async () => {
    await connect("ROOM33");
    await connect("ROOM33");
    const third = await connect("ROOM33");
    await settle();
    expect(third.messages).toEqual([{ _tag: "Rejected", reason: "room-full" }]);
  });

  it("rejects messages that do not match the protocol", async () => {
    const { socket, messages } = await connect("BADMSG");
    socket.send(JSON.stringify({ _tag: "Fire", x: 99 }));
    await settle();
    expect(messages).toContainEqual({ _tag: "Rejected", reason: "malformed" });
  });
});
