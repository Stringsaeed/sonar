import { useAtomValue } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import { AsyncResult } from "effect/reactivity";
import { roomAtom } from "@/lib/room";

export const Route = createFileRoute("/r/$code")({ component: PrivateRoom });

function PrivateRoom() {
  const { code } = Route.useParams();
  const latest = useAtomValue(roomAtom(code));

  return (
    <section className="py-12">
      <h1 className="text-3xl font-black">Room {code}</h1>
      <p className="mt-2 text-muted-foreground" data-testid="room-status">
        {AsyncResult.match(latest, {
          onInitial: () => "Connecting…",
          onFailure: () => "Connection lost",
          onSuccess: ({ value }) =>
            value._tag === "Welcome"
              ? `Connected · ${value.players}/2 players`
              : `Rejected: ${value.reason}`,
        })}
      </p>
    </section>
  );
}
