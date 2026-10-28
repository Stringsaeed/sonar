// PROTOTYPE — throwaway. Variant A "Sonar arcade" battle: a cockpit HUD around the enemy radar.
import { BOARD_SIZE, FLEET, type ShipKind } from "@sonar/game";
import { Link } from "@tanstack/react-router";
import { Flag, LogOut, RotateCcw, Skull, Trophy } from "lucide-react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  cellLabel,
  COLUMN_LABELS,
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
import "./arcade.css";

const CELLS: ReadonlyArray<Cell> = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => ({
  x: i % BOARD_SIZE,
  y: Math.floor(i / BOARD_SIZE),
}));
const ROWS = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1);

const shipName = (kind: ShipKind) => kind.toUpperCase();

/** Places a ship as one grid item spanning its cells. */
const shipArea = (ship: Ship) => {
  const xs = ship.cells.map((c) => c.x);
  const ys = ship.cells.map((c) => c.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return {
    gridColumn: `${x0 + 1} / span ${Math.max(...xs) - x0 + 1}`,
    gridRow: `${y0 + 1} / span ${Math.max(...ys) - y0 + 1}`,
  };
};

const cellArea = ({ x, y }: Cell) => ({ gridColumn: x + 1, gridRow: y + 1 });

const describeShot = (entry: LogEntry, enemy: string) => {
  const who = entry.by === "me" ? "You fired at" : `${enemy} fired at`;
  const sunk = entry.sunk
    ? entry.by === "me"
      ? ` You sank their ${entry.sunk}.`
      : ` Your ${entry.sunk} is sunk.`
    : "";
  return `${who} ${cellLabel(entry)}: ${entry.result}.${sunk}`;
};

/* ---------- pieces ---------- */

function Ping({ shot, small = false }: { shot: Shot; small?: boolean }) {
  const tone = shot.result === "hit" ? "coral" : "green";
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className="arcade-ping" data-tone={tone} />
      <span className="arcade-ping" data-tone={tone} data-delay="1" />
      {!small && <span className="arcade-ping" data-tone={tone} data-delay="2" />}
    </span>
  );
}

const SPARKS = Array.from({ length: 10 }, (_, i) => (i * 360) / 10);

