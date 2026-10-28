import type { MatchSummary, PlayerRecord } from "@sonar/game";
import { formatAgo, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const END_REASON: Record<MatchSummary["endReason"], string> = {
  sunk: "Fleet sunk",
  forfeit: "Forfeit",
  disconnect: "Disconnect",
};

const initials = (callsign: string) =>
  callsign
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2);

/** The player's per-device record. `record` is undefined while it loads or when unavailable. */
export function PilotCard({
  callsign,
  record,
}: {
  callsign: string;
  record: PlayerRecord | undefined;
}) {
  const wins = record?.wins ?? 0;
  const losses = record?.losses ?? 0;
  const played = wins + losses;
  const winRate = played ? Math.round((wins / played) * 100) : 0;

  return (
    <section className="hud-panel p-5 sm:p-6" aria-labelledby="pilot-card-title">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-sonar-green bg-sonar-green-deep font-display text-2xl text-sonar-green shadow-[0_0_24px_rgb(57_255_136/0.35)]"
        >
          {initials(callsign)}
        </div>
        <div className="min-w-0">
          <p className="hud-label">Pilot card</p>
          <h2 id="pilot-card-title" className="truncate font-display text-xl sm:text-2xl">
            {callsign}
          </h2>
          <p className="text-xs text-muted-foreground">Callsign assigned at random. No account.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-sonar-green-deep py-3">
          <div className="glow-green font-display text-3xl">{wins}</div>
          <div className="hud-label">Wins</div>
        </div>
        <div className="rounded-2xl bg-sonar-coral-deep py-3">
          <div className="glow-coral font-display text-3xl">{losses}</div>
          <div className="hud-label">Losses</div>
        </div>
        <div className="rounded-2xl bg-sonar-cyan-deep py-3">
          <div className="font-display text-3xl text-sonar-cyan">{winRate}%</div>
          <div className="hud-label">Win rate</div>
        </div>
      </div>
      <div
        role="img"
        aria-label={`Record ${wins} wins, ${losses} losses`}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-sonar-coral-deep"
      >
        <div
          className="h-full rounded-full bg-sonar-green shadow-[0_0_12px_var(--color-sonar-green)]"
          style={{ width: `${winRate}%` }}
        />
      </div>

      <h3 className="hud-label mt-6 mb-2">Recent sorties</h3>
      {record && record.recent.length > 0 ? (
        <ul className="space-y-2">
          {record.recent.map((match) => (
            <li
              key={match.id}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-muted px-3 py-2.5"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl font-display text-sm",
                  match.won ? "bg-sonar-green text-[#03230f]" : "bg-sonar-coral text-[#2a0307]",
                )}
              >
                {match.won ? "W" : "L"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold">
                  <span className="sr-only">{match.won ? "Won" : "Lost"} against </span>
                  {match.opponent}
                </div>
                <div className="text-[0.7rem] text-muted-foreground">
                  {END_REASON[match.endReason]} ·{" "}
                  {match.mode === "quick" ? "Quick match" : "Private room"} ·{" "}
                  {formatAgo(match.endedAt)}
                </div>
              </div>
              <div className="text-right text-[0.7rem] leading-tight text-sonar-ink/70">
                <div>
                  <span className="font-extrabold text-sonar-ink">{match.shotsFired}</span> shots
                </div>
                <div>{formatDuration(match.durationMs)}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-muted px-3 py-4 text-sm text-muted-foreground">
          No sorties yet. Hit Quick Match to log your first.
        </p>
      )}
    </section>
  );
}
