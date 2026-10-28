import { useAtomValue } from "@effect/atom-react";
import {
  type ClientMessage,
  ClientMessageJson,
  type PlayerView,
  type ServerMessage,
  ServerMessageJson,
} from "@sonar/game";
import { Effect, Exit, Queue, Schema, Stream } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";
import { PartySocket } from "partysocket";
import { useEffect, useState } from "react";
import { loadIdentity } from "./identity.ts";

const decodeServerMessage = Schema.decodeUnknownExit(ServerMessageJson);
const encodeClientMessage = Schema.encodeSync(ClientMessageJson);

export type RejectionReason = Extract<ServerMessage, { _tag: "Rejected" }>["reason"];

export interface RoomState {
  /** "reconnecting" means we had a seat and the socket dropped; partysocket retries on its own. */
  readonly status: "connecting" | "open" | "reconnecting";
  readonly view: PlayerView | undefined;
  /** The server's most recent refusal (e.g. room-full, not-your-turn), with when it arrived. */
  readonly rejection: { readonly reason: RejectionReason; readonly at: number } | undefined;
  /** Server clock minus local clock, so countdowns line up with the server's deadlines. */
  readonly clockOffset: number;
}

const INITIAL: RoomState = {
  status: "connecting",
  view: undefined,
  rejection: undefined,
  clockOffset: 0,
};

type SocketEvent =
  | { readonly _tag: "Open" }
  | { readonly _tag: "Close" }
  | { readonly _tag: "Message"; readonly message: ServerMessage; readonly receivedAt: number };

const sockets = new Map<string, PartySocket>();

const reduce = (state: RoomState, event: SocketEvent): RoomState => {
  switch (event._tag) {
    case "Open":
      return { ...state, status: "open" };
    case "Close":
      return { ...state, status: state.view ? "reconnecting" : "connecting" };
    case "Message":
      return event.message._tag === "View"
        ? {
            ...state,
            view: event.message.view,
            clockOffset: event.message.view.serverNow - event.receivedAt,
          }
        : { ...state, rejection: { reason: event.message.reason, at: event.receivedAt } };
  }
};

const roomEvents = (room: string) =>
  Stream.callback<SocketEvent>(
    Effect.fn(function* (queue) {
      const socket = yield* Effect.acquireRelease(
        Effect.sync(
          () => new PartySocket({ host: location.host, prefix: "ws", party: "room", room }),
        ),
        (socket) =>
          Effect.sync(() => {
            sockets.delete(room);
            socket.close();
          }),
      );
      sockets.set(room, socket);
      socket.addEventListener("open", () => {
        // Every (re)connect says Hello again — that's how a dropped player reclaims their seat.
        const { token, callsign } = loadIdentity();
        socket.send(encodeClientMessage({ _tag: "Hello", token, callsign }));
        Queue.offerUnsafe(queue, { _tag: "Open" });
      });
      socket.addEventListener("close", () => Queue.offerUnsafe(queue, { _tag: "Close" }));
      socket.addEventListener("message", (event) => {
        const decoded = decodeServerMessage(event.data);
        if (Exit.isSuccess(decoded)) {
          Queue.offerUnsafe(queue, {
            _tag: "Message",
            message: decoded.value,
            receivedAt: Date.now(),
          });
        }
      });
    }),
  );

const roomAtom = Atom.family((room: string) =>
  Atom.make(roomEvents(room).pipe(Stream.scan(() => INITIAL, reduce))),
);

export const sendToRoom = (room: string, message: ClientMessage) =>
  sockets.get(room)?.send(encodeClientMessage(message));

/** Live state of one room, plus a `send` bound to it. */
export const useRoom = (room: string) => {
  const state = AsyncResult.getOrElse(useAtomValue(roomAtom(room)), () => INITIAL);
  return { ...state, send: (message: ClientMessage) => sendToRoom(room, message) };
};

/** Seconds until a server deadline, ticking. Uses the room's clock offset to correct for skew. */
export const useSecondsLeft = (deadline: number | undefined, clockOffset: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === undefined) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (deadline === undefined) return undefined;
  return Math.max(0, Math.ceil((deadline - (now + clockOffset)) / 1000));
};
