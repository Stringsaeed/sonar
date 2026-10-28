import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/play")({ component: QuickMatch });

function QuickMatch() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-16 sm:px-6 md:pt-6">
      <AppHeader />
      <main className="hud-panel mt-10 p-6 text-center sm:p-10">
        <p className="hud-label">Quick match</p>
        <h1 className="glow-green mt-2 font-display text-3xl sm:text-4xl">Queue offline</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Matchmaking switches on with the game engine. Until then, start a private room and send a
          friend the link.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/">Back to base</Link>
        </Button>
      </main>
    </div>
  );
}
