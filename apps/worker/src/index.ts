import { isQuickRoom, RoomCode } from "@sonar/game";
import { Schema } from "effect";
import { routePartykitRequest } from "partyserver";
import { handleApi } from "./api.ts";

export { Matchmaker } from "./matchmaker.ts";
export { Room } from "./room.ts";

const isRoomCode = Schema.is(RoomCode);
const isUuid = Schema.is(Schema.String.check(Schema.isUUID()));

const validRoomName = (name: string) =>
  isRoomCode(name) || (isQuickRoom(name) && isUuid(name.slice(2)));

export const MATCHMAKER_NAME = "main";

const guard = (_request: Request, { party, name }: { party: string; name: string }) => {
  const known = party === "room" ? validRoomName(name) : name === MATCHMAKER_NAME;
  return known ? undefined : new Response("Unknown room", { status: 404 });
};

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
