import { createFileRoute } from "@tanstack/react-router";
import { Check, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev/sounds")({ component: Soundboard });

interface BoardState {
  readonly prompts: Record<string, { prompt: string; seconds: number; loop?: boolean }>;
  readonly picks: Record<string, number>;
  readonly takes: Record<string, number[]>;
}

const audition = (src: string) => void new Audio(src).play();

/** Dev-only: audition the generated takes for each cue and choose the one that ships. */
function Soundboard() {
  const [state, setState] = useState<BoardState>();
  const [saving, setSaving] = useState<string>();

  const load = () =>
    fetch("/__sfx/state")
      .then((r) => r.json() as Promise<BoardState>)
      .then(setState);

  useEffect(() => {
    if (import.meta.env.DEV) void load();
  }, []);

  const pick = async (cue: string, take: number) => {
    setSaving(cue);
    await fetch("/__sfx/pick", { method: "POST", body: JSON.stringify({ cue, take }) });
    await load();
    setSaving(undefined);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 pb-16 sm:px-6 md:pt-6">
      <AppHeader />
      <main className="mt-8">
        <p className="hud-label">Dev tools</p>
        <h1 className="glow-green font-display text-3xl">Soundboard</h1>
        {!import.meta.env.DEV ? (
          <p className="mt-4 text-sm text-muted-foreground">Only available in development.</p>
        ) : !state ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {Object.entries(state.prompts).map(([cue, spec]) => {
              const chosen = state.picks[cue] ?? 1;
              return (
                <li key={cue} className="hud-panel p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-lg">{cue}</h2>
                    <span className="hud-label">
                      {spec.seconds}s{spec.loop ? " · loop" : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{spec.prompt}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(state.takes[cue] ?? []).map((take) => (
                      <div
                        key={take}
                        className={cn(
                          "flex items-center gap-1 rounded-full border-2 p-1",
                          take === chosen ? "border-sonar-green" : "border-white/10",
                        )}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Play ${cue} take ${take}`}
                          onClick={() => audition(`/__sfx/takes/${cue}/${take}.mp3`)}
                        >
                          <Play className="size-4" aria-hidden="true" /> {take}
                        </Button>
                        {take === chosen ? (
                          <Check className="mx-2 size-4 text-sonar-green" aria-label="Chosen" />
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={saving === cue}
                            onClick={() => void pick(cue, take)}
                          >
                            Use
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      size="sm"
                      onClick={() => audition(`/sfx/${cue}.webm?v=${chosen}-${Date.now()}`)}
                    >
                      Shipped
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
