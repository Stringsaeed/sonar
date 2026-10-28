import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { shipName } from "./model";
import type { Arrival } from "./useArrivals";

const SHOWN_FOR_MS = 2200;

/**
 * The big "<SHIP> SUNK!" stamp over the radar. Purely visual: the live region already
 * announces the sink, so this stays out of the accessibility tree.
 */
export function SinkStamp({ sink }: { sink: Arrival | undefined }) {
  const [dismissed, setDismissed] = useState<number>();

  useEffect(() => {
    if (!sink) return;
    const id = setTimeout(() => setDismissed(sink.id), SHOWN_FOR_MS);
    return () => clearTimeout(id);
  }, [sink]);

  const shown = sink && sink.id !== dismissed ? sink : undefined;

  return (
    <AnimatePresence>
      {shown?.shot.sunk && (
        <motion.div
          key={shown.id}
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden="true"
        >
          <motion.div
            className={cn(
              "rounded-3xl border-4 px-6 py-4 text-center font-display shadow-2xl",
              shown.mine
                ? "border-sonar-coral bg-sonar-coral-deep/90"
                : "border-sonar-amber bg-[#2a1d07]/90",
            )}
            initial={{ scale: 0.3, rotate: -8 }}
            animate={{ scale: 1, rotate: -3 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 14 }}
          >
            <div className="text-xs tracking-[0.3em] text-white/70">
              {shown.mine ? "Direct hit" : "Mayday"}
            </div>
            <div
              className={cn(
                "text-4xl sm:text-6xl",
                shown.mine
                  ? "glow-coral"
                  : "text-sonar-amber [text-shadow:0_0_18px_rgb(255_201_74/0.5)]",
              )}
            >
              {shipName(shown.shot.sunk)} SUNK!
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
