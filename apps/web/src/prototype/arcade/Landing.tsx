// PROTOTYPE — throwaway. Variant A "Sonar arcade" landing: a radar scope hero with HUD readouts.
import { ROOM_CODE_LENGTH, type MatchSummary } from "@sonar/game";
import { Crosshair, DoorOpen, Link2, Radar, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import type { LandingProps } from "../fixtures";
import "./arcade.css";

const SWEEP_SECONDS = 4;
const fmt = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

// Blips sit at a bearing (deg clockwise from north) and a radius (fraction of the scope). Their
// flash is delayed so it lands exactly when the sweep passes over them.
const BLIPS = [
  { bearing: 38, radius: 0.62, tone: "green" },
  { bearing: 112, radius: 0.34, tone: "green" },
  { bearing: 161, radius: 0.71, tone: "coral" },
  { bearing: 205, radius: 0.5, tone: "green" },
  { bearing: 252, radius: 0.78, tone: "green" },
  { bearing: 297, radius: 0.28, tone: "coral" },
  { bearing: 333, radius: 0.55, tone: "green" },
] as const;

const duration = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const ago = (at: number) => {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const END_REASON: Record<MatchSummary["endReason"], string> = {
  sunk: "Fleet sunk",
  forfeit: "Forfeit",
  disconnect: "Disconnect",
};

function Readout({
  label,
  value,
  side,
  title,
}: {
  label: string;
  value: number;
  side: "left" | "right";
  title: string;
}) {
  return (
    <div
      className={`arcade-readout ${side === "left" ? "text-left md:text-right" : "text-left"}`}
      data-side={side}
      title={title}
    >
      <div className="arcade-label">{label}</div>
      <div className="arcade-display arcade-glow-green text-2xl leading-tight md:text-3xl">
        <span className="md:hidden">{compact.format(value)}</span>
        <span className="hidden md:inline">{fmt.format(value)}</span>
      </div>
    </div>
  );
}

function Scope({ callsign }: { callsign: string }) {
  return (
    <div className="arcade-scope w-full">
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        fill="none"
        stroke="rgba(57,255,136,0.28)"
      >
        {[24, 48, 72, 96].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} strokeWidth="0.6" />
        ))}
        <line x1="100" y1="4" x2="100" y2="196" strokeWidth="0.5" />
        <line x1="4" y1="100" x2="196" y2="100" strokeWidth="0.5" />
        <line x1="32" y1="32" x2="168" y2="168" strokeWidth="0.3" strokeDasharray="2 3" />
        <line x1="168" y1="32" x2="32" y2="168" strokeWidth="0.3" strokeDasharray="2 3" />
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i * 5 * Math.PI) / 180;
          const inner = i % 6 === 0 ? 89 : 93;
          return (
            <line
              key={i}
              x1={100 + Math.sin(a) * inner}
              y1={100 - Math.cos(a) * inner}
              x2={100 + Math.sin(a) * 97}
              y2={100 - Math.cos(a) * 97}
              strokeWidth={i % 6 === 0 ? 0.9 : 0.4}
              stroke="rgba(57,255,136,0.5)"
            />
          );
        })}
        {[0, 90, 180, 270].map((deg) => {
          const a = (deg * Math.PI) / 180;
          return (
            <text
              key={deg}
              x={100 + Math.sin(a) * 82}
              y={100 - Math.cos(a) * 82 + 2.5}
              textAnchor="middle"
              fontSize="6"
              fill="rgba(57,255,136,0.6)"
              stroke="none"
              fontFamily="JetBrains Mono, monospace"
            >
              {String(deg).padStart(3, "0")}
            </text>
          );
        })}
      </svg>

      {BLIPS.map((blip) => {
        const a = (blip.bearing * Math.PI) / 180;
        return (
          <span
            key={blip.bearing}
            className="arcade-blip"
            data-tone={blip.tone}
            style={{
              left: `${50 + Math.sin(a) * blip.radius * 50}%`,
              top: `${50 - Math.cos(a) * blip.radius * 50}%`,
              animationDuration: `${SWEEP_SECONDS}s`,
              animationDelay: `${(blip.bearing / 360) * SWEEP_SECONDS - SWEEP_SECONDS}s`,
            }}
            aria-hidden="true"
          />
        );
      })}

      <div
        className="arcade-sweep"
        style={{ ["--arc-sweep" as string]: `${SWEEP_SECONDS}s` }}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-[14%] text-center">
        <p className="arcade-label mb-2 !text-[0.6rem] sm:!text-xs">
          Pilot <span className="text-[var(--arc-green)]">{callsign}</span> on deck
        </p>
        <h1 className="arcade-display arcade-glow-green text-[clamp(3rem,14vw,6rem)] leading-[0.85]">
          SONAR
        </h1>
        <p className="mt-3 max-w-[18rem] text-[0.7rem] font-semibold tracking-wide text-[var(--arc-ink)]/80 sm:text-sm">
          Classic Battleship. Strict 1v1. No sign-up. 30 seconds a shot.
        </p>
      </div>
    </div>
  );
}

