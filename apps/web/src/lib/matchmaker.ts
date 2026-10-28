import { useAtomValue } from "@effect/atom-react";
import {
  MatchmakerClientMessageJson,
  type MatchmakerServerMessage,
  MatchmakerServerMessageJson,
} from "@sonar/game";
import { Effect, Exit, Queue, Schema, Stream } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";
import { PartySocket } from "partysocket";
import { loadIdentity } from "./identity.ts";

const decode = Schema.decodeUnknownExit(MatchmakerServerMessageJson);
const encode = Schema.encodeSync(MatchmakerClientMessageJson);

export interface DockState {
  readonly online: number | undefined;
  readonly inQueue: number | undefined;
  readonly queued: boolean;
  /** Set once the matchmaker pairs us: the quick room to join. */
  readonly matchedRoom: string | undefined;
}

const INITIAL: DockState = {
  online: undefined,
  inQueue: undefined,
  queued: false,
  matchedRoom: undefined,
};

const reduce = (state: DockState, message: MatchmakerServerMessage): DockState =>
  message._tag === "Presence"
    ? { ...state, online: message.online, inQueue: message.inQueue, queued: message.queued }
    : { ...state, queued: false, matchedRoom: message.room };

/**
 * One socket to the matchmaker. With `enqueue`, it joins the queue on every (re)connect; without,
 * it only listens for the live counts the landing page shows.
 */
const dockEvents = (enqueue: boolean) =>
  Stream.callback<MatchmakerServerMessage>(
    Effect.fn(function* (queue) {
      const socket = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new PartySocket({
              host: location.host,
              prefix: "ws",
              party: "matchmaker",
              room: "main",
            }),
        ),
        (socket) => Effect.sync(() => socket.close()),
      );
      if (enqueue) {
        socket.addEventListener("open", () =>
          socket.send(encode({ _tag: "Enqueue", token: loadIdentity().token })),
        );
      }
      socket.addEventListener("message", (event) => {
        const decoded = decode(event.data);
        if (Exit.isSuccess(decoded)) Queue.offerUnsafe(queue, decoded.value);
      });
    }),
  );

const dockAtom = Atom.family((enqueue: boolean) =>
  Atom.make(dockEvents(enqueue).pipe(Stream.scan(() => INITIAL, reduce))),
);

/** Live dock counts. Pass `{ enqueue: true }` to also stand in the Quick Match queue while mounted. */
export const useDock = ({ enqueue = false }: { enqueue?: boolean } = {}) =>
  AsyncResult.getOrElse(useAtomValue(dockAtom(enqueue)), () => INITIAL);
