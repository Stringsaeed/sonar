import { RoomCode } from "@sonar/game";
import { Schema } from "effect";
import { routePartykitRequest } from "partyserver";
import { handleApi } from "./api.ts";
import { isQuickRoom } from "./room.ts";

export { Matchmaker } from "./matchmaker.ts";
export { Room } from "./room.ts";

const isRoomCode = Schema.is(RoomCode);
const isUuid = Schema.is(Schema.String.check(Schema.isUUID()));

const validRoomName = (name: string) =>
  isRoomCode(name) || (isQuickRoom(name) && isUuid(name.slice(2)));

const guard = (_request: Request, { party, name }: { party: string; name: string }) =>
  party === "room" && !validRoomName(name)
    ? new Response("Unknown room", { status: 404 })
    : undefined;

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/api/")) return handleApi(request);
    return (
      (await routePartykitRequest(request, env, {
        prefix: "ws",
        onBeforeConnect: guard,
        onBeforeRequest: guard,
      })) ?? new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
