import { RoomCode } from "@sonar/game";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Schema } from "effect";
import { AppHeader } from "@/components/AppHeader";
import { RoomScreen } from "@/components/room/RoomScreen";
import { Button } from "@/components/ui/button";

const isRoomCode = Schema.is(RoomCode);

export const Route = createFileRoute("/r/$code")({ component: PrivateRoom });

function PrivateRoom() {
  const { code } = Route.useParams();
  if (!isRoomCode(code)) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-16 sm:px-6 md:pt-6">
        <AppHeader />
        <main className="hud-panel mt-10 p-6 text-center sm:p-10">
          <p className="hud-label">Private room</p>
          <h1 className="mt-2 font-display text-3xl">No such room</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Room codes are six letters and digits. Check the link your friend sent.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Back to base</Link>
          </Button>
        </main>
      </div>
    );
  }
  return <RoomScreen key={code} room={code} />;
}
