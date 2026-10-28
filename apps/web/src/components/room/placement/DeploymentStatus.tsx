import { Timer } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { useSecondsLeft } from "@/lib/room";
import { cn } from "@/lib/utils";
import "./placement.css";

const URGENT_SECONDS = 15;

/** Title, the rival's progress and the placement clock. Urgent only while you can still act. */
export function DeploymentStatus({
  round,
  rival,
  rivalReady,
  deadline,
  clockOffset,
  locked,
}: {
  round: number;
  rival: string;
  rivalReady: boolean;
  deadline: number;
  clockOffset: number;
  locked: boolean;
}) {
  const secondsLeft = useSecondsLeft(deadline, clockOffset) ?? 0;
  const urgent = !locked && secondsLeft <= URGENT_SECONDS;
  const time = formatDuration(secondsLeft * 1000);

  return (
    <section
      aria-labelledby="deployment-title"
      className={cn("hud-panel p-3.5 transition-colors sm:p-5", urgent && "border-sonar-coral/60")}
    >
      <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-stretch lg:gap-4">
        <div className="min-w-0">
          <p className="hud-label">Deployment{round > 1 && ` · Round ${round}`}</p>
          <h1 id="deployment-title" className="font-display text-lg leading-tight sm:text-2xl">
            Deploy your fleet
          </h1>
        </div>

        <div
          role="timer"
          aria-label={`${time} left to place ships`}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-2xl border-2 px-2.5 py-1.5 transition-colors sm:gap-2.5 sm:px-3 sm:py-2 lg:px-4 lg:py-3",
            urgent
              ? "border-sonar-coral/70 bg-sonar-coral-deep/80"
              : "border-white/8 bg-sonar-abyss/60",
          )}
        >
          <Timer
            className={cn(
              "size-5 shrink-0 lg:size-7",
              urgent ? "text-sonar-coral" : locked ? "text-sonar-ink/40" : "text-sonar-green/70",
            )}
            strokeWidth={2.5}
            aria-hidden="true"
          />
          <span
            className={cn(
              "inline-block font-display text-2xl leading-none tabular-nums sm:text-3xl lg:text-4xl",
              urgent ? "placement-urgent glow-coral" : locked ? "text-sonar-ink/50" : "glow-green",
            )}
          >
            {time}
          </span>
        </div>
      </div>

      <p
        role="status"
        className={cn(
          "mt-3 flex items-center gap-2 text-[0.7rem] font-extrabold tracking-wider uppercase sm:text-xs",
          rivalReady ? "text-sonar-green" : "text-sonar-amber",
        )}
      >
        <span className={cn("live-dot shrink-0", rivalReady && "animate-none")} />
        <span className="min-w-0 break-words">
          {rival} {rivalReady ? "is ready" : "is still placing"}
        </span>
      </p>

      <p
        className={cn(
          "mt-3 border-t border-white/10 pt-3 text-[0.7rem] leading-snug sm:text-xs",
          urgent ? "font-extrabold text-sonar-coral" : "text-muted-foreground",
        )}
      >
        {locked
          ? `${rival} has until 0:00. Anything they haven't placed by then is placed for them.`
          : "At 0:00, any ships still in your tray are placed for you at random."}
      </p>
    </section>
  );
}
