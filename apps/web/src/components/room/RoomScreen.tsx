import { Link } from "@tanstack/react-router";
import { Check, Copy, DoorOpen, Loader2, WifiOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useRoom, useSecondsLeft } from "@/lib/room";
import { formatDuration } from "@/lib/format";
import { BattleScreen } from "./BattleScreen";
import { PlacementScreen } from "./PlacementScreen";
import type { PhaseScreenProps } from "./types";

function Card({
  label,
  title,
  children,
}: {
  label: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-16 sm:px-6 md:pt-6">
      <AppHeader />
      <main className="hud-panel mt-10 p-6 text-center sm:p-10">
        <p className="hud-label">{label}</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">{title}</h1>
        {children}
      </main>
    </div>
  );
}

function HomeButton() {
  return (
    <Button asChild variant="outline" className="mt-6">
      <Link to="/">Back to base</Link>
    </Button>
  );
}

function Lobby({ view, phase, clockOffset, send }: PhaseScreenProps<"Waiting">) {
  const [copied, setCopied] = useState(false);
  const secondsLeft = useSecondsLeft(phase.expiresAt, clockOffset) ?? 0;

  const copyLink = async () => {
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card
      label="Private room · waiting for an opponent"
      title={
        <span className="tracking-[0.2em] text-sonar-cyan [text-shadow:0_0_14px_rgb(127_233_255/0.6)] sm:text-6xl">
          {view.room}
        </span>
      }
    >
      <p data-testid="room-status" aria-live="polite" className="mt-4 text-sm text-sonar-ink/80">
        Send this link to a friend. The game starts the moment they open it.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Room closes in {formatDuration(secondsLeft * 1000)} if nobody joins.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={() => void copyLink()}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Link copied" : "Copy invite link"}
        </Button>
        <Button asChild variant="outline">
          <Link to="/" onClick={() => send({ _tag: "Leave" })}>
            <DoorOpen aria-hidden="true" />
            Cancel room
          </Link>
        </Button>
      </div>
    </Card>
  );
}

const REJECTED_COPY = {
  "room-full": "This room already has two players.",
  "room-closed": "This room has closed.",
} as const;

export function RoomScreen({ room }: { room: string }) {
  const { status, view, rejection, clockOffset, send } = useRoom(room);

  if (!view) {
    if (rejection && (rejection.reason === "room-full" || rejection.reason === "room-closed")) {
      return (
        <Card label={`Room ${room}`} title="Can't join">
          <p className="mt-3 text-sm text-muted-foreground">{REJECTED_COPY[rejection.reason]}</p>
          <HomeButton />
        </Card>
      );
    }
    return (
      <Card label={`Room ${room}`} title="Connecting">
        <Loader2 className="mx-auto mt-4 size-8 animate-spin text-sonar-green" aria-hidden="true" />
        <p data-testid="room-status" className="sr-only">
          Connecting
        </p>
      </Card>
    );
  }

  const shared = { view, clockOffset, rejection, send };
  const phase = view.phase;
  return (
    <>
      {status === "reconnecting" && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-2 bg-sonar-amber pt-[calc(0.375rem+env(safe-area-inset-top))] pb-1.5 font-mono text-xs font-extrabold tracking-wider text-[#2a1d00]"
        >
          <WifiOff className="size-4" aria-hidden="true" /> CONNECTION LOST — RECONNECTING
        </div>
      )}
      {phase._tag === "Waiting" &&
        (view.mode === "quick" ? (
          <Card label="Quick match" title="Opponent found">
            <Loader2
              className="mx-auto mt-4 size-8 animate-spin text-sonar-green"
              aria-hidden="true"
            />
            <p data-testid="room-status" className="mt-3 text-sm text-muted-foreground">
              Waiting for them to connect…
            </p>
          </Card>
        ) : (
          <Lobby {...shared} phase={phase} />
        ))}
      {phase._tag === "Placing" && <PlacementScreen {...shared} phase={phase} />}
      {(phase._tag === "Battle" || phase._tag === "Over") && (
        <BattleScreen {...shared} phase={phase} />
      )}
      {phase._tag === "Closed" && (
        <Card
          label={view.mode === "quick" ? "Quick match" : `Room ${view.room}`}
          title="Room closed"
        >
          <p className="mt-3 text-sm text-muted-foreground">
            {view.opponent
              ? "The pairing has ended. Start a new room or jump into Quick Match."
              : "Your opponent never showed up."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/play">Find a match</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to base</Link>
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
