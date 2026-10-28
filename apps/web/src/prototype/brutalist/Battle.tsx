// PROTOTYPE — throwaway. Variant B battle: the board-game table, neo-brutalist.
import { BOARD_SIZE, FLEET, type ShipKind } from "@sonar/game";
import { Link } from "@tanstack/react-router";
import { Crosshair, Flag, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  COLUMN_LABELS,
  cellLabel,
  shipAt,
  shotAt,
  useCountdown,
  type BattleProps,
  type BattleView,
  type Cell,
  type LogEntry,
  type Ship,
  type Shot,
} from "../fixtures";
import "./brutalist.css";

const SHIP_NAME: Record<ShipKind, string> = {
  carrier: "Carrier",
  battleship: "Battleship",
  cruiser: "Cruiser",
  submarine: "Submarine",
  destroyer: "Destroyer",
};

const CELLS: ReadonlyArray<Cell> = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => ({
  x: i % BOARD_SIZE,
  y: Math.floor(i / BOARD_SIZE),
}));

const isSame = (a: Cell | undefined, b: Cell) => !!a && a.x === b.x && a.y === b.y;

const describeEntry = (entry: LogEntry, enemy: string) => {
  const who = entry.by === "me" ? "You" : enemy;
  const sunk = entry.sunk
    ? entry.by === "me"
      ? ` You sank their ${SHIP_NAME[entry.sunk].toLowerCase()}.`
      : ` They sank your ${SHIP_NAME[entry.sunk].toLowerCase()}.`
    : "";
  return `${who} fired at ${cellLabel(entry)}: ${entry.result}.${sunk}`;
};

