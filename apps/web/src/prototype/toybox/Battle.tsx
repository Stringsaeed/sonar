// PROTOTYPE — throwaway. Variant C "Toy-box" battle: one big board at a time, flipped like a card.
import { FLEET, type ShipKind } from "@sonar/game";
import { Link } from "@tanstack/react-router";
import { Crosshair, Flag, RotateCcw, Waves as WavesIcon, Anchor } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type BattleProps,
  type BattleView,
  type Cell,
  type LogEntry,
  type Ship,
  COLUMN_LABELS,
  SHIP_LENGTH,
  cellLabel,
  shipAt,
  shotAt,
  useCountdown,
} from "../fixtures";
import { Boom, type Mood, Octopus, SHIP_COLORS, SHIP_NAMES, Splash, ToyBoat } from "./parts";
import "./toybox.css";

const SIZE = 10;
const CELLS = Array.from({ length: SIZE * SIZE }, (_, i) => ({
  x: i % SIZE,
  y: Math.floor(i / SIZE),
}));
const GRID_STYLE = {
  gridTemplateColumns: `1.1rem repeat(${SIZE}, minmax(0, 1fr))`,
  gridTemplateRows: `1.1rem repeat(${SIZE}, minmax(0, 1fr))`,
} as const;

const bounce = { type: "spring", stiffness: 420, damping: 14 } as const;

type Side = "enemy" | "mine";

const shotText = (entry: LogEntry) => {
  const at = cellLabel(entry);
  if (entry.sunk)
    return `${at}: sank ${entry.by === "me" ? "their" : "your"} ${SHIP_NAMES[entry.sunk]}!`;
  return entry.result === "hit" ? `${at}: boom, a hit!` : `${at}: splash, missed`;
};

const announce = (entry: LogEntry | undefined, enemy: string) => {
  if (!entry) return "";
  const who = entry.by === "me" ? "You fired at" : `${enemy} fired at`;
  const sunk = entry.sunk
    ? `, sank ${entry.by === "me" ? "their" : "your"} ${SHIP_NAMES[entry.sunk]}`
    : "";
  return `${who} ${cellLabel(entry)}: ${entry.result}${sunk}.`;
};

