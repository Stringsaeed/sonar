// PROTOTYPE — throwaway. Variant C "Toy-box" landing: a bathtub sea scene.
import type { MatchSummary } from "@sonar/game";
import { ArrowRight, Link2, Play, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { LandingProps } from "../fixtures";
import { LifeRing, Octopus, ToyBoat, Waves } from "./parts";
import "./toybox.css";

const CODE_LENGTH = 6;

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");

const duration = (ms: number) => {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
};

const ago = (at: number) => {
  const hours = Math.round((Date.now() - at) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
};

const ending = (match: MatchSummary) => {
  if (match.endReason === "sunk") return match.won ? "Sank every boat" : "Our fleet went glug";
  if (match.endReason === "forfeit") return match.won ? "They waved the white flag" : "We gave up";
  return match.won ? "They drifted off" : "We drifted off";
};

const bounce = { type: "spring", stiffness: 420, damping: 14 } as const;

export function ToyboxLanding({
  callsign,
  stats,
  record,
  live,
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
}: LandingProps) {
  const [code, setCode] = useState("");
  const ready = code.length === CODE_LENGTH;

  return (
    <div className="v-toybox min-h-dvh overflow-x-hidden bg-[#1a8fb0]">
      {/* ---------- Sky + hero ---------- */}
      <div className="toybox-sky relative">
        <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-7">
          <div className="flex items-center gap-2">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#ffd23f] shadow-[inset_0_3px_0_rgb(255_255_255/0.6),0_4px_0_#e5a800]">
              <ToyBoat length={2} className="w-8" color="#ff7eb6" lip="#e0518f" />
            </span>
            <span className="toybox-display text-3xl tracking-tight">
              Sonar<span className="text-[#ff7eb6]">!</span>
            </span>
          </div>
          <div className="flex items-center gap-2" aria-label="Live right now">
            <span className="toybox-float flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-sm font-semibold shadow-[0_4px_0_rgb(35_57_93/0.1)]">
              <span className="toybox-pulse-dot size-2.5 rounded-full bg-[#3fbf86]" />
              {live.online} captains online
            </span>
            <span
              className="toybox-float flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-sm font-semibold shadow-[0_4px_0_rgb(35_57_93/0.1)]"
              style={{ animationDelay: "-2.2s" }}
            >
              <span className="size-2.5 rounded-full bg-[#ffd23f]" />
              {live.inQueue} waiting to play
            </span>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 px-5 pt-6 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:pt-10">
          {/* Callsign life ring */}
          <div className="order-1 flex justify-center lg:order-2">
            <div className="toybox-bob relative w-56 sm:w-72 lg:w-[22rem]">
              <LifeRing className="toybox-spin-slow w-full drop-shadow-[0_12px_0_rgb(35_57_93/0.08)]" />
              <Octopus
                mood="happy"
                className="absolute left-1/2 top-[18%] w-[38%] -translate-x-1/2"
              />
              <div className="toybox-sticker absolute bottom-[4%] left-1/2 w-max max-w-[110%] -translate-x-1/2 -rotate-3 bg-[#ffd23f] px-4 py-2 text-center">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#23395d]/70">
                  Ahoy, you are
                </p>
                <p className="toybox-display text-xl leading-tight sm:text-2xl">{callsign}</p>
              </div>
            </div>
          </div>

          <div className="order-2 min-w-0 text-center lg:order-1 lg:text-left">
            <h1 className="toybox-display text-[2.6rem] leading-[0.95] sm:text-6xl lg:text-7xl">
              Sink their <span className="text-[#ff6b5e]">rubber</span> navy.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-lg text-[#4a6288] lg:mx-0">
              Classic Battleship, one on one. Thirty seconds a shot, then the fuse runs out and you
              splash.
            </p>

            <motion.button
              type="button"
              onClick={onQuickMatch}
              whileTap={{ scaleX: 1.06, scaleY: 0.9 }}
              transition={bounce}
              className="toybox-candy toybox-focus mt-7 inline-flex w-full max-w-md items-center justify-center gap-4 bg-[#ffd23f] px-8 py-5 sm:py-6"
            >
              <span className="grid size-12 place-items-center rounded-full bg-[#23395d] text-[#ffd23f] sm:size-14">
                <Play className="ml-1 size-6 fill-current sm:size-7" />
              </span>
              <span className="text-left">
                <span className="toybox-display block text-4xl leading-none sm:text-5xl">
                  Play now
                </span>
                <span className="mt-1 block text-sm font-medium text-[#23395d]/70">
                  Quick Match with a random captain
                </span>
              </span>
            </motion.button>

            <div className="mx-auto mt-8 flex max-w-md flex-col sm:max-w-xl items-stretch gap-3 sm:flex-row sm:items-center lg:mx-0">
              <motion.button
                type="button"
                onClick={onCreateRoom}
                whileHover={{ rotate: 0, scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                transition={bounce}
                className="toybox-sticker toybox-focus flex shrink-0 -rotate-2 items-center justify-center gap-2 bg-[#ff7eb6] px-4 py-3 font-semibold text-white"
              >
                <Link2 className="size-5" />
                Private room for a friend
              </motion.button>

              <form
                className="toybox-sticker toybox-focus-within flex flex-1 rotate-1 items-center gap-2 bg-white px-3 py-2 sm:min-w-[17rem]"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (ready) onJoinRoom(code);
                }}
              >
                <label className="relative flex flex-1 cursor-text items-center gap-1">
                  <span className="sr-only">Room code, 6 characters</span>
                  <input
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, CODE_LENGTH),
                      )
                    }
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={CODE_LENGTH}
                    className="absolute inset-0 z-10 w-full cursor-text opacity-0"
                  />
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
                    <span
                      key={i}
                      data-filled={Boolean(code[i])}
                      className={`toybox-slot grid h-10 flex-1 place-items-center rounded-xl text-lg font-bold ${
                        code[i]
                          ? "bg-[#c4ecff] text-[#23395d]"
                          : i === code.length
                            ? "bg-[#fff4d6] text-[#23395d]/30 ring-2 ring-[#ffd23f]"
                            : "bg-[#f1f5fb] text-[#23395d]/25"
                      }`}
                    >
                      {code[i] ?? "·"}
                    </span>
                  ))}
                </label>
                <button
                  type="submit"
                  disabled={!ready}
                  aria-label="Join room"
                  className="toybox-candy toybox-focus grid size-10 shrink-0 place-items-center bg-[#7ee8b5] [--toybox-lip:#3fbf86]"
                >
                  <ArrowRight className="size-5" />
                </button>
              </form>
            </div>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#4a6288] lg:mx-0">
              Got a code from a friend? Type its 6 letters and hop in.
            </p>
          </div>
        </main>

        <div className="mt-6 lg:mt-2">
          <Waves>
            <div className="toybox-bob absolute left-[8%] top-0 w-24 sm:w-32">
              <ToyBoat length={4} color="#ff7eb6" lip="#e0518f" className="w-full" />
            </div>
            <div
              className="toybox-bob absolute left-[46%] top-3 w-16 sm:w-20"
              style={{ animationDelay: "-1.1s" }}
            >
              <ToyBoat length={2} color="#7ee8b5" lip="#3fbf86" className="w-full" />
            </div>
            <div
              className="toybox-bob absolute right-[8%] top-1 w-28 sm:w-36"
              style={{ animationDelay: "-2s" }}
            >
              <ToyBoat length={5} color="#ffd23f" lip="#e5a800" className="w-full" />
            </div>
          </Waves>
        </div>
      </div>

      {/* ---------- Under the sea: stats + trophy shelf ---------- */}
      <section className="toybox-sea -mt-px pb-28 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 pt-4 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] lg:gap-12">
          <div className="min-w-0">
            <h2 className="toybox-display text-2xl">Ocean gossip</h2>
            <p className="text-white/80">What everyone else has been up to.</p>
            <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-5">
              {[
                { label: "games today", value: stats?.matchesToday, size: "size-36", delay: "0s" },
                {
                  label: "games ever",
                  value: stats?.matchesAllTime,
                  size: "size-40",
                  delay: "-1.3s",
                },
                { label: "boats sunk", value: stats?.shipsSunk, size: "size-40", delay: "-2.4s" },
                {
                  label: "shots fired",
                  value: stats?.shotsFired,
                  size: "size-36",
                  delay: "-3.1s",
                },
              ].map((bubble, i) => (
                <li
                  key={bubble.label}
                  className={`toybox-bubble toybox-float mx-auto grid ${bubble.size} place-items-center text-center ${
                    i % 2 === 1 ? "mt-6" : ""
                  }`}
                  style={{ animationDelay: bubble.delay }}
                  title={bubble.value === undefined ? undefined : full.format(bubble.value)}
                >
                  <span>
                    <span className="toybox-display block text-4xl text-[#23395d]">
                      {bubble.value === undefined ? "–" : compact.format(bubble.value)}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold text-[#23395d]/75">
                      {bubble.label}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <h2 className="toybox-display text-2xl">Your trophy shelf</h2>
            <p className="text-white/80">Only on this device. No account needed.</p>

            <div className="relative mt-5">
              <div className="flex items-end gap-3 overflow-x-auto px-2 pb-3 pt-2 sm:gap-4">
                <div className="flex shrink-0 flex-col items-center px-1">
                  <div className="grid size-20 place-items-center rounded-full bg-[#ffd23f] shadow-[inset_0_4px_0_rgb(255_255_255/0.6),0_5px_0_#e5a800]">
                    <Trophy className="size-10 text-[#23395d]" strokeWidth={2.4} />
                  </div>
                  <p className="toybox-display mt-2 text-3xl leading-none">
                    {record ? (
                      <>
                        {record.wins}
                        <span className="px-1 text-white/60">–</span>
                        {record.losses}
                      </>
                    ) : (
                      "0–0"
                    )}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                    wins – losses
                  </p>
                </div>

                {record && record.recent.length > 0 ? (
                  record.recent.map((match, i) => (
                    <motion.article
                      key={match.id}
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      whileHover={{ y: -8, rotate: 0 }}
                      transition={{ ...bounce, delay: 0.1 * i }}
                      style={{ rotate: [-3, 2, -1.5][i % 3] ?? 0 }}
                      className="w-44 shrink-0 rounded-2xl bg-white p-3 lg:w-40 text-[#23395d] shadow-[0_6px_0_rgb(35_57_93/0.15)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            match.won ? "bg-[#7ee8b5]" : "bg-[#ffd0e3] text-[#b0336b]"
                          }`}
                        >
                          {match.won ? "Won" : "Lost"}
                        </span>
                        <span className="text-xs text-[#4a6288]">{ago(match.endedAt)}</span>
                      </div>
                      <p className="mt-2 text-xs text-[#4a6288]">vs</p>
                      <p className="toybox-display truncate text-lg leading-tight">
                        {match.opponent}
                      </p>
                      <p className="mt-1 text-sm font-medium">{ending(match)}</p>
                      <div className="mt-2 flex gap-3 border-t-2 border-dashed border-[#23395d]/10 pt-2 text-xs font-semibold text-[#4a6288]">
                        <span>{match.shotsFired} shots</span>
                        <span>{duration(match.durationMs)}</span>
                      </div>
                    </motion.article>
                  ))
                ) : (
                  <p className="self-center rounded-2xl bg-white/20 px-4 py-3 text-sm">
                    No games yet. Your first trophy is one Play now away.
                  </p>
                )}
              </div>
              <div className="toybox-shelf h-5 rounded-full" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
