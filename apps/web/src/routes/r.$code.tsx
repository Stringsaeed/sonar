import { useAtomValue } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import { AsyncResult } from "effect/reactivity";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { roomAtom } from "@/lib/room";

export const Route = createFileRoute("/r/$code")({ component: PrivateRoom });

function PrivateRoom() {
  const { code } = Route.useParams();
  const latest = useAtomValue(roomAtom(code));
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-16 sm:px-6 md:pt-6">
      <AppHeader />
      <main className="hud-panel mt-10 p-6 text-center sm:p-10">
        <p className="hud-label">Private room</p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.2em] text-sonar-cyan [text-shadow:0_0_14px_rgb(127_233_255/0.6)] sm:text-6xl">
          {code}
        </h1>
        <p
          data-testid="room-status"
          aria-live="polite"
          className="mt-4 text-sm font-semibold text-sonar-ink/80"
        >
          {AsyncResult.match(latest, {
            onInitial: () => "Connecting…",
            onFailure: () => "Connection lost",
            onSuccess: ({ value }) =>
              value._tag === "Welcome"
                ? `Connected · ${value.players}/2 players`
                : `Rejected: ${value.reason}`,
          })}
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => void copyLink()}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Link copied" : "Copy invite link"}
        </Button>
      </main>
    </div>
  );
}
