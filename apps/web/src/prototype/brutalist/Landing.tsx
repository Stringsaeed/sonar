// PROTOTYPE — throwaway. Variant B landing: a neo-brutalist newspaper front page.
import type { MatchSummary } from "@sonar/game";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { LandingProps } from "../fixtures";
import "./brutalist.css";

const CODE_LENGTH = 6;
const num = new Intl.NumberFormat("en-US");
const today = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

const END_REASON: Record<MatchSummary["endReason"], string> = {
  sunk: "Fleet sunk",
  forfeit: "Forfeit",
  disconnect: "Walked off",
};

const duration = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const ago = (at: number) => {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const TICKER = [
  "Ten by ten",
  "Five ships",
  "Thirty seconds a shot",
  "Run the clock out and it's a miss",
  "No accounts",
  "Strictly one on one",
];

export function BrutalistLanding({
  callsign,
  stats,
  record,
  live,
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
}: LandingProps) {
  return (
    <div className="v-brutalist min-h-dvh overflow-x-clip pb-24">
      {/* Masthead */}
      <header className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-10 lg:pt-6">
        <div className="brutalist-condensed flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-[3px] border-(--b-ink) pb-2 text-xs sm:text-sm">
          <span>Vol. I · No. {stats ? num.format(stats.matchesAllTime) : "—"}</span>
          <span className="hidden sm:inline">{today}</span>
          <span>Free · No accounts</span>
        </div>
        <div className="brutalist-rule flex items-end justify-between gap-4 pt-3 pb-3">
          <h1 className="brutalist-display text-[clamp(3.5rem,13vw,7.5rem)]">
            Sonar<span className="text-(--b-red)">.</span>
          </h1>
          <p className="brutalist-condensed max-w-[14rem] pb-1 text-right text-sm leading-tight sm:text-base">
            The one-on-one
            <br />
            Battleship gazette
          </p>
        </div>
      </header>

      <main className="mx-auto mt-8 grid max-w-[1440px] gap-6 px-4 sm:px-6 lg:mt-10 lg:grid-cols-12 lg:gap-8 lg:px-10">
        {/* Headline */}
        <section className="lg:col-[1/9] lg:row-[1/3]">
          <p className="brutalist-condensed inline-block -rotate-2 bg-(--b-red) px-3 py-1 text-lg text-(--b-white) sm:text-xl">
            Extra! Extra!
          </p>
          <h2 className="brutalist-display mt-4 text-[clamp(3.6rem,15.5vw,10rem)] leading-[0.92]">
            <span className="block">Five ships.</span>
            <span className="block">
              <span className="my-[0.04em] inline-block bg-(--b-blue) px-[0.08em] pt-[0.06em] leading-[0.86] text-(--b-white)">
                Thirty
              </span>
            </span>
            <span className="block">seconds.</span>
            <span className="block text-(--b-red)">One survivor.</span>
          </h2>
          <div className="mt-6 grid gap-4 border-t-[3px] border-(--b-ink) pt-4 sm:grid-cols-[1fr_1.4fr] sm:gap-8">
            <p className="brutalist-condensed text-base leading-snug">
              Filed by <span className="bg-(--b-yellow) px-1">{callsign}</span>, your callsign for
              today
            </p>
            <p className="text-base leading-snug font-medium sm:text-lg">
              Classic Battleship, head to head. No sign-up and no lobby small talk: you get a random
              callsign, then find a stranger in Quick Match or send a friend a private room link.
              Let the clock hit zero and your shot is gone.
            </p>
          </div>
        </section>

        <div className="contents lg:col-[9/13] lg:row-[1/3] lg:flex lg:flex-col lg:gap-10">
          {/* Press pass */}
          <section
            aria-label="Your callsign"
            className="brutalist-box relative bg-(--b-yellow) p-4 sm:p-5"
          >
            <div className="brutalist-condensed flex items-center justify-between text-sm">
              <span>Press pass</span>
              <span className="border-2 border-(--b-ink) px-1.5">Admit one</span>
            </div>
            <p className="brutalist-display mt-3 text-[clamp(2.4rem,11vw,3.4rem)] break-words">
              {callsign}
            </p>
            <p className="mt-2 text-sm font-semibold">
              Assigned at random. No account, nothing to remember.
            </p>
          </section>

          {/* Box score */}
          <section
            aria-labelledby="brutalist-boxscore"
            className="brutalist-box relative order-1 mt-4 bg-(--b-card) p-4 sm:p-5 lg:order-none"
          >
            <div className="flex items-start justify-between gap-3 border-b-4 border-(--b-ink) pb-2">
              <h3 id="brutalist-boxscore" className="brutalist-display text-4xl">
                Box score
              </h3>
              <div
                className="brutalist-live-stamp brutalist-condensed -mt-7 -mr-2 shrink-0 px-2.5 py-1 text-center"
                aria-label={`Live: ${live.online} online, ${live.inQueue} in queue`}
              >
                <span className="flex items-center justify-center gap-1.5 text-lg leading-none">
                  <span className="brutalist-dot inline-block size-2.5 rounded-full bg-(--b-red)" />
                  Live
                </span>
                <span className="block text-sm leading-tight">
                  {live.online} online
                  <br />
                  {live.inQueue} in queue
                </span>
              </div>
            </div>
            <table className="mt-1 w-full">
              <tbody>
                {(
                  [
                    ["Matches today", stats?.matchesToday],
                    ["Matches all time", stats?.matchesAllTime],
                    ["Ships sunk", stats?.shipsSunk],
                    ["Shots fired", stats?.shotsFired],
                  ] as const
                ).map(([label, value]) => (
                  <tr
                    key={label}
                    className="border-b-2 border-dashed border-(--b-ink)/40 last:border-0"
                  >
                    <th scope="row" className="brutalist-condensed py-2 text-left text-base">
                      {label}
                    </th>
                    <td className="brutalist-mono py-2 text-right text-lg font-bold tabular-nums">
                      {value === undefined ? "—" : num.format(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {/* Quick match */}
        <button
          type="button"
          onClick={onQuickMatch}
          className="brutalist-btn group relative flex min-h-56 flex-col justify-between bg-(--b-yellow) p-5 text-left sm:p-6 lg:col-[1/5] lg:row-[3/4] lg:min-h-80"
        >
          <span className="brutalist-condensed flex items-center justify-between text-sm sm:text-base">
            <span>Strangers welcome</span>
            <span className="bg-(--b-ink) px-2 py-0.5 text-(--b-yellow)">
              {live.inQueue} waiting
            </span>
          </span>
          <span className="brutalist-display block text-[clamp(4rem,19vw,6.5rem)]">
            Quick
            <br />
            match
          </span>
          <span className="flex items-end justify-between gap-4">
            <span className="text-base leading-snug font-semibold">
              Paired with the next captain in the queue. Usually seconds.
            </span>
            <span className="grid size-14 shrink-0 place-items-center border-[3px] border-(--b-ink) bg-(--b-ink) text-(--b-yellow) transition-transform group-hover:translate-x-1">
              <ArrowRight className="size-8" strokeWidth={3} />
            </span>
          </span>
        </button>

        {/* Private room */}
        <section
          aria-labelledby="brutalist-private"
          className="brutalist-box flex flex-col gap-5 bg-(--b-blue) p-5 text-(--b-white) sm:p-6 lg:col-[5/9] lg:row-[3/4]"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 id="brutalist-private" className="brutalist-display text-[clamp(3rem,13vw,4.5rem)]">
              Private
              <br />
              room
            </h3>
            <span className="brutalist-condensed mt-1 rotate-3 bg-(--b-white) px-2 py-0.5 text-sm text-(--b-ink)">
              Friends only
            </span>
          </div>
          <button
            type="button"
            onClick={onCreateRoom}
            className="brutalist-btn brutalist-condensed flex items-center justify-between bg-(--b-white) px-4 py-3 text-xl text-(--b-ink)"
          >
            Create a room
            <Plus className="size-7" strokeWidth={3} />
          </button>
          <div className="brutalist-condensed flex items-center gap-3 text-sm">
            <span className="h-[3px] flex-1 bg-(--b-white)" />
            or join one
            <span className="h-[3px] flex-1 bg-(--b-white)" />
          </div>
          <JoinForm onJoin={onJoinRoom} />
        </section>

        {/* Scorecard */}
        <Scorecard callsign={callsign} record={record} />
      </main>

      {/* Ticker */}
      <div
        className="mt-12 overflow-hidden border-y-4 border-(--b-ink) bg-(--b-red) py-2 text-(--b-white)"
        aria-label="House rules"
      >
        <div className="brutalist-marquee">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="brutalist-display flex shrink-0 items-center text-2xl sm:text-3xl"
            >
              {TICKER.map((item) => (
                <li key={item} className="flex items-center">
                  <span className="px-5">{item}</span>
                  <span className="text-(--b-yellow)">✸</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

function JoinForm({ onJoin }: { onJoin: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const ready = code.length === CODE_LENGTH;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) onJoin(code);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="brutalist-room-code" className="brutalist-condensed text-sm">
        Room code <span className="opacity-75">(6 characters, from your friend's link)</span>
      </label>
      <div className="brutalist-comb-wrap relative flex gap-1.5 sm:gap-2">
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={`brutalist-comb ${focused && i === Math.min(code.length, CODE_LENGTH - 1) && !ready ? "is-active" : ""}`}
          >
            {code[i] ?? ""}
          </span>
        ))}
        <input
          id="brutalist-room-code"
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, CODE_LENGTH),
            )
          }
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={CODE_LENGTH}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="absolute inset-0 cursor-text opacity-0"
        />
      </div>
      <button
        type="submit"
        disabled={!ready}
        className="brutalist-btn brutalist-btn-sm brutalist-condensed flex items-center justify-center gap-2 bg-(--b-red) px-4 py-2.5 text-lg text-(--b-white)"
      >
        Join room
        <ArrowUpRight className="size-6" strokeWidth={3} />
      </button>
    </form>
  );
}

function Scorecard({ callsign, record }: Pick<LandingProps, "callsign" | "record">) {
  const played = record ? record.wins + record.losses : 0;
  return (
    <section
      aria-labelledby="brutalist-scorecard"
      className="brutalist-box order-2 flex flex-col bg-(--b-card) lg:order-none lg:col-[9/13] lg:row-[3/4]"
    >
      <div className="p-4 sm:p-5">
        <div className="brutalist-condensed flex items-center justify-between text-sm">
          <h3 id="brutalist-scorecard">Your scorecard</h3>
          <span>{played} played</span>
        </div>
        <p className="mt-1 truncate text-lg font-extrabold">{callsign}</p>
        <div className="mt-2 flex items-end gap-3">
          <p
            className="brutalist-display text-7xl tabular-nums"
            aria-label={`${record?.wins ?? 0} wins, ${record?.losses ?? 0} losses`}
          >
            <span>{record?.wins ?? 0}</span>
            <span className="px-1 text-(--b-red)">–</span>
            <span>{record?.losses ?? 0}</span>
          </p>
          <p className="brutalist-condensed pb-1 text-sm leading-tight">
            Wins
            <br />
            Losses
          </p>
        </div>
      </div>
      <div className="brutalist-perf mx-0 flex-1 px-4 pt-3 pb-4 sm:px-5">
        <h4 className="brutalist-condensed text-sm">Recent matches</h4>
        {record && record.recent.length > 0 ? (
          <ol className="mt-1">
            {record.recent.map((match) => (
              <li
                key={match.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 border-b-2 border-(--b-ink) py-2 last:border-0"
              >
                <span
                  className={`brutalist-display grid size-9 place-items-center border-[3px] border-(--b-ink) text-xl ${match.won ? "bg-(--b-yellow)" : "bg-(--b-ink) text-(--b-white)"}`}
                  aria-label={match.won ? "Won" : "Lost"}
                >
                  {match.won ? "W" : "L"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-extrabold">vs {match.opponent}</span>
                  <span className="brutalist-condensed block text-xs opacity-80">
                    {END_REASON[match.endReason]} · {match.shotsFired} shots ·{" "}
                    {match.mode === "quick" ? "Quick" : "Private"}
                  </span>
                </span>
                <span className="text-right">
                  <span className="brutalist-mono block font-bold tabular-nums">
                    {duration(match.durationMs)}
                  </span>
                  <span className="brutalist-condensed block text-xs opacity-70">
                    {ago(match.endedAt)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 font-semibold">No matches on the card yet. Go sink somebody.</p>
        )}
      </div>
    </section>
  );
}