/** Grid placement for a ship drawn as one rounded toy pill across its cells. */
const placement = (ship: Ship) => {
  const xs = ship.cells.map((c) => c.x);
  const ys = ship.cells.map((c) => c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const horizontal = new Set(ys).size === 1;
  return {
    horizontal,
    style: {
      gridColumn: `${x + 2} / span ${horizontal ? ship.cells.length : 1}`,
      gridRow: `${y + 2} / span ${horizontal ? 1 : ship.cells.length}`,
    },
  };
};

function ShipPill({ ship, sunk }: { ship: Ship; sunk: boolean }) {
  const { horizontal, style } = placement(ship);
  const color = SHIP_COLORS[ship.kind];
  return (
    <div style={style} className="pointer-events-none relative z-[1]" aria-hidden="true">
      <div
        data-sunk={sunk}
        className={`toybox-ship absolute inset-[3px] flex items-center justify-around ${horizontal ? "" : "flex-col"}`}
        style={{ background: color.body, rotate: sunk ? (horizontal ? "-2deg" : "2deg") : "0deg" }}
      >
        {ship.cells.map((_, i) => (
          <span
            key={i}
            className={`aspect-square rounded-full bg-white/90 ring-2 ring-black/10 ${
              horizontal ? "h-[36%]" : "w-[36%]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Marker({ result, late }: { result: "hit" | "miss"; late?: boolean }) {
  const cls = `toybox-pop pointer-events-none ${late ? "toybox-pop--late" : ""}`;
  return result === "hit" ? (
    <Boom className={`${cls} size-[88%]`} />
  ) : (
    <Splash className={`${cls} size-[62%]`} />
  );
}

function Labels() {
  return (
    <>
      {COLUMN_LABELS.map((label, x) => (
        <span
          key={label}
          style={{ gridColumn: x + 2, gridRow: 1 }}
          className="grid place-items-center text-[0.65rem] font-bold text-white/85 sm:text-xs"
          aria-hidden="true"
        >
          {label}
        </span>
      ))}
      {Array.from({ length: SIZE }, (_, y) => (
        <span
          key={y}
          style={{ gridColumn: 1, gridRow: y + 2 }}
          className="grid place-items-center text-[0.65rem] font-bold text-white/85 sm:text-xs"
          aria-hidden="true"
        >
          {y + 1}
        </span>
      ))}
    </>
  );
}

function Tiles() {
  return CELLS.map((c) => (
    <span
      key={`t${c.x}-${c.y}`}
      style={{ gridColumn: c.x + 2, gridRow: c.y + 2 }}
      className="toybox-tile"
      aria-hidden="true"
    />
  ));
}

function EnemyBoard({
  view,
  armed,
  onFire,
  focus,
  setFocus,
  cellRefs,
}: {
  view: BattleView;
  armed: boolean;
  onFire: (cell: Cell) => void;
  focus: Cell;
  setFocus: (cell: Cell) => void;
  cellRefs: RefObject<Array<HTMLButtonElement | null>>;
}) {
  const last = view.outgoing.at(-1);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, cell: Cell) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const delta: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    let next: Cell | undefined;
    const move = delta[event.key];
    if (move) {
      next = {
        x: Math.min(SIZE - 1, Math.max(0, cell.x + move[0])),
        y: Math.min(SIZE - 1, Math.max(0, cell.y + move[1])),
      };
    } else if (event.key === "Home") next = { x: 0, y: cell.y };
    else if (event.key === "End") next = { x: SIZE - 1, y: cell.y };
    if (!next) return;
    event.preventDefault();
    setFocus(next);
    cellRefs.current[next.y * SIZE + next.x]?.focus();
  };

  return (
    <div className="grid size-full gap-[3px]" style={GRID_STYLE}>
      <Labels />
      <Tiles />
      {view.enemySunk.map((ship) => (
        <ShipPill key={ship.kind} ship={ship} sunk />
      ))}
      {CELLS.map((cell) => {
        const shot = shotAt(view.outgoing, cell);
        const sunkShip = shipAt(view.enemySunk, cell);
        const label = cellLabel(cell);
        const aria = shot
          ? shot.result === "hit"
            ? `${label}, hit${sunkShip ? `, ${SHIP_NAMES[sunkShip.kind]} sunk` : ""}`
            : `${label}, miss`
          : `${label}, not fired`;
        const canFire = armed && !shot;
        const isLast = last !== undefined && last.x === cell.x && last.y === cell.y;
        return (
          <button
            key={`${cell.x}-${cell.y}`}
            ref={(node) => {
              cellRefs.current[cell.y * SIZE + cell.x] = node;
            }}
            type="button"
            data-cell={label}
            data-armed={canFire}
            aria-label={aria}
            aria-disabled={!canFire}
            tabIndex={focus.x === cell.x && focus.y === cell.y ? 0 : -1}
            onClick={() => canFire && onFire(cell)}
            onFocus={() => setFocus(cell)}
            onKeyDown={(event) => onKeyDown(event, cell)}
            style={{ gridColumn: cell.x + 2, gridRow: cell.y + 2 }}
            className={`toybox-cell relative z-[2] grid place-items-center outline-none ${
              canFire ? "cursor-crosshair" : "cursor-default"
            }`}
          >
            {shot ? (
              <Marker result={shot.result} />
            ) : (
              <Crosshair className="toybox-aim size-[60%] text-[#23395d]" strokeWidth={2.6} />
            )}
            {isLast ? (
              <span className="toybox-ripple pointer-events-none absolute inset-0 rounded-full border-[3px] border-white" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function MyBoard({ view }: { view: BattleView }) {
  const last = view.incoming.at(-1);
  return (
    <div className="grid size-full gap-[3px]" style={GRID_STYLE}>
      <Labels />
      <Tiles />
      {view.me.fleet.map((ship) => (
        <ShipPill key={ship.kind} ship={ship} sunk={view.mySunk.includes(ship.kind)} />
      ))}
      {CELLS.map((cell) => {
        const shot = shotAt(view.incoming, cell);
        const ship = shipAt(view.me.fleet, cell);
        const label = cellLabel(cell);
        const isLast = last !== undefined && last.x === cell.x && last.y === cell.y;
        const aria = `${label}, ${ship ? `your ${SHIP_NAMES[ship.kind]}` : "water"}, ${
          shot ? shot.result : "not fired"
        }`;
        return (
          <span
            key={`${cell.x}-${cell.y}`}
            role="img"
            aria-label={aria}
            style={{ gridColumn: cell.x + 2, gridRow: cell.y + 2 }}
            className="relative z-[2] grid place-items-center"
          >
            {shot ? <Marker result={shot.result} late={isLast} /> : null}
            {isLast ? (
              <span className="toybox-ripple pointer-events-none absolute inset-0 rounded-full border-[3px] border-[#ff6b5e]" />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function Fuse({ seconds, total, mine }: { seconds: number; total: number; mine: boolean }) {
  const pct = Math.max(0, Math.min(1, seconds / total));
  const tone = pct > 0.5 ? "#3fbf86" : pct > 0.25 ? "#ffb703" : "#ff6b5e";
  const urgent = pct <= 0.25;
  return (
    <div className={`mt-3 flex items-center gap-3 ${urgent ? "toybox-shake" : ""}`}>
      <div className="toybox-fuse-track relative h-4 flex-1 rounded-full">
        <div
          className="toybox-fuse relative h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: tone }}
        >
          <span
            className="toybox-spark absolute -right-2.5 top-1/2 -mt-2.5 size-5 rounded-full"
            style={{
              background: `radial-gradient(circle, #fff 0 25%, #ffd23f 30% 55%, ${tone} 60% 100%)`,
              boxShadow: `0 0 12px 3px ${tone}`,
            }}
          />
        </div>
      </div>
      <span
        className="toybox-display grid h-9 min-w-12 place-items-center rounded-full px-2 text-lg text-white tabular-nums"
        style={{ backgroundColor: tone }}
        aria-label={`${seconds} seconds left on ${mine ? "your" : "their"} turn`}
      >
        {seconds}s
      </span>
    </div>
  );
}

function FleetRow({ title, sunk }: { title: string; sunk: ReadonlyArray<ShipKind> }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="toybox-display text-base">{title}</h3>
        <span className="text-xs font-semibold text-[#4a6288]">
          {FLEET.length - sunk.length} of {FLEET.length} afloat
        </span>
      </div>
      <ul className="mt-1 flex items-end gap-1">
        {FLEET.map(({ kind }) => {
          const down = sunk.includes(kind);
          return (
            <li
              key={kind}
              className="flex min-w-0 flex-col items-center"
              style={{ flex: SHIP_LENGTH[kind] + 2.5 }}
            >
              <motion.div
                className="w-full"
                initial={false}
                animate={
                  down
                    ? { rotate: 168, y: 6, opacity: 0.45, scale: 0.9 }
                    : { rotate: 0, y: 0, opacity: 1, scale: 1 }
                }
                transition={{ type: "spring", stiffness: 180, damping: 9 }}
              >
                <ToyBoat
                  length={SHIP_LENGTH[kind]}
                  color={SHIP_COLORS[kind].body}
                  lip={SHIP_COLORS[kind].lip}
                  className="w-full"
                />
              </motion.div>
              <span
                className={`mt-1 max-w-full truncate text-[0.6rem] font-semibold sm:text-[0.65rem] ${
                  down ? "text-[#4a6288]/60 line-through" : "text-[#4a6288]"
                }`}
              >
                {SHIP_NAMES[kind]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ToyboxBattle({ view, fire, forfeit, rematch }: BattleProps) {
  const seconds = useCountdown(view.deadline);
  const [side, setSide] = useState<Side>("enemy");
  const [focus, setFocus] = useState<Cell>({ x: 4, y: 4 });
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const enemyFaceRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const seenIncoming = useRef(view.incoming.length);
  const logRef = useRef<HTMLOListElement>(null);

  // Auto-flip: peek at your waters when they fire, then swing back to theirs for your shot.
  useEffect(() => {
    const count = view.incoming.length;
    const previous = seenIncoming.current;
    seenIncoming.current = count;
    if (count < previous) {
      setSide("enemy");
      return;
    }
    if (count === previous) return;
    restoreFocus.current = Boolean(enemyFaceRef.current?.contains(document.activeElement));
    setSide("mine");
    if (view.winner) return;
    const timer = setTimeout(() => setSide("enemy"), 1400);
    return () => clearTimeout(timer);
  }, [view.incoming.length, view.winner]);

  useEffect(() => {
    if (side !== "enemy" || !restoreFocus.current) return;
    restoreFocus.current = false;
    cellRefs.current[focus.y * SIZE + focus.x]?.focus();
  }, [side, focus]);

  useEffect(() => {
    const list = logRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [view.log.length]);

  useEffect(() => {
    if (!confirmForfeit) return;
    const timer = setTimeout(() => setConfirmForfeit(false), 3500);
    return () => clearTimeout(timer);
  }, [confirmForfeit]);

  const myTurn = view.turn === "me" && !view.winner;
  const armed = myTurn && side === "enemy";
  const lastEntry = view.log.at(-1);
  const lastSink = view.log.findLast((entry) => entry.sunk);
  const hits = view.outgoing.filter((s) => s.result === "hit").length;

  let mood: Mood = "happy";
  let speech: ReactNode;
  if (view.winner === "me") {
    mood = "party";
    speech = <>Glug glug! Every one of {view.enemy.callsign}&apos;s boats is sunk.</>;
  } else if (view.winner === "enemy") {
    mood = "sad";
    speech = <>Oh no, {view.enemy.callsign} won this round.</>;
  } else if (myTurn) {
    mood = seconds <= 7 ? "worried" : "happy";
    speech =
      seconds <= 7 ? (
        <>Quick, Captain! The fuse is nearly out!</>
      ) : (
        <>Your turn! Pick a square in their waters.</>
      );
  } else {
    mood = "worried";
    speech = <>{view.enemy.callsign} is taking aim at your boats…</>;
  }

  return (
    <div className="v-toybox toybox-pool min-h-dvh overflow-x-hidden pb-24">
      <p className="sr-only" aria-live="polite">
        {announce(lastEntry, view.enemy.callsign)}
      </p>

      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
        <Link
          to="/"
          search={{ variant: "C" }}
          className="toybox-focus flex items-center gap-2 rounded-2xl"
          aria-label="Sonar home"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-[#ffd23f] shadow-[inset_0_3px_0_rgb(255_255_255/0.6),0_4px_0_#e5a800]">
            <ToyBoat length={2} className="w-7" color="#ff7eb6" lip="#e0518f" />
          </span>
          <span className="toybox-display hidden text-2xl sm:inline">
            Sonar<span className="text-[#ff7eb6]">!</span>
          </span>
        </Link>

        <div className="order-last flex w-full min-w-0 items-center justify-center gap-1.5 rounded-full bg-white/80 p-1 text-sm font-semibold shadow-[0_4px_0_rgb(35_57_93/0.08)] sm:order-none sm:w-auto">
          <span className="truncate rounded-full bg-[#ffd23f] px-3 py-1">{view.me.callsign}</span>
          <span className="shrink-0 text-xs text-[#4a6288]">vs</span>
          <span className="truncate rounded-full bg-[#ffd0e3] px-3 py-1">
            {view.enemy.callsign}
          </span>
        </div>

        <motion.button
          type="button"
          onClick={() => (confirmForfeit ? forfeit() : setConfirmForfeit(true))}
          disabled={Boolean(view.winner)}
          whileTap={{ scale: 0.92 }}
          transition={bounce}
          className={`toybox-focus flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
            confirmForfeit
              ? "bg-[#ff6b5e] text-white"
              : "bg-white/80 text-[#23395d] shadow-[0_4px_0_rgb(35_57_93/0.08)]"
          }`}
        >
          <Flag className="size-4" />
          <span className="hidden sm:inline">
            {confirmForfeit ? "Sure? Tap to give up" : "Give up"}
          </span>
          <span className="sm:hidden">{confirmForfeit ? "Sure?" : "Give up"}</span>
        </motion.button>
      </header>

      <main className="mx-auto mt-4 grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-8 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <section className="mx-auto w-full min-w-0 max-w-[36rem]" aria-label="Battle board">
          {/* Mascot + speech bubble + fuse */}
          <div className="flex items-start gap-3">
            <Octopus mood={mood} className="toybox-bob w-16 shrink-0 sm:w-20" />
            <div className="toybox-speech ml-2 min-w-0 flex-1 px-4 py-3">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.p
                  key={`${view.turn}-${view.winner}-${mood}`}
                  initial={{ scale: 0.7, opacity: 0, y: 6 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={bounce}
                  className="toybox-display origin-left text-lg leading-snug sm:text-xl"
                >
                  {speech}
                </motion.p>
              </AnimatePresence>
              {view.winner ? null : (
                <Fuse seconds={seconds} total={view.turnSeconds} mine={view.turn === "me"} />
              )}
            </div>
          </div>

          {/* Board toggle + sink sticker */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div
              className="relative flex rounded-full bg-white/80 p-1 shadow-[0_4px_0_rgb(35_57_93/0.08)]"
              role="group"
              aria-label="Choose board"
            >
              {(
                [
                  { key: "enemy", label: "Their waters", icon: Crosshair },
                  { key: "mine", label: "Your waters", icon: Anchor },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={side === key}
                  onClick={() => setSide(key)}
                  className="toybox-focus relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold sm:px-4"
                >
                  {side === key ? (
                    <motion.span
                      layoutId="toybox-side"
                      transition={bounce}
                      className={`absolute inset-0 rounded-full ${
                        key === "enemy" ? "bg-[#29b3c8]" : "bg-[#5cc9b9]"
                      } shadow-[inset_0_3px_0_rgb(255_255_255/0.4)]`}
                    />
                  ) : null}
                  <Icon
                    className={`relative size-4 ${side === key ? "text-white" : "text-[#4a6288]"}`}
                  />
                  <span className={`relative ${side === key ? "text-white" : "text-[#4a6288]"}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="popLayout">
              {lastSink ? (
                <motion.p
                  key={lastSink.at}
                  initial={{ scale: 0.3, rotate: -12, opacity: 0 }}
                  animate={{ scale: 1, rotate: lastSink.by === "me" ? -3 : 3, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={bounce}
                  className={`toybox-sticker flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold ${
                    lastSink.by === "me" ? "bg-[#ffd23f]" : "bg-[#ff7eb6] text-white"
                  }`}
                >
                  <WavesIcon className="size-4" />
                  {lastSink.by === "me"
                    ? `You sank their ${SHIP_NAMES[lastSink.sunk!]}!`
                    : `They sank your ${SHIP_NAMES[lastSink.sunk!]}!`}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          {/* The flip card */}
          <div className="relative mt-5 aspect-square w-full" style={{ perspective: 1600 }}>
            <motion.div
              className="absolute inset-0"
              style={{ transformStyle: "preserve-3d" }}
              initial={false}
              animate={{ rotateY: side === "enemy" ? 0 : 180 }}
              transition={{ type: "spring", stiffness: 140, damping: 15 }}
            >
              <div
                ref={enemyFaceRef}
                className="toybox-face toybox-board-enemy absolute inset-0 rounded-[1.75rem] p-2.5 sm:rounded-[2.25rem] sm:p-4"
                inert={side !== "enemy"}
                role="group"
                aria-label={`Their waters, ${view.enemy.callsign}'s board`}
              >
                <EnemyBoard
                  view={view}
                  armed={armed}
                  onFire={fire}
                  focus={focus}
                  setFocus={setFocus}
                  cellRefs={cellRefs}
                />
              </div>
              <div
                className="toybox-face toybox-board-mine absolute inset-0 rounded-[1.75rem] p-2.5 sm:rounded-[2.25rem] sm:p-4"
                style={{ transform: "rotateY(180deg)" }}
                inert={side !== "mine"}
                role="group"
                aria-label="Your waters, your board"
              >
                <MyBoard view={view} />
              </div>
            </motion.div>
          </div>
          <p className="mt-5 text-center text-sm font-medium text-[#4a6288]">
            {side === "enemy"
              ? myTurn
                ? "Tap a square, or use the arrow keys and Enter, to fire."
                : "Hang on, it's their turn. We'll flip back when it's yours."
              : "Your boats. Red stars are where they hit you."}
          </p>
        </section>

        <aside className="flex min-w-0 flex-col gap-5">
          <div className="rounded-[1.75rem] bg-white/85 p-4 shadow-[0_6px_0_rgb(35_57_93/0.08),0_16px_30px_rgb(35_57_93/0.08)]">
            <FleetRow title="Their toys" sunk={view.enemySunk.map((s) => s.kind)} />
            <div className="my-3 border-t-2 border-dashed border-[#23395d]/10" />
            <FleetRow title="Your toys" sunk={view.mySunk} />
          </div>

          <div className="rounded-[1.75rem] bg-white/85 p-4 shadow-[0_6px_0_rgb(35_57_93/0.08),0_16px_30px_rgb(35_57_93/0.08)]">
            <div className="flex items-baseline justify-between">
              <h3 className="toybox-display text-base">Shot chat</h3>
              <span className="text-xs font-semibold text-[#4a6288]">
                {view.outgoing.length} shots · {hits} hits
              </span>
            </div>
            <ol
              ref={logRef}
              className="toybox-scroll mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[22rem]"
            >
              {view.log.map((entry) => {
                const mine = entry.by === "me";
                return (
                  <motion.li
                    key={`${entry.by}-${entry.at}-${entry.x}-${entry.y}`}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={bounce}
                    className={`flex items-end gap-1.5 ${mine ? "origin-right flex-row-reverse" : "origin-left"}`}
                  >
                    <span className="mb-0.5 grid size-6 shrink-0 place-items-center">
                      {entry.result === "hit" ? (
                        <Boom className="size-6" />
                      ) : (
                        <Splash className="size-5" />
                      )}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${
                        mine ? "rounded-br-md bg-[#ffe68a]" : "rounded-bl-md bg-[#ffd0e3]"
                      } ${entry.sunk ? "ring-2 ring-[#23395d]/70" : ""}`}
                    >
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#23395d]/60">
                        {mine ? "You" : view.enemy.callsign}
                      </p>
                      <p className="text-sm font-semibold leading-tight">{shotText(entry)}</p>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </aside>
      </main>

      <AnimatePresence>
        {view.winner ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[#23395d]/45 p-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="toybox-result"
              initial={{ scale: 0.5, rotate: -6, y: 40 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 13, delay: 0.25 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-[0_10px_0_rgb(35_57_93/0.2),0_30px_60px_rgb(35_57_93/0.35)]"
            >
              <Octopus
                mood={view.winner === "me" ? "party" : "sad"}
                className="toybox-bob mx-auto -mt-16 w-28"
              />
              <h2 id="toybox-result" className="toybox-display mt-2 text-5xl">
                {view.winner === "me" ? "You win!" : "Glug glug."}
              </h2>
              <p className="mt-2 text-[#4a6288]">
                {view.winner === "me"
                  ? `Every one of ${view.enemy.callsign}'s toys is at the bottom of the tub.`
                  : view.mySunk.length < FLEET.length
                    ? `You gave up, so ${view.enemy.callsign} takes the round.`
                    : `${view.enemy.callsign} sank your whole fleet.`}
              </p>
              <div className="mt-4 flex justify-center gap-2 text-sm font-semibold">
                <span className="rounded-full bg-[#c4ecff] px-3 py-1">
                  {view.outgoing.length} shots
                </span>
                <span className="rounded-full bg-[#ffe68a] px-3 py-1">{hits} hits</span>
                <span className="rounded-full bg-[#c9f5df] px-3 py-1">
                  {view.outgoing.length ? Math.round((hits / view.outgoing.length) * 100) : 0}% aim
                </span>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <motion.button
                  type="button"
                  onClick={rematch}
                  autoFocus
                  whileTap={{ scaleX: 1.06, scaleY: 0.9 }}
                  transition={bounce}
                  className="toybox-candy toybox-focus toybox-display flex items-center justify-center gap-2 bg-[#ffd23f] py-4 text-2xl"
                >
                  <RotateCcw className="size-6" strokeWidth={2.6} />
                  Rematch
                </motion.button>
                <Link
                  to="/"
                  search={{ variant: "C" }}
                  className="toybox-focus rounded-full py-2 font-semibold text-[#4a6288] underline decoration-2 underline-offset-4 hover:text-[#23395d]"
                >
                  Leave to the harbour
                </Link>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
