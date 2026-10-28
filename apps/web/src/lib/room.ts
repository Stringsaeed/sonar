import { ClientMessageJson, ServerMessageJson, type ServerMessage } from "@sonar/game";
import { Effect, Exit, Queue, Schema, Stream } from "effect";
import { Atom } from "effect/reactivity";
import { PartySocket } from "partysocket";
import { loadIdentity } from "./identity.ts";

const decodeServerMessage = Schema.decodeUnknownExit(ServerMessageJson);
const encodeClientMessage = Schema.encodeSync(ClientMessageJson);

const roomMessages = (code: string) =>
  Stream.callback<ServerMessage>(
    Effect.fn(function* (queue) {
      const socket = yield* Effect.acquireRelease(
        Effect.sync(
          () => new PartySocket({ host: location.host, prefix: "ws", party: "room", room: code }),
        ),
        (socket) => Effect.sync(() => socket.close()),
      );
      socket.addEventListener("open", () => {
        const { token, callsign } = loadIdentity();
        socket.send(encodeClientMessage({ _tag: "Hello", token, callsign }));
      });
      socket.addEventListener("message", (event) => {
        const message = decodeServerMessage(event.data);
        if (Exit.isSuccess(message)) Queue.offerUnsafe(queue, message.value);
      });
    }),
  );

export const roomAtom = Atom.family((code: string) => Atom.make(roomMessages(code)));
