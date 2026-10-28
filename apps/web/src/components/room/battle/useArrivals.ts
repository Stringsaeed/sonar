import type { Shot } from "@sonar/game";
import { useState } from "react";
import { shotLog, type LogEntry } from "./model";

export interface Arrival extends LogEntry {
  /** Unique per arrival, so effects keyed on it replay even when two shots look alike. */
  readonly id: number;
}

interface Tracker {
  readonly incoming: number;
  readonly outgoing: number;
  readonly nextId: number;
  /** My most recent shot to land while mounted. */
  readonly mine: Arrival | undefined;
  /** Their most recent shot to land while mounted. */
  readonly theirs: Arrival | undefined;
  /** The most recent shot of either side. */
  readonly latest: Arrival | undefined;
  /** The most recent shot that sank a ship. */
  readonly sink: Arrival | undefined;
}

/**
 * Shots that land while the screen is mounted. Whatever was already in the view on mount (the
 * backlog after a reconnect) is treated as history: no pings, stamps or announcements for it.
 */
export function useArrivals(incoming: ReadonlyArray<Shot>, outgoing: ReadonlyArray<Shot>) {
  const [tracker, setTracker] = useState<Tracker>(() => ({
    incoming: incoming.length,
    outgoing: outgoing.length,
    nextId: 0,
    mine: undefined,
    theirs: undefined,
    latest: undefined,
    sink: undefined,
  }));

  // Adjusting state while rendering (rather than in an effect) means the ping, stamp and
  // announcement land in the same frame as the shot itself.
  if (tracker.incoming !== incoming.length || tracker.outgoing !== outgoing.length) {
    const fresh = shotLog(incoming.slice(tracker.incoming), outgoing.slice(tracker.outgoing)).map(
      (entry, i): Arrival => ({ ...entry, id: tracker.nextId + i }),
    );
    const next: Tracker = {
      incoming: incoming.length,
      outgoing: outgoing.length,
      nextId: tracker.nextId + fresh.length,
      mine: fresh.findLast((arrival) => arrival.mine) ?? tracker.mine,
      theirs: fresh.findLast((arrival) => !arrival.mine) ?? tracker.theirs,
      latest: fresh.at(-1) ?? tracker.latest,
      sink: fresh.findLast((arrival) => arrival.shot.sunk !== undefined) ?? tracker.sink,
    };
    setTracker(next);
    return next;
  }
  return tracker;
}
