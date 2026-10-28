import type { Coord, PlayerView } from "@sonar/game";
import { useNavigate } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { useSecondsLeft, type RoomState } from "@/lib/room";
import { cn } from "@/lib/utils";
import { ClockGauge } from "./battle/ClockGauge";
import { EnemyBoard } from "./battle/EnemyBoard";
import { FleetStatus } from "./battle/FleetStatus";
import { ForfeitButton } from "./battle/ForfeitButton";
import { MiniBoard } from "./battle/MiniBoard";
import { describeShot, fleetStatus, isSunk, shipName, shotLog, type Turn } from "./battle/model";
import { ResultOverlay } from "./battle/ResultOverlay";
import { Ticker } from "./battle/Ticker";
import { useArrivals } from "./battle/useArrivals";
import { OpponentStatus } from "./OpponentStatus";
import type { PhaseScreenProps } from "./types";
import "./battle/battle.css";

const TURN_COPY: Record<Turn, { title: string; glow: string }> = {
  mine: { title: "Your shot", glow: "glow-green" },
  theirs: { title: "Incoming", glow: "glow-coral" },
  over: { title: "Cease fire", glow: "text-white/60" },
};

function Matchup({ me, opponent }: { me: string; opponent: string }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="hud-label !text-[0.55rem]">You</div>
        <div className="truncate font-display text-xs text-sonar-green sm:text-base">{me}</div>
      </div>
      <span className="shrink-0 font-display text-sm text-white/40 sm:text-lg" aria-hidden="true">
        VS
      </span>
      <div className="min-w-0 flex-1 text-right sm:text-left">
        <div className="hud-label !text-[0.55rem]">Target</div>
        <div className="truncate font-display text-xs text-sonar-coral sm:text-base">
          {opponent}
        </div>
      </div>
    </>
  );
}

