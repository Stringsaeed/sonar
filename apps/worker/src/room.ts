import { ClientMessageJson, ServerMessageJson, type ServerMessage } from "@sonar/game";
import { Exit, Schema } from "effect";
import { type Connection, Server, type WSMessage } from "partyserver";

const MAX_MESSAGE_BYTES = 2048;

const decodeClientMessage = Schema.decodeUnknownExit(ClientMessageJson);
const encodeServerMessage = Schema.encodeSync(ServerMessageJson);

const send = (connection: Connection, message: ServerMessage) =>
  connection.send(encodeServerMessage(message));

export class Room extends Server<Env> {
  static override options = { hibernate: true };

  override onConnect(connection: Connection) {
    const players = [...this.getConnections()].length;
    if (players > 2) {
      send(connection, { _tag: "Rejected", reason: "room-full" });
      connection.close(4000, "room-full");
      return;
    }
    send(connection, { _tag: "Welcome", room: this.name, players });
  }

  override onMessage(connection: Connection, raw: WSMessage) {
    if (typeof raw !== "string" || raw.length > MAX_MESSAGE_BYTES) {
      send(connection, { _tag: "Rejected", reason: "malformed" });
      return;
    }
    const message = decodeClientMessage(raw);
    if (Exit.isFailure(message)) {
      send(connection, { _tag: "Rejected", reason: "malformed" });
    }
  }
}
