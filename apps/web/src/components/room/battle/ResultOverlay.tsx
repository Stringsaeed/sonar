import type { EndReason, PlayerView } from "@sonar/game";
import { Eye, Loader2, LogOut, RotateCcw, Skull, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OpponentStatus } from "../OpponentStatus";
import type { PhaseOf } from "../types";

const resultLine = (won: boolean, reason: EndReason, opponent: string) => {
  switch (reason) {
    case "sunk":
      return won
        ? `Fleet destroyed. All five of ${opponent}'s ships are on the sea floor.`
        : `Fleet destroyed. ${opponent} found every last ship of yours.`;
    case "forfeit":
      return `${won ? opponent : "You"} surrendered.`;
    case "disconnect":
      return `${won ? opponent : "You"} lost connection.`;
  }
};

const accuracyOf = (phase: PhaseOf<"Over">) => {
  const shots = phase.outgoing.length;
  const hits = phase.outgoing.filter((shot) => shot.result === "hit").length;
  return { shots, hits, accuracy: shots === 0 ? 0 : Math.round((hits / shots) * 100) };
};

function RematchButton({
  rematch,
  opponent,
  onRematch,
  compact = false,
}: {
  rematch: PhaseOf<"Over">["rematch"];
  opponent: string;
  onRematch: () => void;
  compact?: boolean;
}) {
  if (rematch.me) {
    // aria-disabled rather than disabled so focus isn't dropped when the request goes out.
    return (
      <Button
        variant="outline"
        size={compact ? "sm" : "lg"}
        aria-disabled="true"
        className={cn(
          "aria-disabled:cursor-default",
          !compact && "h-auto min-h-16 w-full py-3 whitespace-normal",
        )}
      >
        <Loader2 className="animate-spin" aria-hidden="true" />
        <span className={compact ? "max-w-[12rem] truncate" : undefined}>
          Waiting for {opponent}…
        </span>
      </Button>
    );
  }
  return (
    <Button
      size={compact ? "sm" : "lg"}
      className={compact ? undefined : "h-16 w-full text-xl"}
      onClick={onRematch}
      autoFocus={!compact}
    >
      <RotateCcw className={compact ? "size-4" : "size-6"} strokeWidth={3} aria-hidden="true" />
      {rematch.opponent ? "Accept rematch" : "Rematch"}
    </Button>
  );
}

function RematchStatus({
  rematch,
  opponent,
}: {
  rematch: PhaseOf<"Over">["rematch"];
  opponent: string;
}) {
  const wantsOne = rematch.opponent && !rematch.me;
  return (
    <p
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 text-xs font-extrabold tracking-wider text-sonar-amber",
        !wantsOne && "sr-only",
      )}
    >
      {wantsOne && <span className="live-dot shrink-0" aria-hidden="true" />}
      {wantsOne
        ? `${opponent} wants a rematch!`
        : rematch.me
          ? `Rematch requested. Waiting for ${opponent}.`
          : ""}
    </p>
  );
}

/**
 * The end-of-game card. It can be tucked into a bar at the bottom so the revealed boards
 * behind it can be studied, and brought back from there.
 */
export function ResultOverlay({
  phase,
  view,
  clockOffset,
  reviewing,
  onReview,
  onRematch,
  onLeave,
}: {
  phase: PhaseOf<"Over">;
  view: PlayerView;
  clockOffset: number;
  reviewing: boolean;
  onReview: (reviewing: boolean) => void;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const titleId = useId();
  const opponent = view.opponent?.callsign ?? "Your opponent";
  const { won, reason, rematch } = phase;
  const { shots, hits, accuracy } = accuracyOf(phase);
  const headline = won ? "Victory" : "Defeat";

  return (
    <AnimatePresence>
      {reviewing ? (
        <motion.section
          key="bar"
          className="hud-panel fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-center gap-3 p-3 sm:p-4"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          aria-label="Match result"
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-display text-lg sm:text-2xl",
              won ? "glow-green" : "glow-coral",
            )}
          >
            {headline}
          </span>
          <RematchButton rematch={rematch} opponent={opponent} onRematch={onRematch} compact />
          <Button variant="outline" size="sm" onClick={() => onReview(false)} autoFocus>
            <Eye className="size-4" strokeWidth={3} aria-hidden="true" />
            <span className="max-sm:sr-only">Result</span>
          </Button>
        </motion.section>
      ) : (
        <motion.div
          key="dialog"
          className="fixed inset-0 z-40 grid place-items-center overflow-y-auto p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={(event) => {
            if (event.key === "Escape") onReview(true);
          }}
        >
          {/* Its own layer, a full screen tall (lvh), so the dim reaches under the status bar and
              Safari's floating toolbar instead of stopping at the safe area. */}
          <div
            aria-hidden="true"
            className="fixed inset-x-0 top-0 h-[calc(100lvh+env(safe-area-inset-bottom))] bg-sonar-abyss/75 backdrop-blur-[2px]"
          />
          <motion.div
            className={cn(
              "hud-panel w-full max-w-md p-6 text-center sm:p-8",
              !won && "border-sonar-coral/50",
            )}
            initial={{ scale: 0.6, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 40 }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
          >
            <div
              className={cn(
                "mx-auto grid size-20 place-items-center rounded-full",
                won
                  ? "bg-sonar-green text-primary-foreground shadow-[0_0_40px_var(--color-sonar-green)]"
                  : "bg-sonar-coral text-[#2a0307] shadow-[0_0_40px_var(--color-sonar-coral)]",
              )}
              aria-hidden="true"
            >
              {won ? (
                <Trophy className="size-10" strokeWidth={2.5} />
              ) : (
                <Skull className="size-10" strokeWidth={2.5} />
              )}
            </div>
            <h2
              id={titleId}
              className={cn(
                "mt-5 font-display text-5xl sm:text-6xl",
                won ? "glow-green" : "glow-coral",
              )}
            >
              {headline}
            </h2>
            <p className="mt-2 text-sm text-sonar-ink/75">{resultLine(won, reason, opponent)}</p>

            <dl className="mt-6 grid grid-cols-3 gap-2">
              {[
                ["Shots", shots],
                ["Hits", hits],
                ["Accuracy", `${accuracy}%`],
              ].map(([term, value]) => (
                <div key={term} className="rounded-2xl bg-black/30 py-3">
                  <dt className="hud-label">{term}</dt>
                  <dd className="font-display text-2xl">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex flex-col gap-3">
              <OpponentStatus
                opponent={view.opponent}
                clockOffset={clockOffset}
                consequence="LEAVES"
              />
              <RematchStatus rematch={rematch} opponent={opponent} />
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <RematchButton rematch={rematch} opponent={opponent} onRematch={onRematch} />
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="sm" onClick={() => onReview(true)}>
                  <Eye className="size-4" strokeWidth={3} aria-hidden="true" />
                  View boards
                </Button>
                <Button variant="outline" size="sm" onClick={onLeave}>
                  <LogOut className="size-4" strokeWidth={3} aria-hidden="true" />
                  Leave
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