function PilotCard({ callsign, record }: Pick<LandingProps, "callsign" | "record">) {
  const wins = record?.wins ?? 0;
  const losses = record?.losses ?? 0;
  const played = wins + losses;
  const rate = played ? Math.round((wins / played) * 100) : 0;
  const initials = callsign
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <section className="arcade-panel p-5 sm:p-6" aria-labelledby="arcade-pilot-title">
      <div className="flex items-center gap-4">
        <div
          className="arcade-display grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-[var(--arc-green)] bg-[#06301f] text-2xl text-[var(--arc-green)] shadow-[0_0_24px_rgba(57,255,136,0.35)]"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="arcade-label">Pilot card</p>
          <h2 id="arcade-pilot-title" className="arcade-display truncate text-xl sm:text-2xl">
            {callsign}
          </h2>
          <p className="text-xs text-[var(--arc-ink)]/60">
            Callsign assigned at random. No account.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-[#06301f] py-3">
          <div className="arcade-display arcade-glow-green text-3xl">{wins}</div>
          <div className="arcade-label">Wins</div>
        </div>
        <div className="rounded-2xl bg-[#3a0d17] py-3">
          <div className="arcade-display arcade-glow-coral text-3xl">{losses}</div>
          <div className="arcade-label">Losses</div>
        </div>
        <div className="rounded-2xl bg-[#0d2c59] py-3">
          <div className="arcade-display text-3xl text-[var(--arc-cyan)]">{rate}%</div>
          <div className="arcade-label">Win rate</div>
        </div>
      </div>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#3a0d17]"
        role="img"
        aria-label={`Record ${wins} wins, ${losses} losses`}
      >
        <div
          className="h-full rounded-full bg-[var(--arc-green)] shadow-[0_0_12px_var(--arc-green)]"
          style={{ width: `${rate}%` }}
        />
      </div>

      <h3 className="arcade-label mt-6 mb-2">Recent sorties</h3>
      {record && record.recent.length > 0 ? (
        <ul className="space-y-2">
          {record.recent.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/25 px-3 py-2.5"
            >
              <span
                className={`arcade-display grid size-9 shrink-0 place-items-center rounded-xl text-sm ${
                  m.won
                    ? "bg-[var(--arc-green)] text-[#03230f]"
                    : "bg-[var(--arc-coral)] text-[#2a0307]"
                }`}
              >
                {m.won ? "W" : "L"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold">
                  <span className="sr-only">{m.won ? "Won" : "Lost"} against </span>
                  {m.opponent}
                </div>
                <div className="text-[0.7rem] text-[var(--arc-ink)]/55">
                  {END_REASON[m.endReason]} · {m.mode === "quick" ? "Quick match" : "Private room"}{" "}
                  · {ago(m.endedAt)}
                </div>
              </div>
              <div className="text-right text-[0.7rem] leading-tight text-[var(--arc-ink)]/70">
                <div>
                  <span className="font-extrabold text-[var(--arc-ink)]">{m.shotsFired}</span> shots
                </div>
                <div>{duration(m.durationMs)}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-black/25 px-3 py-4 text-sm text-[var(--arc-ink)]/60">
          No sorties yet. Hit Quick Match to log your first.
        </p>
      )}
    </section>
  );
}

function PrivateRoom({
  onCreateRoom,
  onJoinRoom,
}: Pick<LandingProps, "onCreateRoom" | "onJoinRoom">) {
  const [code, setCode] = useState("");
  const ready = code.length === ROOM_CODE_LENGTH;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) onJoinRoom(code);
  };

  return (
    <section className="arcade-panel flex flex-col p-5 sm:p-6" aria-labelledby="arcade-room-title">
      <p className="arcade-label">Play a friend</p>
      <h2 id="arcade-room-title" className="arcade-display text-xl sm:text-2xl">
        Private room
      </h2>
      <p className="mt-1 text-xs text-[var(--arc-ink)]/60">
        Spin up a room and send the link. Whoever opens it first is your opponent.
      </p>

      <button
        type="button"
        onClick={onCreateRoom}
        className="arcade-btn arcade-btn-cyan mt-5 h-14 w-full text-base"
      >
        <Link2 className="size-5" strokeWidth={3} aria-hidden="true" />
        Create room
      </button>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        <span className="arcade-label">or join by code</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="arcade-room-code" className="sr-only">
          Room code, {ROOM_CODE_LENGTH} characters
        </label>
        <div className="arcade-code">
          {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => (
            <span
              key={i}
              className="arcade-code-slot"
              data-active={i === Math.min(code.length, ROOM_CODE_LENGTH - 1)}
              aria-hidden="true"
            >
              {code[i] ?? <span className="text-white/15">·</span>}
            </span>
          ))}
          <input
            id="arcade-room-code"
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, ROOM_CODE_LENGTH),
              )
            }
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            maxLength={ROOM_CODE_LENGTH}
          />
        </div>
        <button
          type="submit"
          disabled={!ready}
          className="arcade-btn arcade-btn-ghost h-12 w-full text-sm"
        >
          <DoorOpen className="size-4" strokeWidth={3} aria-hidden="true" />
          Join room
        </button>
      </form>

      <ul className="mt-6 grid grid-cols-2 gap-2 border-t border-white/10 pt-5 text-[0.7rem] text-[var(--arc-ink)]/70 md:mt-auto">
        <li>
          <span className="text-[var(--arc-green)]">▸</span> 10×10 grid, 5 ships
        </li>
        <li>
          <span className="text-[var(--arc-green)]">▸</span> 30s a shot, then auto-miss
        </li>
        <li>
          <span className="text-[var(--arc-green)]">▸</span> Hit or miss, turns alternate
        </li>
        <li>
          <span className="text-[var(--arc-green)]">▸</span> Bail out and it&apos;s a forfeit
        </li>
      </ul>
    </section>
  );
}

