import { routePartykitRequest } from "partyserver";
import { handleApi } from "./api.ts";

export { Matchmaker } from "./matchmaker.ts";
export { Room } from "./room.ts";

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/api/")) return handleApi(request);
    return (
      (await routePartykitRequest(request, env, { prefix: "ws" })) ??
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