export function BrutalistBattle({ view, fire, forfeit, rematch }: BattleProps) {
  const seconds = useCountdown(view.deadline);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const lastEntry = view.log[view.log.length - 1];
  const lastSink = view.log.findLast((entry) => entry.sunk);

  // Flash a big "SUNK!" stamp when a fresh sinking lands.
  const [sinkFlash, setSinkFlash] = useState<LogEntry | undefined>();
  useEffect(() => {
    if (!lastSink || Date.now() - lastSink.at > 4000) return;
    setSinkFlash(lastSink);
    const timer = setTimeout(() => setSinkFlash(undefined), 2600);
    return () => clearTimeout(timer);
  }, [lastSink]);

  const hits = view.outgoing.filter((s) => s.result === "hit").length;

  return (
    <div className="v-brutalist min-h-dvh overflow-x-clip pb-24">
      <div className="mx-auto max-w-[1440px] px-3 pt-3 sm:px-6 lg:px-8 lg:pt-5">
        {/* Header */}
        <header className="brutalist-rule flex items-center gap-3 pb-3 sm:gap-5">
          <Link
            to="/"
            search={{ variant: "B" }}
            className="brutalist-display shrink-0 text-4xl sm:text-5xl"
            aria-label="Sonar, back to the front page"
          >
            Sonar<span className="text-(--b-red)">.</span>
          </Link>
          <p className="min-w-0 flex-1 leading-tight">
            <span className="brutalist-condensed block text-xs opacity-70 sm:text-sm">
              Quick match · live
            </span>
            <span className="text-sm font-extrabold sm:text-lg">
              {view.me.callsign}
              <span className="brutalist-display mx-1.5 inline-block bg-(--b-ink) px-1.5 py-0.5 text-sm text-(--b-yellow) sm:text-base">
                vs
              </span>
              {view.enemy.callsign}
            </span>
          </p>
          {confirmForfeit ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="brutalist-condensed hidden text-sm sm:inline">Strike colours?</span>
              <button
                type="button"
                onClick={() => {
                  setConfirmForfeit(false);
                  forfeit();
                }}
                className="brutalist-btn brutalist-btn-sm brutalist-condensed bg-(--b-red) px-3 py-1.5 text-sm text-(--b-white)"
              >
                Yes, forfeit
              </button>
              <button
                type="button"
                onClick={() => setConfirmForfeit(false)}
                className="brutalist-btn brutalist-btn-sm brutalist-condensed bg-(--b-card) px-3 py-1.5 text-sm"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!!view.winner}
              onClick={() => setConfirmForfeit(true)}
              className="brutalist-btn brutalist-btn-sm brutalist-condensed flex shrink-0 items-center gap-1.5 bg-(--b-card) px-3 py-1.5 text-sm sm:text-base"
            >
              <Flag className="size-4" strokeWidth={3} />
              Forfeit
            </button>
          )}
        </header>

        <main className="mt-5 grid gap-5 lg:mt-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_22rem] lg:gap-7">
          {/* Turn banner + clock */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:gap-5 lg:col-span-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_22rem] lg:gap-7">
            <TurnBanner view={view} />
            <Clock view={view} seconds={seconds} />
          </div>

          {/* Target grid */}
          <CaseHalf
            title="Target grid"
            tone="red"
            meta={`${view.enemy.callsign}'s waters · ${view.outgoing.length} shots · ${hits} hits`}
          >
            <TargetBoard view={view} fire={fire} />
          </CaseHalf>

          {/* Your fleet */}
          <CaseHalf
            title="Your fleet"
            tone="yellow"
            meta={`${view.incoming.length} incoming · ${view.mySunk.length} lost`}
            compact
          >
            <FleetBoard view={view} />
          </CaseHalf>

          {/* Sidebar */}
          <aside className="flex flex-col gap-5 lg:col-start-3 lg:row-start-2 lg:h-0 lg:min-h-full lg:gap-7">
            <FleetChecklist view={view} />
            <Dispatches view={view} lastSink={lastSink} />
          </aside>
        </main>
      </div>

      <div aria-live="polite" className="sr-only">
        {lastEntry ? describeEntry(lastEntry, view.enemy.callsign) : ""}
      </div>

      <AnimatePresence>
        {sinkFlash && !view.winner && (
          <motion.div
            key={sinkFlash.at}
            aria-hidden
            initial={{ opacity: 0, scale: 1.8, rotate: -14 }}
            animate={{ opacity: 1, scale: 1, rotate: -6 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
            className="pointer-events-none fixed inset-x-0 top-[28%] z-40 flex justify-center px-4"
          >
            <div
              className={`brutalist-box px-6 py-4 text-center ${sinkFlash.by === "me" ? "bg-(--b-red) text-(--b-white)" : "bg-(--b-ink) text-(--b-yellow)"}`}
            >
              <p className="brutalist-display text-7xl sm:text-8xl">Sunk!</p>
              <p className="brutalist-condensed mt-1 text-lg sm:text-xl">
                {sinkFlash.by === "me"
                  ? `You sank their ${SHIP_NAME[sinkFlash.sunk!]}`
                  : `They sank your ${SHIP_NAME[sinkFlash.sunk!]}`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {view.winner && <ResultOverlay view={view} rematch={rematch} />}
      </AnimatePresence>
    </div>
  );
}

function TurnBanner({ view }: { view: BattleView }) {
  const content = view.winner
    ? {
        kicker: "Final",
        title: view.winner === "me" ? "Victory" : "Defeated",
        sub: "The match is over.",
        className: "bg-(--b-ink) text-(--b-white)",
      }
    : view.turn === "me"
      ? {
          kicker: "Your move",
          title: "Your shot",
          sub: "Pick a square on the target grid.",
          className: "bg-(--b-yellow)",
        }
      : {
          kicker: "Heads down",
          title: "Incoming",
          sub: `${view.enemy.callsign} is taking aim at your fleet.`,
          className: "bg-(--b-red) text-(--b-white)",
        };

  return (
    <div className="relative lg:col-span-2">
      <div
        key={view.winner ?? view.turn}
        className={`brutalist-box brutalist-stamp flex h-full flex-col justify-center px-4 py-3 sm:px-6 sm:py-4 ${content.className}`}
        style={{ "--brutalist-tilt": "-1deg" } as CSSProperties}
      >
        <p className="brutalist-condensed text-xs sm:text-sm">{content.kicker}</p>
        <p className="brutalist-display text-[clamp(2.6rem,12vw,5.5rem)]">{content.title}</p>
        <p className="mt-1 text-sm leading-snug font-semibold sm:text-base">{content.sub}</p>
      </div>
    </div>
  );
}

function Clock({ view, seconds }: { view: BattleView; seconds: number }) {
  const urgent = !view.winner && seconds <= 10;
  const whose = view.turn === "me" ? "Your clock" : "Their clock";
  const fraction = view.winner ? 0 : Math.min(1, seconds / view.turnSeconds);
  return (
    <div
      role="timer"
      aria-label={
        view.winner ? "Clock stopped" : `${seconds} seconds left on ${whose.toLowerCase()}`
      }
      className={`brutalist-box flex w-28 flex-col justify-between p-2.5 sm:w-40 sm:p-4 lg:w-auto lg:flex-row lg:items-center lg:gap-4 ${urgent ? "bg-(--b-red) text-(--b-white)" : "bg-(--b-ink) text-(--b-yellow)"}`}
    >
      <p className="brutalist-condensed text-xs text-current sm:text-sm lg:order-2 lg:flex-1">
        <span className="block">{view.winner ? "Clock" : whose}</span>
        <span className="hidden lg:block">
          {view.winner ? "Stopped" : `Auto-miss at 0 · ${view.turnSeconds}s a turn`}
        </span>
        <span className="mt-3 hidden h-3 border-2 border-current lg:block">
          <span
            className="brutalist-clock-bar block h-full bg-current"
            style={{ width: `${fraction * 100}%` }}
          />
        </span>
      </p>
      <p
        className={`brutalist-display text-[4.25rem] tabular-nums sm:text-8xl lg:text-[7.5rem] ${urgent ? "brutalist-urgent" : ""}`}
      >
        {view.winner ? "--" : String(seconds).padStart(2, "0")}
      </p>
      <span className="block h-2.5 border-2 border-current lg:hidden">
        <span
          className="brutalist-clock-bar block h-full bg-current"
          style={{ width: `${fraction * 100}%` }}
        />
      </span>
    </div>
  );
}

function CaseHalf({
  title,
  meta,
  tone,
  compact,
  children,
}: {
  title: string;
  meta: string;
  tone: "red" | "yellow";
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={`brutalist-box bg-(--b-card) lg:self-start ${compact ? "mx-auto w-[82%] sm:w-[70%] lg:w-full" : ""}`}
    >
      <div
        className={`flex items-baseline justify-between gap-3 border-b-[3px] border-(--b-ink) px-3 py-2 lg:border-b-4 lg:px-4 ${tone === "red" ? "bg-(--b-red) text-(--b-white)" : "bg-(--b-yellow)"}`}
      >
        <h2 className="brutalist-display text-2xl sm:text-3xl lg:text-4xl">{title}</h2>
        <p className="brutalist-condensed truncate text-[0.7rem] sm:text-xs lg:text-sm">{meta}</p>
      </div>
      <div className="p-2.5 sm:p-4">{children}</div>
    </section>
  );
}

function BoardFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto]">
      <span />
      <div className="brutalist-condensed grid grid-cols-10 px-[3px] pb-1 text-center text-[0.7rem] sm:text-sm">
        {COLUMN_LABELS.map((letter) => (
          <span key={letter} aria-hidden>
            {letter}
          </span>
        ))}
      </div>
      <div className="brutalist-condensed grid grid-rows-10 py-[3px] pr-1.5 text-right text-[0.7rem] sm:pr-2 sm:text-sm">
        {COLUMN_LABELS.map((_, row) => (
          <span key={row} aria-hidden className="flex items-center justify-end">
            {row + 1}
          </span>
        ))}
      </div>
      <div
        role="group"
        aria-label={label}
        className="brutalist-water relative aspect-square border-[3px] border-(--b-ink)"
      >
        {children}
      </div>
    </div>
  );
}

