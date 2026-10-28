import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Crosshair, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RadarScope } from "@/components/landing/RadarScope";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { loadIdentity } from "@/lib/identity";
import { useDock } from "@/lib/matchmaker";

export const Route = createFileRoute("/play")({ component: QuickMatch });

function useElapsed() {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now - startedAt;
}

function QuickMatch() {
  const navigate = useNavigate();
  // Standing in the queue lasts exactly as long as this screen is mounted.
  const dock = useDock({ enqueue: true });
  const elapsed = useElapsed();

  useEffect(() => {
    if (dock.matchedRoom) {
      void navigate({ to: "/q/$id", params: { id: dock.matchedRoom.slice(2) }, replace: true });
    }
  }, [dock.matchedRoom, navigate]);

  const others = Math.max(0, (dock.inQueue ?? 1) - 1);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-16 sm:px-6 md:pt-6">
      <AppHeader />
      <main className="mt-8 flex flex-col items-center text-center">
        <div className="w-full max-w-sm">
          <RadarScope callsign={loadIdentity().callsign} />
        </div>
        <p className="hud-label mt-8">Quick match</p>
        <h1 className="glow-green mt-1 flex items-center gap-3 font-display text-3xl sm:text-4xl">
          <Crosshair className="size-8" strokeWidth={3} aria-hidden="true" />
          Searching
        </h1>
        <p aria-live="polite" className="mt-3 text-sm text-sonar-ink/80" data-testid="queue-status">
          {dock.queued
            ? others > 0
              ? `${others} other ${others === 1 ? "pilot" : "pilots"} in line. Pairing…`
              : "You're first in line. Waiting for another pilot…"
            : "Joining the queue…"}
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
          {formatDuration(elapsed)} elapsed · {dock.online ?? "–"} online
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link to="/">
            <X aria-hidden="true" />
            Leave queue
          </Link>
        </Button>
      </main>
    </div>
  );
}
