import {
  MatchmakerClientMessageJson,
  MatchmakerServerMessageJson,
  type MatchmakerServerMessage,
  type PlayerToken,
  quickRoomName,
} from "@sonar/game";
import { Exit, Schema } from "effect";
import { type Connection, Server, type WSMessage } from "partyserver";

const decodeMessage = Schema.decodeUnknownExit(MatchmakerClientMessageJson);
const encodeMessage = Schema.encodeSync(MatchmakerServerMessageJson);

interface Queued {
  readonly token: PlayerToken;
  readonly queuedAt: number;
}

const send = (connection: Connection, message: MatchmakerServerMessage) =>
  connection.send(encodeMessage(message));

/**
 * The single Quick Match queue. Every visitor to the dock holds a socket here for the live
 * counts; queued sockets carry their place in line as connection state, so the queue survives
 * hibernation without any storage.
 */
export class Matchmaker extends Server<Env> {
  static override options = { hibernate: true };

  override onConnect() {
    this.#broadcastPresence();
  }

  override onMessage(connection: Connection<Queued | null>, raw: WSMessage) {
    if (typeof raw !== "string" || raw.length > 512) return;
    const message = decodeMessage(raw);
    if (Exit.isFailure(message)) return;

    if (message.value._tag === "Enqueue") {
      if (!connection.state)
        connection.setState({ token: message.value.token, queuedAt: Date.now() });
      this.#pair();
    } else {
      connection.setState(null);
    }
    this.#broadcastPresence();
  }

  override onClose() {
    this.#broadcastPresence();
  }

  /** Pairs the two longest-waiting players, by token, so two tabs of one player never match. */
  #pair() {
    const byToken = new Map<PlayerToken, Connection<Queued | null>[]>();
    const queued = [...this.getConnections<Queued | null>()]
      .filter((connection) => connection.state)
      .sort((a, b) => a.state!.queuedAt - b.state!.queuedAt);
    for (const connection of queued) {
      const token = connection.state!.token;
      byToken.set(token, [...(byToken.get(token) ?? []), connection]);
    }
    const [first, second] = byToken.values();
    if (!first || !second) return;

    const room = quickRoomName(crypto.randomUUID());
    for (const connection of [...first, ...second]) {
      connection.setState(null);
      send(connection, { _tag: "Matched", room });
    }
  }

  #broadcastPresence() {
    const connections = [...this.getConnections<Queued | null>()];
    const inQueue = new Set(connections.flatMap((c) => (c.state ? [c.state.token] : []))).size;
    for (const connection of connections) {
      send(connection, {
        _tag: "Presence",
        online: connections.length,
        inQueue,
        queued: connection.state !== null,
      });
    }
  }
}