function Hull({ ship, sunk }: { ship: Ship; sunk: boolean }) {
  const xs = ship.cells.map((c) => c.x);
  const ys = ship.cells.map((c) => c.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0 + 1;
  const h = Math.max(...ys) - y0 + 1;
  return (
    <span
      aria-hidden
      className={`brutalist-hull ${sunk ? "is-sunk" : ""}`}
      style={{
        left: `calc(${x0 * 10}% + 3px)`,
        top: `calc(${y0 * 10}% + 3px)`,
        width: `calc(${w * 10}% - 5px)`,
        height: `calc(${h * 10}% - 5px)`,
      }}
    />
  );
}

function Peg({ shot, fresh }: { shot: Shot; fresh: boolean }) {
  return (
    <span
      aria-hidden
      className={`brutalist-peg ${shot.result === "hit" ? "is-hit" : "is-miss"} ${fresh ? "is-new" : ""}`}
    />
  );
}

function TargetBoard({ view, fire }: Pick<BattleProps, "view" | "fire">) {
  const armed = view.turn === "me" && !view.winner;
  const latest = view.outgoing[view.outgoing.length - 1];
  const [focus, setFocus] = useState(() => {
    const open = CELLS.findIndex((c) => !shotAt(view.outgoing, c));
    return Math.max(0, open);
  });
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    let next: number | undefined;
    const move = step[event.key];
    if (move && !event.altKey) {
      const x = Math.min(BOARD_SIZE - 1, Math.max(0, (focus % BOARD_SIZE) + move[0]));
      const y = Math.min(BOARD_SIZE - 1, Math.max(0, Math.floor(focus / BOARD_SIZE) + move[1]));
      next = y * BOARD_SIZE + x;
    } else if (event.key === "Home") next = focus - (focus % BOARD_SIZE);
    else if (event.key === "End") next = focus - (focus % BOARD_SIZE) + BOARD_SIZE - 1;
    if (next === undefined) return;
    event.preventDefault();
    setFocus(next);
    refs.current[next]?.focus();
  };

  return (
    <BoardFrame label={`Target grid, ${view.enemy.callsign}'s waters`}>
      <div className="absolute inset-0">
        {view.enemySunk.map((ship) => (
          <Hull key={ship.kind} ship={ship} sunk />
        ))}
      </div>
      <div
        data-armed={armed}
        onKeyDown={onKeyDown}
        className="absolute inset-0 grid grid-cols-10 grid-rows-10"
      >
        {CELLS.map((cell, i) => {
          const shot = shotAt(view.outgoing, cell);
          const sunkShip = shipAt(view.enemySunk, cell);
          const label = cellLabel(cell);
          const ariaLabel = shot
            ? `${label}, ${shot.result}${sunkShip ? `, ${SHIP_NAME[sunkShip.kind].toLowerCase()} sunk` : ""}`
            : `${label}, not fired`;
          return (
            <button
              key={label}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              data-cell={label}
              data-state={shot ? shot.result : "open"}
              tabIndex={focus === i ? 0 : -1}
              aria-label={ariaLabel}
              aria-disabled={!armed || !!shot}
              onFocus={() => setFocus(i)}
              onClick={() => {
                if (armed && !shot) fire(cell);
              }}
              className={`brutalist-target-cell relative grid place-items-center ${isSame(latest, cell) ? "brutalist-last" : ""}`}
            >
              {shot ? (
                <Peg shot={shot} fresh={isSame(latest, cell)} />
              ) : (
                <Crosshair className="brutalist-aim size-[55%] text-(--b-ink)" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
    </BoardFrame>
  );
}

function FleetBoard({ view }: { view: BattleView }) {
  const latest = view.incoming[view.incoming.length - 1];
  return (
    <BoardFrame label="Your fleet">
      <div className="absolute inset-0">
        {view.me.fleet.map((ship) => (
          <Hull key={ship.kind} ship={ship} sunk={view.mySunk.includes(ship.kind)} />
        ))}
      </div>
      <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
        {CELLS.map((cell) => {
          const shot = shotAt(view.incoming, cell);
          const ship = shipAt(view.me.fleet, cell);
          const label = cellLabel(cell);
          const parts = [label, shot ? shot.result : "not fired"];
          if (ship) parts.push(SHIP_NAME[ship.kind].toLowerCase());
          return (
            <span
              key={label}
              role="img"
              aria-label={parts.join(", ")}
              className={`relative grid place-items-center ${isSame(latest, cell) ? "brutalist-last" : ""}`}
            >
              {shot && <Peg shot={shot} fresh={isSame(latest, cell)} />}
            </span>
          );
        })}
      </div>
    </BoardFrame>
  );
}

function FleetChecklist({ view }: { view: BattleView }) {
  const myHits = (kind: ShipKind) =>
    view.incoming.filter((s) => s.result === "hit" && shipAt(view.me.fleet, s)?.kind === kind)
      .length;
  const theirSunk = view.enemySunk.map((s) => s.kind);

  const column = (
    title: string,
    sunk: ReadonlyArray<ShipKind>,
    hitsFor?: (kind: ShipKind) => number,
  ) => (
    <div>
      <h3 className="brutalist-condensed border-b-[3px] border-(--b-ink) pb-1 text-sm">
        {title}{" "}
        <span className="opacity-60">
          {FLEET.length - sunk.length}/{FLEET.length}
        </span>
      </h3>
      <ul className="mt-1.5 space-y-1.5">
        {FLEET.map(({ kind, length }) => {
          const isSunk = sunk.includes(kind);
          const hit = isSunk ? length : (hitsFor?.(kind) ?? 0);
          return (
            <li key={kind} className="flex items-center gap-2">
              <span
                className={`grid size-5 shrink-0 place-items-center border-[3px] border-(--b-ink) ${isSunk ? "bg-(--b-red) text-(--b-white)" : "bg-(--b-white)"}`}
              >
                {isSunk && <X className="size-3.5" strokeWidth={4} />}
              </span>
              <span
                className={`brutalist-condensed min-w-0 flex-1 truncate text-sm ${isSunk ? "line-through decoration-(--b-red) decoration-[3px] opacity-60" : ""}`}
              >
                {SHIP_NAME[kind]}
                <span className="sr-only">{isSunk ? ", sunk" : ", afloat"}</span>
              </span>
              {hitsFor && (
                <span aria-hidden className="flex gap-0.5">
                  {Array.from({ length }, (_, i) => (
                    <span
                      key={i}
                      className={`size-2 border-2 border-(--b-ink) sm:size-2.5 ${i < hit ? "bg-(--b-red)" : ""}`}
                    />
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <section
      aria-labelledby="brutalist-fleet-status"
      className="brutalist-box shrink-0 bg-(--b-card) p-4"
    >
      <h2 id="brutalist-fleet-status" className="brutalist-display text-3xl">
        Fleet status
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-4">
        {column("Yours", view.mySunk, myHits)}
        {column("Theirs", theirSunk)}
      </div>
    </section>
  );
}

function Dispatches({ view, lastSink }: { view: BattleView; lastSink: LogEntry | undefined }) {
  const entries = view.log.map((entry, i) => ({ entry, no: i + 1 })).reverse();
  return (
    <section
      aria-labelledby="brutalist-dispatches"
      className="brutalist-box flex min-h-0 flex-col bg-(--b-white) lg:flex-1"
    >
      <div className="flex items-baseline justify-between border-b-4 border-(--b-ink) px-4 pt-3 pb-2">
        <h2 id="brutalist-dispatches" className="brutalist-display text-3xl">
          Dispatches
        </h2>
        <span className="brutalist-condensed text-xs">{view.log.length} filed</span>
      </div>
      {lastSink && (
        <p className="brutalist-condensed border-b-[3px] border-(--b-ink) bg-(--b-ink) px-4 py-2 text-sm text-(--b-yellow)">
          <span className="mr-2 bg-(--b-red) px-1.5 text-(--b-white)">Latest sinking</span>
          {lastSink.by === "me"
            ? `You sank their ${SHIP_NAME[lastSink.sunk!]}`
            : `${view.enemy.callsign} sank your ${SHIP_NAME[lastSink.sunk!]}`}
        </p>
      )}
      <ol className="brutalist-scroll max-h-80 min-h-0 overflow-y-auto px-4 py-1 lg:max-h-none lg:flex-1">
        {entries.map(({ entry, no }) => (
          <li
            key={`${entry.at}-${no}`}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b-2 border-dashed border-(--b-ink)/35 py-1.5 last:border-0"
          >
            <span className="brutalist-mono text-xs opacity-60">№{no}</span>
            <span className="min-w-0 text-sm leading-tight">
              <span className="font-extrabold">
                {entry.by === "me" ? "You" : view.enemy.callsign}
              </span>{" "}
              → <span className="brutalist-mono font-bold">{cellLabel(entry)}</span>
              {entry.sunk && (
                <span className="brutalist-condensed block text-xs text-(--b-red)">
                  sank {entry.by === "me" ? "their" : "your"} {SHIP_NAME[entry.sunk]}
                </span>
              )}
            </span>
            <span
              className={`brutalist-condensed border-2 border-(--b-ink) px-1.5 text-xs ${entry.result === "hit" ? "bg-(--b-red) text-(--b-white)" : "bg-(--b-white)"}`}
            >
              {entry.result}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ResultOverlay({ view, rematch }: { view: BattleView; rematch: () => void }) {
  const won = view.winner === "me";
  const shots = view.outgoing.length;
  const hits = view.outgoing.filter((s) => s.result === "hit").length;
  const forfeited = view.mySunk.length < FLEET.length && !won;
  const rematchRef = useRef<HTMLButtonElement>(null);
  useEffect(() => rematchRef.current?.focus(), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-(--b-ink)/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brutalist-result"
    >
      <motion.div
        initial={{ scale: 1.4, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: -2, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 20 }}
        className={`brutalist-box w-full max-w-xl p-5 sm:p-8 ${won ? "bg-(--b-yellow)" : "bg-(--b-card)"}`}
      >
        <p className="brutalist-condensed flex justify-between border-b-[3px] border-(--b-ink) pb-2 text-sm">
          <span>Final edition</span>
          <span>
            {view.me.callsign} vs {view.enemy.callsign}
          </span>
        </p>
        <h2
          id="brutalist-result"
          className={`brutalist-display mt-4 text-[clamp(4.5rem,22vw,9rem)] ${won ? "" : "text-(--b-red)"}`}
        >
          {won ? "Victory" : "Sunk."}
        </h2>
        <p className="mt-3 text-lg leading-snug font-semibold">
          {won
            ? `Every ship ${view.enemy.callsign} had is on the sea floor.`
            : forfeited
              ? "You struck your colours. The match goes to the other side."
              : `${view.enemy.callsign} found all five of your ships.`}
        </p>
        <dl className="mt-5 grid grid-cols-3 border-[3px] border-(--b-ink) bg-(--b-white)">
          {(
            [
              ["Shots", shots],
              ["Hits", hits],
              ["Accuracy", `${shots ? Math.round((hits / shots) * 100) : 0}%`],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="border-r-[3px] border-(--b-ink) p-3 last:border-0">
              <dt className="brutalist-condensed text-xs">{label}</dt>
              <dd className="brutalist-display text-4xl">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            ref={rematchRef}
            type="button"
            onClick={rematch}
            className="brutalist-btn brutalist-condensed flex items-center justify-center gap-2 bg-(--b-blue) px-4 py-3 text-xl text-(--b-white)"
          >
            <RotateCcw className="size-5" strokeWidth={3} />
            Rematch
          </button>
          <Link
            to="/"
            search={{ variant: "B" }}
            className="brutalist-btn brutalist-condensed flex items-center justify-center bg-(--b-white) px-4 py-3 text-xl"
          >
            Leave
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
