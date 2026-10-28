import {
  type Action,
  isQuickRoom,
  ClientMessageJson,
  Match,
  newMatch,
  nextDeadline,
  type PlayerToken,
  type Seat,
  ServerMessageJson,
  type ServerMessage,
  step,
  viewFor,
} from "@sonar/game";
import { Clock, Effect, Exit, ManagedRuntime, Result, Schema } from "effect";
import { type Connection, type ConnectionContext, Server, type WSMessage } from "partyserver";
import { MatchRecords } from "./records.ts";

const MAX_MESSAGE_BYTES = 4096;
const RATE_WINDOW_MS = 1000;
const RATE_MAX_MESSAGES = 20;

const decodeClientMessage = Schema.decodeUnknownExit(ClientMessageJson);
const encodeServerMessage = Schema.encodeSync(ServerMessageJson);
const encodeMatch = Schema.encodeSync(Match);
const decodeMatch = Schema.decodeUnknownSync(Match);

interface Seated {
  readonly token: PlayerToken;
  readonly seat: Seat;
}

const send = (connection: Connection, message: ServerMessage) =>
  connection.send(encodeServerMessage(message));

/**
 * One Room per match. It holds both fleets and every clock, and decides every action through the
 * pure reducer in @sonar/game. Clients only ever receive their own `PlayerView`.
 */
export class Room extends Server<Env> {
  static override options = { hibernate: true };

  #match: Match | undefined;
  readonly #rate = new Map<string, { windowStart: number; count: number }>();
  readonly #runtime = ManagedRuntime.make(MatchRecords.layer(this.env.DB));

  override async onStart() {
    const stored = await this.ctx.storage.get("match");
    this.#match = stored === undefined ? undefined : decodeMatch(stored);
  }

  override onConnect(_connection: Connection, _context: ConnectionContext) {
    // Nothing to do until the client says Hello with its token.
  }

  override async onMessage(connection: Connection, raw: WSMessage) {
    if (typeof raw !== "string" || raw.length > MAX_MESSAGE_BYTES) {
      return send(connection, { _tag: "Rejected", reason: "malformed" });
    }
    if (this.#rateLimited(connection.id)) {
      return send(connection, { _tag: "Rejected", reason: "rate-limited" });
    }
    const decoded = decodeClientMessage(raw);
    if (Exit.isFailure(decoded)) return send(connection, { _tag: "Rejected", reason: "malformed" });
    const message = decoded.value;

    if (message._tag === "Hello") {
      return this.#apply(
        { _tag: "Join", token: message.token, callsign: message.callsign },
        connection,
      );
    }
    const seated = connection.state as Seated | null;
    if (!seated) return send(connection, { _tag: "Rejected", reason: "not-seated" });
    const seat = seated.seat;
    switch (message._tag) {
      case "Draft":
      case "Ready":
        return this.#apply({ _tag: message._tag, seat, fleet: message.fleet }, connection);
      case "Fire":
        return this.#apply({ _tag: "Fire", seat, at: message.at }, connection);
      case "Forfeit":
      case "Rematch":
      case "Leave":
        return this.#apply({ _tag: message._tag, seat }, connection);
    }
  }

  override async onClose(connection: Connection) {
    this.#rate.delete(connection.id);
    const seated = connection.state as Seated | null;
    if (!seated) return;
    const stillHere = [...this.getConnections<Seated>()].some(
      (other) => other.id !== connection.id && other.state?.token === seated.token,
    );
    if (!stillHere) await this.#apply({ _tag: "Disconnect", token: seated.token });
  }

  override async onAlarm() {
    await this.#apply({ _tag: "Tick" });
  }

  async #apply(action: Action, from?: Connection) {
    const match =
      this.#match ??
      (await Effect.runPromise(newMatch(isQuickRoom(this.name) ? "quick" : "private")));
    const result = await Effect.runPromise(Effect.result(step(match, action)));

    if (Result.isFailure(result)) {
      if (from) send(from, { _tag: "Rejected", reason: result.failure.reason });
      return;
    }

    const transition = result.success;
    if (from && transition.seated !== undefined && action._tag === "Join") {
      from.setState({ token: action.token, seat: transition.seated } satisfies Seated);
    }
    this.#match = transition.match;
    await this.ctx.storage.put("match", encodeMatch(transition.match));

    const deadline = nextDeadline(transition.match);
    if (deadline === undefined) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(deadline);

    if (transition.ended) {
      const ended = transition.ended;
      await this.#runtime.runPromise(
        Effect.gen(function* () {
          const records = yield* MatchRecords;
          yield* records.save(ended);
        }),
      );
    }

    await this.#broadcast(transition.match);
  }

  async #broadcast(match: Match) {
    const now = await Effect.runPromise(Clock.currentTimeMillis);
    for (const connection of this.getConnections<Seated>()) {
      const seated = connection.state;
      if (!seated) continue;
      send(connection, { _tag: "View", view: viewFor(match, seated.seat, this.name, now) });
      if (match.phase._tag === "Closed") connection.close(1000, "room closed");
    }
  }

  #rateLimited(connectionId: string) {
    const now = Date.now();
    const window = this.#rate.get(connectionId);
    if (!window || now - window.windowStart >= RATE_WINDOW_MS) {
      this.#rate.set(connectionId, { windowStart: now, count: 1 });
      return false;
    }
    window.count += 1;
    return window.count > RATE_MAX_MESSAGES;
  }
}
