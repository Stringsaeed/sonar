import { useAtomValue } from "@effect/atom-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AsyncResult } from "effect/reactivity";
import { Crosshair } from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "@/components/AppHeader";
import { PilotCard } from "@/components/landing/PilotCard";
import { PrivateRoomPanel } from "@/components/landing/PrivateRoomPanel";
import { RadarScope } from "@/components/landing/RadarScope";
import { StatReadout } from "@/components/landing/StatReadout";
import { Button } from "@/components/ui/button";
import { globalStatsAtom, myRecordAtom } from "@/lib/api";
import { loadIdentity } from "@/lib/identity";
import { randomRoomCode } from "@/lib/room-code";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const navigate = useNavigate();
  const { callsign } = loadIdentity();
  const stats = AsyncResult.getOrElse(useAtomValue(globalStatsAtom), () => undefined);
  const record = AsyncResult.getOrElse(useAtomValue(myRecordAtom), () => undefined);

  return (
    <div className="relative mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6 md:pt-6">
      <AppHeader />

      <main>
        {/* Readouts flank the scope on desktop and sit above/below it on phones. */}
        <section
          aria-label="Fleet activity"
          className="mt-6 grid grid-cols-2 items-center gap-3 md:mt-8 md:grid-cols-[1fr_minmax(0,560px)_1fr] md:gap-8"
        >
          <div className="col-span-2 grid grid-cols-2 gap-3 md:col-span-1 md:grid-cols-1 md:gap-10">
            <StatReadout side="left" label="Matches today" value={stats?.matchesToday} />
            <StatReadout side="left" label="All-time matches" value={stats?.matchesAllTime} />
          </div>

          <div className="col-span-2 flex flex-col items-center md:col-span-1">
            <motion.div
              className="w-full px-3 md:px-0"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 140, damping: 18 }}
            >
              <RadarScope callsign={callsign} />
            </motion.div>

            <motion.div
              className="relative z-10 -mt-12 w-[min(100%,26rem)] sm:-mt-14"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 16 }}
            >
              <Button
                size="xl"
                className="quick-match-pulse w-full flex-col gap-0"
                onClick={() => void navigate({ to: "/play" })}
              >
                <span className="flex items-center gap-3 leading-none">
                  <Crosshair className="size-7 sm:size-9" strokeWidth={3} aria-hidden="true" />
                  Quick match
                </span>
                <span className="mt-1 font-mono text-[0.65rem] font-extrabold tracking-[0.18em] text-[#03230f]/75 sm:text-xs">
                  PAIRED WITH THE NEXT PILOT IN LINE
                </span>
              </Button>
            </motion.div>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-3 md:col-span-1 md:grid-cols-1 md:gap-10">
            <StatReadout side="right" label="Ships sunk" value={stats?.shipsSunk} />
            <StatReadout side="right" label="Shots fired" value={stats?.shotsFired} />
          </div>
        </section>

        <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-[1.3fr_1fr]">
          <PilotCard callsign={callsign} record={record} />
          <PrivateRoomPanel
            onCreateRoom={() =>
              void navigate({ to: "/r/$code", params: { code: randomRoomCode() } })
            }
            onJoinRoom={(code) => void navigate({ to: "/r/$code", params: { code } })}
          />
        </div>
      </main>
    </div>
  );
}