export function ArcadeLanding({
  callsign,
  stats,
  record,
  live,
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
}: LandingProps) {
  const readouts = [
    { label: "Matches today", value: stats?.matchesToday ?? 0, title: "Matches played today" },
    { label: "All-time matches", value: stats?.matchesAllTime ?? 0, title: "Matches played, ever" },
    { label: "Ships sunk", value: stats?.shipsSunk ?? 0, title: "Ships sunk across every match" },
    {
      label: "Shots fired",
      value: stats?.shotsFired ?? 0,
      title: "Shots fired across every match",
    },
  ] as const;

  return (
    <div className="v-arcade">
      <div className="relative z-[2] mx-auto max-w-6xl px-4 pt-4 pb-28 sm:px-6 md:pt-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radar
              className="size-6 text-[var(--arc-green)]"
              strokeWidth={2.5}
              aria-hidden="true"
            />
            <span className="arcade-display arcade-glow-green text-lg">SONAR</span>
          </div>
          <div
            className="flex items-center gap-2 rounded-full border border-[var(--arc-green)]/30 bg-black/30 px-3 py-1.5 text-[0.7rem] font-extrabold tracking-wider sm:gap-4 sm:px-4 sm:text-xs"
            aria-label={`${live.online} pilots online, ${live.inQueue} in queue`}
          >
            <span className="flex items-center gap-1.5">
              <span className="arcade-live-dot" aria-hidden="true" />
              <span className="text-[var(--arc-green)]">{live.online}</span> ONLINE
            </span>
            <span className="h-3 w-px bg-white/20" aria-hidden="true" />
            <span className="flex items-center gap-1.5">
              <span className="arcade-live-dot" data-tone="amber" aria-hidden="true" />
              <span className="text-[var(--arc-amber)]">{live.inQueue}</span> IN QUEUE
            </span>
          </div>
        </header>

        <main>
          {/* Hero: readouts flank the scope on desktop, sit above/below it on phones. */}
          <section
            className="mt-6 grid grid-cols-2 items-center gap-3 md:mt-8 md:grid-cols-[1fr_minmax(0,560px)_1fr] md:gap-8"
            aria-label="Live sonar"
          >
            <div className="order-1 grid grid-cols-2 gap-3 max-md:col-span-2 md:order-none md:grid-cols-1 md:gap-10">
              <Readout {...readouts[0]} side="left" />
              <Readout {...readouts[1]} side="left" />
            </div>

            <div className="order-2 col-span-2 flex flex-col items-center md:order-none md:col-span-1">
              <motion.div
                className="w-full px-3 md:px-0"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 18 }}
              >
                <Scope callsign={callsign} />
              </motion.div>

              <motion.button
                type="button"
                onClick={onQuickMatch}
                className="arcade-btn arcade-quick relative z-[3] -mt-12 h-20 w-[min(100%,26rem)] flex-col gap-0 text-[1.75rem] sm:-mt-14 sm:h-24 sm:text-4xl"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 16 }}
              >
                <span className="flex items-center gap-3 leading-none">
                  <Crosshair className="size-7 sm:size-9" strokeWidth={3} aria-hidden="true" />
                  Quick match
                </span>
                <span
                  style={{ fontFamily: "var(--arc-mono)" }}
                  className="mt-1 text-[0.65rem] font-extrabold tracking-[0.18em] text-[#03230f]/75 sm:text-xs"
                >
                  <Users className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
                  {live.inQueue} PILOTS WAITING
                </span>
              </motion.button>
            </div>

            <div className="order-3 grid grid-cols-2 gap-3 max-md:col-span-2 md:order-none md:grid-cols-1 md:gap-10">
              <Readout {...readouts[2]} side="right" />
              <Readout {...readouts[3]} side="right" />
            </div>
          </section>

          <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-[1.3fr_1fr]">
            <PilotCard callsign={callsign} record={record} />
            <PrivateRoom onCreateRoom={onCreateRoom} onJoinRoom={onJoinRoom} />
          </div>
        </main>
      </div>
    </div>
  );
}