function Explosion() {
  return (
    <span className="pointer-events-none absolute inset-0 z-[7]" aria-hidden="true">
      <motion.span
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle,#fff_0,#ffd36b_25%,#ff4f5e_55%,transparent_70%)]"
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 3.2, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {SPARKS.map((deg) => {
        const a = (deg * Math.PI) / 180;
        return (
          <motion.span
            key={deg}
            className="absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] size-1.5 rounded-full bg-[#ffd36b] shadow-[0_0_8px_#ff8a5b]"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1.4 }}
            animate={{ x: Math.cos(a) * 54, y: Math.sin(a) * 54, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

function EnemyBoard({
  view,
  fire,
  lastSink,
}: {
  view: BattleView;
  fire: BattleProps["fire"];
  lastSink: LogEntry | undefined;
}) {
  const [focus, setFocus] = useState<Cell>({ x: 4, y: 4 });
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const armed = view.turn === "me" && !view.winner;
  const latest = view.outgoing.at(-1);

  // Shake the screen on every fresh hit.
  const shots = view.outgoing.length;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (latest?.result === "hit" && scope.current) {
      void animate(
        scope.current,
        { x: [0, -9, 8, -6, 4, 0], rotate: [0, -0.6, 0.5, 0] },
        { duration: 0.42 },
      );
    }
  }, [shots]); // eslint-disable-line react-hooks/exhaustive-deps

  // Big sink announcement for sinks that happen while you watch.
  const [mountedAt] = useState(Date.now);
  const [flash, setFlash] = useState<LogEntry | undefined>(undefined);
  useEffect(() => {
    if (!lastSink || lastSink.at < mountedAt) return;
    setFlash(lastSink);
    const id = setTimeout(() => setFlash(undefined), 2200);
    return () => clearTimeout(id);
  }, [lastSink, mountedAt]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, Cell> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };
    let next: Cell | undefined;
    const delta = step[event.key];
    if (delta && !event.altKey) {
      next = {
        x: Math.min(BOARD_SIZE - 1, Math.max(0, focus.x + delta.x)),
        y: Math.min(BOARD_SIZE - 1, Math.max(0, focus.y + delta.y)),
      };
    } else if (event.key === "Home") next = { x: 0, y: focus.y };
    else if (event.key === "End") next = { x: BOARD_SIZE - 1, y: focus.y };
    if (!next) return;
    event.preventDefault();
    setFocus(next);
    refs.current[next.y * BOARD_SIZE + next.x]?.focus();
  };

  return (
    <div ref={scope} className="relative">
      <div className="arcade-screen" data-turn={view.winner ? "me" : view.turn}>
        <div className="grid grid-cols-[1.4rem_1fr] grid-rows-[1.4rem_1fr] gap-1 sm:grid-cols-[1.8rem_1fr] sm:grid-rows-[1.8rem_1fr]">
          <span aria-hidden="true" />
          <div className="grid grid-cols-10" aria-hidden="true">
            {COLUMN_LABELS.map((c) => (
              <span
                key={c}
                className={`arcade-display grid place-items-center text-[0.7rem] sm:text-sm ${
                  c === COLUMN_LABELS[focus.x]
                    ? "text-[var(--arc-green)]"
                    : "text-[var(--arc-green)]/45"
                }`}
              >
                {c}
              </span>
            ))}
          </div>
          <div className="grid grid-rows-10" aria-hidden="true">
            {ROWS.map((r) => (
              <span
                key={r}
                className={`arcade-display grid place-items-center text-[0.7rem] sm:text-sm ${
                  r === focus.y + 1 ? "text-[var(--arc-green)]" : "text-[var(--arc-green)]/45"
                }`}
              >
                {r}
              </span>
            ))}
          </div>

          <div
            className="arcade-grid"
            data-armed={armed}
            role="group"
            aria-label={`${view.enemy.callsign}'s waters. Arrow keys to aim, Enter to fire.`}
            onKeyDown={onKeyDown}
          >
            <span className="arcade-grid-rings" aria-hidden="true" />
            <span className="arcade-grid-sweep" aria-hidden="true" />

            {view.enemySunk.map((ship) => (
              <motion.span
                key={ship.kind}
                className="arcade-sunk-ship"
                style={shipArea(ship)}
                initial={{ opacity: 0, scale: 1.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                aria-hidden="true"
              />
            ))}

            {CELLS.map((cell) => {
              const shot = shotAt(view.outgoing, cell);
              const sunkShip = shipAt(view.enemySunk, cell);
              const label = cellLabel(cell);
              const status = sunkShip
                ? `hit, ${sunkShip.kind} sunk`
                : shot
                  ? shot.result
                  : "not fired";
              const disabled = !armed || Boolean(shot);
              const isFocus = focus.x === cell.x && focus.y === cell.y;
              const isLatest = latest && latest.x === cell.x && latest.y === cell.y;
              return (
                <button
                  key={label}
                  ref={(el) => {
                    refs.current[cell.y * BOARD_SIZE + cell.x] = el;
                  }}
                  type="button"
                  className="arcade-cell"
                  style={cellArea(cell)}
                  tabIndex={isFocus ? 0 : -1}
                  aria-label={`${label}, ${status}`}
                  aria-disabled={disabled}
                  data-cell-state={shot ? shot.result : "open"}
                  onFocus={() => setFocus(cell)}
                  onClick={() => {
                    setFocus(cell);
                    if (!disabled) fire(cell);
                  }}
                >
                  {shot?.result === "hit" && <span className="arcade-hit" />}
                  {shot?.result === "miss" && <span className="arcade-miss" />}
                  {isLatest && <Ping key={view.outgoing.length} shot={latest} />}
                  {isLatest && latest.result === "hit" && (
                    <Explosion key={`x${view.outgoing.length}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.at}
            className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          >
            <motion.div
              className={`arcade-display rounded-3xl border-4 px-6 py-4 text-center shadow-2xl ${
                flash.by === "me"
                  ? "border-[var(--arc-coral)] bg-[#2a0710]/90"
                  : "border-[var(--arc-amber)] bg-[#2a1d07]/90"
              }`}
              initial={{ scale: 0.3, rotate: -8 }}
              animate={{ scale: 1, rotate: -3 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 14 }}
            >
              <div className="text-xs tracking-[0.3em] text-white/70">
                {flash.by === "me" ? "Direct hit" : "Mayday"}
              </div>
              <div
                className={`text-4xl sm:text-6xl ${
                  flash.by === "me" ? "arcade-glow-coral" : "text-[var(--arc-amber)]"
                }`}
              >
                {flash.sunk ? shipName(flash.sunk) : ""} SUNK!
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniBoard({ view }: { view: BattleView }) {
  const latest = view.incoming.at(-1);
  return (
    <div
      className="arcade-mini"
      role="img"
      aria-label={`Your fleet. ${view.incoming.filter((s) => s.result === "hit").length} hits taken, ${view.mySunk.length} ships lost.`}
    >
      {view.me.fleet.map((ship) => (
        <span
          key={ship.kind}
          className="arcade-mini-ship"
          data-sunk={view.mySunk.includes(ship.kind)}
          style={shipArea(ship)}
        />
      ))}
      {view.incoming.map((shot) => {
        const isLatest = shot === latest;
        return (
          <span key={cellLabel(shot)} className="arcade-mini-cell" style={cellArea(shot)}>
            {shot.result === "hit" ? (
              <span className="size-[62%] rounded-full bg-[var(--arc-coral)] shadow-[0_0_8px_var(--arc-coral)]" />
            ) : (
              <span className="size-[28%] rounded-full bg-[var(--arc-cyan)]/60" />
            )}
            {isLatest && <Ping key={view.incoming.length} shot={shot} small />}
          </span>
        );
      })}
    </div>
  );
}

function ClockGauge({ view }: { view: BattleView }) {
  const seconds = useCountdown(view.deadline);
  const mine = view.turn === "me";
  const left = view.winner ? 0 : Math.min(view.turnSeconds, seconds);
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const fraction = Math.min(1, left / view.turnSeconds);
  const urgent = mine && !view.winner && left <= 5;
  const color = view.winner
    ? "rgba(216,251,232,0.3)"
    : !mine
      ? "var(--arc-coral)"
      : left <= 10
        ? "var(--arc-amber)"
        : "var(--arc-green)";

  return (
    <div
      className="arcade-gauge relative size-[4.75rem] shrink-0 sm:size-28 lg:size-32"
      data-urgent={urgent}
      role="timer"
      aria-label={`${mine ? "Your" : `${view.enemy.callsign}'s`} turn, ${left} seconds left`}
    >
      <svg
        viewBox="0 0 100 100"
        className="size-full -rotate-90 overflow-visible"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="rgba(3,13,34,0.9)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="9"
        />
        {Array.from({ length: 30 }, (_, i) => {
          const a = (i / 30) * 2 * Math.PI;
          return (
            <line
              key={i}
              x1={50 + Math.cos(a) * 31}
              y1={50 + Math.sin(a) * 31}
              x2={50 + Math.cos(a) * 34}
              y2={50 + Math.sin(a) * 34}
              stroke="rgba(216,251,232,0.25)"
              strokeWidth="1"
            />
          );
        })}
        <circle
          className="arcade-gauge-arc"
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="arcade-display text-2xl leading-none sm:text-4xl" style={{ color }}>
            {view.winner ? "--" : left}
          </div>
          <div className="arcade-label !text-[0.55rem]">sec</div>
        </div>
      </div>
    </div>
  );
}

function FleetList({
  title,
  tone,
  ships,
}: {
  title: string;
  tone: "green" | "coral";
  ships: ReadonlyArray<{ kind: ShipKind; length: number; sunk: boolean; hits: number | undefined }>;
}) {
  const afloat = ships.filter((s) => !s.sunk).length;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3
          className={`arcade-display truncate text-xs sm:text-sm ${tone === "green" ? "text-[var(--arc-green)]" : "text-[var(--arc-coral)]"}`}
        >
          {title}
        </h3>
        <span className="arcade-label shrink-0 !text-[0.58rem]">{afloat}/5 afloat</span>
      </div>
      <ul className="space-y-1.5">
        {ships.map((ship) => (
          <li
            key={ship.kind}
            className={`flex items-center justify-between gap-2 text-[0.68rem] font-extrabold tracking-wider sm:text-xs ${
              ship.sunk ? "text-[var(--arc-coral)]" : "text-[var(--arc-ink)]/85"
            }`}
          >
            <span
              className={`flex items-center gap-1.5 truncate ${ship.sunk ? "line-through decoration-2" : ""}`}
            >
              {ship.sunk && <Skull className="size-3 shrink-0" aria-hidden="true" />}
              {shipName(ship.kind)}
              <span className="sr-only">{ship.sunk ? ", sunk" : ", afloat"}</span>
            </span>
            <span className="flex shrink-0 gap-[3px]" aria-hidden="true">
              {Array.from({ length: ship.length }, (_, i) => {
                const damaged = ship.sunk || (ship.hits !== undefined && i < ship.hits);
                const pipColor = damaged
                  ? "text-[var(--arc-coral)]"
                  : ship.hits === undefined
                    ? "text-[var(--arc-ink)]/30"
                    : "text-[var(--arc-green)]";
                return (
                  <span
                    key={i}
                    className={`arcade-pip ${pipColor}`}
                    data-filled={damaged || ship.hits !== undefined}
                  />
                );
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ticker({ view }: { view: BattleView }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [view.log.length]);

  return (
    <div className="arcade-terminal flex min-h-0 flex-1 flex-col p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="arcade-label !text-[var(--arc-green)]/80">Sonar log</span>
        <span className="arcade-label">{view.log.length} contacts</span>
      </div>
      <ol
        ref={ref}
        className="max-h-44 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 text-[0.72rem] leading-relaxed sm:text-xs lg:max-h-none"
        aria-label="Shot log"
      >
        {view.log.map((entry, i) => {
          const mine = entry.by === "me";
          const hit = entry.result === "hit";
          return (
            <li key={`${entry.at}-${i}`} className="flex gap-2 whitespace-nowrap">
              <span className={mine ? "text-[var(--arc-green)]" : "text-[var(--arc-coral)]/80"}>
                {mine ? "YOU" : "FOE"}
              </span>
              <span className="text-white/35">{">"}</span>
              <span className="truncate">
                <span className="text-white">{cellLabel(entry)}</span>{" "}
                <span
                  className={
                    hit ? "font-extrabold text-[var(--arc-coral)]" : "text-[var(--arc-cyan)]/70"
                  }
                >
                  {hit ? "HIT" : "MISS"}
                </span>
                {entry.sunk && (
                  <span className="font-extrabold text-[var(--arc-amber)]">
                    {" "}
                    — {shipName(entry.sunk)} SUNK
                  </span>
                )}
              </span>
            </li>
          );
        })}
        <li aria-hidden="true">
          <span className="text-[var(--arc-green)]">{">"}</span> <span className="arcade-caret" />
        </li>
      </ol>
    </div>
  );
}

function ResultOverlay({ view, rematch }: { view: BattleView; rematch: () => void }) {
  const won = view.winner === "me";
  const hits = view.outgoing.filter((s) => s.result === "hit").length;
  const accuracy = view.outgoing.length ? Math.round((hits / view.outgoing.length) * 100) : 0;
  const forfeited = !won && view.mySunk.length < FLEET.length;
  const line = won
    ? `All five of ${view.enemy.callsign}'s ships are on the sea floor.`
    : forfeited
      ? `You struck your colours. ${view.enemy.callsign} takes the win.`
      : `${view.enemy.callsign} found every last ship of yours.`;

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-[#020814]/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="arcade-result-title"
    >
      <motion.div
        className={`arcade-panel w-full max-w-md p-6 text-center sm:p-8 ${won ? "" : "!border-[var(--arc-coral)]/50"}`}
        initial={{ scale: 0.6, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
      >
        <div
          className={`mx-auto grid size-20 place-items-center rounded-full ${
            won
              ? "bg-[var(--arc-green)] text-[#03230f] shadow-[0_0_40px_var(--arc-green)]"
              : "bg-[var(--arc-coral)] text-[#2a0307] shadow-[0_0_40px_var(--arc-coral)]"
          }`}
          aria-hidden="true"
        >
          {won ? (
            <Trophy className="size-10" strokeWidth={2.5} />
          ) : (
            <Skull className="size-10" strokeWidth={2.5} />
          )}
        </div>
        <h2
          id="arcade-result-title"
          className={`arcade-display mt-5 text-5xl sm:text-6xl ${won ? "arcade-glow-green" : "arcade-glow-coral"}`}
        >
          {won ? "Victory" : forfeited ? "Forfeit" : "Sunk"}
        </h2>
        <p className="mt-2 text-sm text-[var(--arc-ink)]/75">{line}</p>

        <dl className="mt-6 grid grid-cols-3 gap-2">
          {[
            ["Shots", view.outgoing.length],
            ["Hits", hits],
            ["Accuracy", `${accuracy}%`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-black/30 py-3">
              <dt className="arcade-label">{k}</dt>
              <dd className="arcade-display text-2xl">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-7 flex flex-col gap-4">
          <button
            type="button"
            onClick={rematch}
            className="arcade-btn h-16 w-full text-xl"
            autoFocus
          >
            <RotateCcw className="size-6" strokeWidth={3} aria-hidden="true" />
            Rematch
          </button>
          <Link
            to="/"
            search={{ variant: "A" }}
            className="arcade-btn arcade-btn-ghost h-12 w-full text-sm"
          >
            <LogOut className="size-4" strokeWidth={3} aria-hidden="true" />
            Leave to dock
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- screen ---------- */

export function ArcadeBattle({ view, fire, forfeit, rematch }: BattleProps) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);

  const lastShot = view.log.at(-1);
  const lastSink = view.log.findLast((e) => e.sunk);
  const mine = view.turn === "me";

  const myShips = FLEET.map((f) => {
    const ship = view.me.fleet.find((s) => s.kind === f.kind);
    const hits = ship
      ? ship.cells.filter((c) => shotAt(view.incoming, c)?.result === "hit").length
      : 0;
    return { kind: f.kind, length: f.length, sunk: view.mySunk.includes(f.kind), hits };
  });
  const enemyShips = FLEET.map((f) => ({
    kind: f.kind,
    length: f.length,
    sunk: view.enemySunk.some((s) => s.kind === f.kind),
    hits: undefined,
  }));

  return (
    <div className="v-arcade">
      <div className="relative z-[2] mx-auto flex min-h-dvh max-w-[1440px] flex-col px-3 pt-3 pb-20 sm:px-6 lg:pb-16">
        {/* Top HUD */}
        <header className="arcade-panel flex items-center gap-2 !rounded-full px-3 py-2 sm:gap-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="arcade-label !text-[0.55rem]">You</div>
            <div className="arcade-display truncate text-xs text-[var(--arc-green)] sm:text-base">
              {view.me.callsign}
            </div>
          </div>
          <span
            className="arcade-display shrink-0 text-sm text-white/40 sm:text-lg"
            aria-hidden="true"
          >
            VS
          </span>
          <div className="min-w-0 flex-1 text-right sm:text-left">
            <div className="arcade-label !text-[0.55rem]">Target</div>
            <div className="arcade-display truncate text-xs text-[var(--arc-coral)] sm:text-base">
              {view.enemy.callsign}
            </div>
          </div>
          <button
            type="button"
            onClick={() => (confirming ? forfeit() : setConfirming(true))}
            disabled={Boolean(view.winner)}
            className={`arcade-btn h-10 shrink-0 px-3 text-[0.65rem] sm:px-5 sm:text-xs ${
              confirming ? "arcade-btn-coral" : "arcade-btn-ghost"
            }`}
            aria-label={confirming ? "Confirm forfeit" : "Forfeit match"}
          >
            <Flag className="size-4" strokeWidth={3} aria-hidden="true" />
            <span className={confirming ? "" : "max-sm:sr-only"}>
              {confirming ? "Sure?" : "Forfeit"}
            </span>
          </button>
        </header>

        <div className="arcade-battle mt-3 grid flex-1 gap-3 sm:mt-5 sm:gap-5">
          {/* My fleet mini-board: top strip on phone, side panel on desktop */}
          <section
            className="arcade-panel arcade-area-mine flex flex-col p-3 lg:p-5"
            aria-labelledby="arcade-mine-title"
          >
            <h2 id="arcade-mine-title" className="arcade-label mb-2 flex justify-between">
              <span>Your fleet</span>
              <span className="text-[var(--arc-coral)]/90 max-lg:hidden">
                {view.mySunk.length} lost
              </span>
            </h2>
            <MiniBoard view={view} />
          </section>

          {/* Turn clock */}
          <section
            className={`arcade-panel arcade-area-clock flex items-center gap-3 p-3 sm:gap-5 lg:flex-col lg:justify-center lg:p-5 lg:text-center ${
              mine && !view.winner ? "" : "!border-[var(--arc-coral)]/40"
            }`}
            aria-label="Turn clock"
          >
            <ClockGauge view={view} />
            <div className="min-w-0">
              <div
                className={`arcade-display text-base leading-tight sm:text-2xl lg:text-3xl ${
                  view.winner ? "text-white/60" : mine ? "arcade-glow-green" : "arcade-glow-coral"
                }`}
              >
                {view.winner ? "Cease fire" : mine ? "Your shot" : "Incoming"}
              </div>
              <p className="mt-1 text-[0.7rem] text-[var(--arc-ink)]/65 sm:text-xs">
                {view.winner
                  ? "Engagement over."
                  : mine
                    ? "Pick a cell. Auto-miss at zero."
                    : `${view.enemy.callsign} is aiming…`}
              </p>
              {lastSink?.sunk && (
                <p className="mt-2 text-[0.68rem] font-extrabold tracking-wider text-[var(--arc-amber)] sm:text-xs">
                  {lastSink.by === "me" ? "▲ Sank their " : "▼ Lost your "}
                  {shipName(lastSink.sunk)}
                </p>
              )}
            </div>
          </section>

          {/* Enemy radar */}
          <section
            className="arcade-area-board flex min-w-0 justify-center"
            aria-label="Enemy radar"
          >
            <div className="w-full lg:w-[min(100%,calc(100dvh-8.5rem))]">
              <EnemyBoard view={view} fire={fire} lastSink={lastSink} />
            </div>
          </section>

          {/* Fleet status, both sides */}
          <section
            className="arcade-panel arcade-area-fleet grid grid-cols-2 content-start gap-4 p-3 sm:p-5 lg:grid-cols-1 lg:gap-8"
            aria-label="Fleet status"
          >
            <FleetList title={view.me.callsign} tone="green" ships={myShips} />
            <FleetList title={view.enemy.callsign} tone="coral" ships={enemyShips} />
          </section>

          {/* Terminal ticker */}
          <section className="arcade-area-log flex min-h-0 flex-col" aria-label="Sonar log">
            <Ticker view={view} />
          </section>
        </div>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {lastShot ? describeShot(lastShot, view.enemy.callsign) : ""}
        </div>
      </div>

      <AnimatePresence>
        {view.winner && <ResultOverlay key="result" view={view} rematch={rematch} />}
      </AnimatePresence>
    </div>
  );
}