/** The battle cockpit: the enemy radar centre stage, my fleet, clock, damage and log around it. */
export function BattleScreen({
  view,
  phase,
  clockOffset,
  rejection,
  send,
}: PhaseScreenProps<"Battle" | "Over">) {
  const navigate = useNavigate();
  const over = phase._tag === "Over" ? phase : undefined;
  const opponent = view.opponent?.callsign ?? "Opponent";
  const turn: Turn = phase._tag === "Over" ? "over" : phase.myTurn ? "mine" : "theirs";
  const secondsLeft = useSecondsLeft(
    phase._tag === "Battle" ? phase.deadline : undefined,
    clockOffset,
  );

  const arrivals = useArrivals(phase.incoming, phase.outgoing);
  const log = shotLog(phase.incoming, phase.outgoing);
  const lastSink = log.findLast((entry) => entry.shot.sunk !== undefined);

  // A shot stays "firing" until the server answers with a new view or a rejection.
  const [pending, setPending] = useState<{
    at: Coord;
    view: PlayerView;
    rejection: RoomState["rejection"];
  }>();
  const firing =
    pending && pending.view === view && pending.rejection === rejection ? pending.at : undefined;
  const armed = turn === "mine" && firing === undefined;

  const fire = (at: Coord) => {
    if (!armed) return;
    setPending({ at, view, rejection });
    send({ _tag: "Fire", at });
  };

  const [reviewing, setReviewing] = useState(false);
  const leave = () => {
    send({ _tag: "Leave" });
    void navigate({ to: "/" });
  };

  const knownEnemy = phase._tag === "Over" ? phase.enemyFleet : phase.enemySunk;
  const myLosses = phase.myFleet.filter((ship) => isSunk(ship, phase.incoming)).length;
  const copy = TURN_COPY[turn];

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "mx-auto flex min-h-dvh max-w-[1440px] flex-col px-3 pt-3 pb-8 sm:px-6",
          over && reviewing && "pb-28",
        )}
        // While the result dialog is up, the cockpit behind it is out of reach.
        inert={over !== undefined && !reviewing}
      >
        <header className="hud-panel flex items-center gap-2 !rounded-full px-3 py-2 sm:gap-4 sm:px-5">
          <Matchup me={view.me.callsign} opponent={opponent} />
          {!over && <ForfeitButton onForfeit={() => send({ _tag: "Forfeit" })} />}
        </header>

        {!over && (
          <div className="mt-3 empty:hidden">
            <OpponentStatus
              opponent={view.opponent}
              clockOffset={clockOffset}
              consequence="FORFEITS"
            />
          </div>
        )}

        <main className="mt-3 grid flex-1 grid-cols-[8.5rem_minmax(0,1fr)] content-start gap-3 sm:mt-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5 lg:grid-cols-[17rem_minmax(0,1fr)_20rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:content-stretch">
          <section
            className="hud-panel flex flex-col p-3 lg:col-start-1 lg:row-start-1 lg:p-5"
            aria-labelledby="battle-mine-title"
          >
            <h2 id="battle-mine-title" className="hud-label mb-2 flex justify-between">
              <span>Your fleet</span>
              <span className="text-sonar-coral/90 max-lg:hidden">{myLosses} lost</span>
            </h2>
            <MiniBoard fleet={phase.myFleet} incoming={phase.incoming} arrival={arrivals.theirs} />
          </section>

          <section
            className={cn(
              "hud-panel flex items-center gap-3 p-3 sm:gap-5 lg:col-start-3 lg:row-start-1 lg:flex-col lg:justify-center lg:p-5 lg:text-center",
              turn !== "mine" && "border-sonar-coral/40",
            )}
            aria-label="Turn clock"
          >
            <ClockGauge turn={turn} secondsLeft={secondsLeft} opponent={opponent} />
            <div className="min-w-0">
              <p
                className={cn(
                  "font-display text-base leading-tight sm:text-2xl lg:text-3xl",
                  copy.glow,
                )}
              >
                {firing ? "Firing…" : copy.title}
              </p>
              <p className="mt-1 text-[0.7rem] text-sonar-ink/65 sm:text-xs">
                {turn === "over"
                  ? "Engagement over."
                  : turn === "mine"
                    ? "Pick a cell. Auto-miss at zero."
                    : `${opponent} is aiming…`}
              </p>
              {lastSink?.shot.sunk && (
                <p className="mt-2 text-[0.68rem] font-extrabold tracking-wider text-sonar-amber sm:text-xs">
                  {lastSink.mine ? "▲ Sank their " : "▼ Lost your "}
                  {shipName(lastSink.shot.sunk)}
                </p>
              )}
            </div>
          </section>

          <section
            className="col-span-2 flex min-w-0 justify-center lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1"
            aria-label="Enemy radar"
          >
            <div className="w-full lg:w-[min(100%,calc(100dvh-8.5rem))]">
              <EnemyBoard
                opponent={opponent}
                outgoing={phase.outgoing}
                known={knownEnemy}
                turn={turn}
                armed={armed}
                firing={firing}
                arrival={arrivals.mine}
                sink={arrivals.sink}
                onFire={fire}
              />
            </div>
          </section>

          <section
            className="hud-panel col-span-2 grid grid-cols-2 content-start gap-4 p-3 sm:p-5 lg:col-span-1 lg:col-start-1 lg:row-start-2 lg:grid-cols-1 lg:gap-8"
            aria-label="Fleet status"
          >
            <FleetStatus
              title={view.me.callsign}
              tone="green"
              ships={fleetStatus(phase.myFleet, phase.incoming, true)}
            />
            <FleetStatus
              title={opponent}
              tone="coral"
              ships={fleetStatus(knownEnemy, phase.outgoing, over !== undefined)}
            />
          </section>

          <section className="col-span-2 flex min-h-0 flex-col lg:col-span-1 lg:col-start-3 lg:row-start-2">
            <Ticker log={log} />
          </section>
        </main>
      </div>

      {/* Outside the inert cockpit so the game-ending shot is still announced. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {arrivals.latest ? describeShot(arrivals.latest, opponent) : ""}
      </p>

      {over && (
        <ResultOverlay
          phase={over}
          view={view}
          clockOffset={clockOffset}
          reviewing={reviewing}
          onReview={setReviewing}
          onRematch={() => send({ _tag: "Rematch" })}
          onLeave={leave}
        />
      )}
    </MotionConfig>
  );
}
