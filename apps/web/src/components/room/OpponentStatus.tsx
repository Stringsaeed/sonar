import type { PlayerView } from "@sonar/game";
import { WifiOff } from "lucide-react";
import { useSecondsLeft } from "@/lib/room";

/**
 * Banner shown while the opponent is disconnected, counting down their reconnect window.
 * Renders nothing while they're connected.
 */
export function OpponentStatus({
  opponent,
  clockOffset,
  consequence,
}: {
  opponent: PlayerView["opponent"];
  clockOffset: number;
  /** What happens when the window closes, e.g. "forfeits" or "leaves". */
  consequence: string;
}) {
  const secondsLeft = useSecondsLeft(opponent?.graceUntil, clockOffset);
  if (!opponent || opponent.connected) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 rounded-2xl border-2 border-sonar-amber/60 bg-sonar-amber/10 px-4 py-2 text-xs font-extrabold tracking-wider text-sonar-amber"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      <span>
        {opponent.callsign.toUpperCase()} LOST CONNECTION
        {secondsLeft !== undefined && ` — ${consequence} IN ${secondsLeft}s`}
      </span>
    </div>
  );
}
