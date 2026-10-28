import { ROOM_CODE_LENGTH } from "@sonar/game";
import { DoorOpen, Link2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { normalizeRoomCode } from "@/lib/room-code";
import { cn } from "@/lib/utils";

const RULES = [
  "10×10 grid, 5 ships",
  "30s a shot, then auto-miss",
  "Hit or miss, turns alternate",
  "Bail out and it's a forfeit",
];

export function PrivateRoomPanel({
  onCreateRoom,
  onJoinRoom,
}: {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
}) {
  const inputId = useId();
  const [code, setCode] = useState("");
  const ready = code.length === ROOM_CODE_LENGTH;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) onJoinRoom(code);
  };

  return (
    <section className="hud-panel flex flex-col p-5 sm:p-6" aria-labelledby="private-room-title">
      <p className="hud-label">Play a friend</p>
      <h2 id="private-room-title" className="font-display text-xl sm:text-2xl">
        Private room
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Spin up a room and send the link. Whoever opens it first is your opponent.
      </p>

      <Button variant="secondary" size="lg" className="mt-5 w-full" onClick={onCreateRoom}>
        <Link2 strokeWidth={3} aria-hidden="true" />
        Create room
      </Button>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        <span className="hud-label">or join by code</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor={inputId} className="sr-only">
          Room code, {ROOM_CODE_LENGTH} characters
        </label>
        <div className="group relative grid grid-cols-6 gap-1.5">
          {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn(
                "grid aspect-[4/5] place-items-center rounded-xl border-2 border-input bg-sonar-abyss/90 font-display text-[1.35rem] text-sonar-cyan [text-shadow:0_0_10px_rgb(127_233_255/0.6)]",
                i === Math.min(code.length, ROOM_CODE_LENGTH - 1) &&
                  "group-focus-within:border-sonar-cyan group-focus-within:shadow-[0_0_16px_rgb(127_233_255/0.45)]",
              )}
            >
              {code[i] ?? <span className="text-white/15">·</span>}
            </span>
          ))}
          <input
            id={inputId}
            value={code}
            onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={ROOM_CODE_LENGTH}
            className="absolute inset-0 w-full cursor-text opacity-0"
          />
        </div>
        <Button type="submit" variant="outline" disabled={!ready} className="w-full">
          <DoorOpen className="size-4" strokeWidth={3} aria-hidden="true" />
          Join room
        </Button>
      </form>

      <ul className="mt-6 grid grid-cols-2 gap-2 border-t border-white/10 pt-5 text-[0.7rem] text-sonar-ink/70 md:mt-auto">
        {RULES.map((rule) => (
          <li key={rule}>
            <span className="text-sonar-green">▸</span> {rule}
          </li>
        ))}
      </ul>
    </section>
  );
}
