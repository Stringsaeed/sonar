import { useEffect, useRef } from "react";
import { playCue, vibrate } from "@/lib/sound";
import type { Arrival } from "./useArrivals";

const TICK_FROM_SECONDS = 5;

/** The battle's soundtrack: every live shot, my turn starting, the last seconds, and the result. */
export function useBattleSounds({
  latest,
  turn,
  secondsLeft,
  won,
}: {
  latest: Arrival | undefined;
  turn: "mine" | "theirs" | "over";
  secondsLeft: number | undefined;
  won: boolean | undefined;
}) {
  useEffect(() => {
    if (!latest) return;
    const { shot } = latest;
    if (shot.sunk) {
      playCue("sink");
      vibrate([80, 50, 220]);
    } else if (shot.result === "hit") {
      playCue("explosion");
      vibrate(60);
    } else {
      playCue("splash");
    }
  }, [latest?.id]);

  const previousTurn = useRef(turn);
  useEffect(() => {
    const was = previousTurn.current;
    previousTurn.current = turn;
    if (turn === "mine") playCue("your-turn");
    // Only a game that ends while watching gets a stinger, not a result reloaded later.
    if (turn === "over" && was !== "over" && won !== undefined) {
      playCue(won ? "victory" : "defeat");
    }
  }, [turn]);

  useEffect(() => {
    if (turn === "mine" && secondsLeft !== undefined && secondsLeft > 0) {
      if (secondsLeft <= TICK_FROM_SECONDS) playCue("clock-tick");
    }
  }, [secondsLeft]);
}
