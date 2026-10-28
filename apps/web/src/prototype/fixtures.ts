// PROTOTYPE — throwaway. Fake data + a fake playable battle so the UI variants can be judged
// against realistic density. Nothing here is the real game engine.
import { BOARD_SIZE, FLEET, type GlobalStats, type PlayerRecord, type ShipKind } from "@sonar/game";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export interface Ship {
  readonly kind: ShipKind;
  readonly cells: ReadonlyArray<Cell>;
}

export interface Shot extends Cell {
  readonly result: "hit" | "miss";
  readonly sunk?: ShipKind;
}

export interface LogEntry extends Shot {
  readonly by: "me" | "enemy";
  readonly at: number;
}

export interface BattleView {
  readonly me: { readonly callsign: string; readonly fleet: ReadonlyArray<Ship> };
  readonly enemy: { readonly callsign: string };
  /** Shots the enemy fired at my board. */
  readonly incoming: ReadonlyArray<Shot>;
  /** Shots I fired at the enemy board. */
  readonly outgoing: ReadonlyArray<Shot>;
  /** Enemy ships I have sunk, with their cells revealed. */
  readonly enemySunk: ReadonlyArray<Ship>;
  /** My ships the enemy has sunk. */
  readonly mySunk: ReadonlyArray<ShipKind>;
  readonly turn: "me" | "enemy";
  /** Epoch ms when the current turn auto-misses. */
  readonly deadline: number;
  readonly turnSeconds: number;
  readonly log: ReadonlyArray<LogEntry>;
  readonly winner: "me" | "enemy" | undefined;
}

export interface BattleProps {
  readonly view: BattleView;
  readonly fire: (cell: Cell) => void;
  readonly forfeit: () => void;
  readonly rematch: () => void;
}

export interface LandingProps {
  readonly callsign: string;
  readonly stats: GlobalStats | undefined;
  readonly record: PlayerRecord | undefined;
  readonly live: { readonly online: number; readonly inQueue: number };
  readonly onQuickMatch: () => void;
  readonly onCreateRoom: () => void;
  readonly onJoinRoom: (code: string) => void;
}

export const SHIP_LENGTH: Record<ShipKind, number> = Object.fromEntries(
  FLEET.map((ship) => [ship.kind, ship.length]),
) as Record<ShipKind, number>;

export const FAKE_STATS: GlobalStats = {
  matchesToday: 128,
  matchesAllTime: 48_213,
  shipsSunk: 211_904,
  shotsFired: 2_904_771,
};

export const FAKE_RECORD: PlayerRecord = {
  wins: 14,
  losses: 9,
  recent: [
    {
      id: "a",
      mode: "quick",
      opponent: "Rogue Narwhal",
      won: true,
      endReason: "sunk",
      endedAt: Date.now() - 3_600_000,
      durationMs: 412_000,
      shotsFired: 47,
    },
    {
      id: "b",
      mode: "private",
      opponent: "Salty Anchor",
      won: false,
      endReason: "sunk",
      endedAt: Date.now() - 86_400_000,
      durationMs: 538_000,
      shotsFired: 61,
    },
    {
      id: "c",
      mode: "quick",
      opponent: "Ghost Marlin",
      won: true,
      endReason: "forfeit",
      endedAt: Date.now() - 172_800_000,
      durationMs: 121_000,
      shotsFired: 18,
    },
  ],
};

export const FAKE_LIVE = { online: 37, inQueue: 3 };

const horizontal = (kind: ShipKind, x: number, y: number): Ship => ({
  kind,
  cells: Array.from({ length: SHIP_LENGTH[kind] }, (_, i) => ({ x: x + i, y })),
});
const vertical = (kind: ShipKind, x: number, y: number): Ship => ({
  kind,
  cells: Array.from({ length: SHIP_LENGTH[kind] }, (_, i) => ({ x, y: y + i })),
});

const MY_FLEET: ReadonlyArray<Ship> = [
  horizontal("carrier", 1, 1),
  vertical("battleship", 8, 2),
  horizontal("cruiser", 2, 5),
  vertical("submarine", 0, 6),
  horizontal("destroyer", 5, 8),
];

const ENEMY_FLEET: ReadonlyArray<Ship> = [
  vertical("carrier", 6, 0),
  horizontal("battleship", 1, 3),
  vertical("cruiser", 3, 6),
  horizontal("submarine", 6, 9),
  horizontal("destroyer", 8, 6),
];

const same = (a: Cell) => (b: Cell) => a.x === b.x && a.y === b.y;

const resolve = (fleet: ReadonlyArray<Ship>, prior: ReadonlyArray<Shot>, cell: Cell): Shot => {
  const ship = fleet.find((s) => s.cells.some(same(cell)));
  if (!ship) return { ...cell, result: "miss" };
  const hits = [...prior.filter((s) => s.result === "hit"), cell];
  const sunk = ship.cells.every((c) => hits.some(same(c)));
  return sunk ? { ...cell, result: "hit", sunk: ship.kind } : { ...cell, result: "hit" };
};

const replay = (fleet: ReadonlyArray<Ship>, cells: ReadonlyArray<Cell>) =>
  cells.reduce<Shot[]>((shots, cell) => [...shots, resolve(fleet, shots, cell)], []);

const OPENING_OUTGOING = replay(ENEMY_FLEET, [
  { x: 4, y: 4 },
  { x: 6, y: 1 },
  { x: 6, y: 2 },
  { x: 0, y: 0 },
  { x: 8, y: 6 },
  { x: 9, y: 6 },
  { x: 2, y: 8 },
  { x: 5, y: 5 },
  { x: 1, y: 3 },
  { x: 9, y: 9 },
]);
const OPENING_INCOMING = replay(MY_FLEET, [
  { x: 3, y: 3 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 7, y: 7 },
  { x: 5, y: 8 },
  { x: 6, y: 8 },
  { x: 9, y: 0 },
  { x: 0, y: 9 },
]);

const TURN_SECONDS = 30;

const shipsSunkBy = (shots: ReadonlyArray<Shot>) => shots.flatMap((s) => (s.sunk ? [s.sunk] : []));

const randomUntried = (tried: ReadonlyArray<Cell>): Cell => {
  const open: Cell[] = [];
  for (let y = 0; y < BOARD_SIZE; y++)
    for (let x = 0; x < BOARD_SIZE; x++) if (!tried.some(same({ x, y }))) open.push({ x, y });
  return open[Math.floor(Math.random() * open.length)]!;
};

const initial = (): BattleView => {
  const now = Date.now();
  return {
    me: { callsign: "Silent Kraken", fleet: MY_FLEET },
    enemy: { callsign: "Brave Barnacle" },
    incoming: OPENING_INCOMING,
    outgoing: OPENING_OUTGOING,
    enemySunk: ENEMY_FLEET.filter((s) => shipsSunkBy(OPENING_OUTGOING).includes(s.kind)),
    mySunk: shipsSunkBy(OPENING_INCOMING),
    turn: "me",
    deadline: now + TURN_SECONDS * 1000,
    turnSeconds: TURN_SECONDS,
    log: [
      ...OPENING_OUTGOING.map((s, i) => ({
        ...s,
        by: "me" as const,
        at: now - (20 - i * 2) * 1000,
      })),
      ...OPENING_INCOMING.map((s, i) => ({
        ...s,
        by: "enemy" as const,
        at: now - (19 - i * 2) * 1000,
      })),
    ].sort((a, b) => a.at - b.at),
    winner: undefined,
  };
};

const apply = (view: BattleView, by: "me" | "enemy", cell: Cell): BattleView => {
  const now = Date.now();
  if (by === "me") {
    const shot = resolve(ENEMY_FLEET, view.outgoing, cell);
    const outgoing = [...view.outgoing, shot];
    const enemySunk = shot.sunk
      ? [...view.enemySunk, ENEMY_FLEET.find((s) => s.kind === shot.sunk)!]
      : view.enemySunk;
    return {
      ...view,
      outgoing,
      enemySunk,
      turn: "enemy",
      deadline: now + TURN_SECONDS * 1000,
      log: [...view.log, { ...shot, by, at: now }],
      winner: enemySunk.length === FLEET.length ? "me" : undefined,
    };
  }
  const shot = resolve(MY_FLEET, view.incoming, cell);
  const mySunk = shot.sunk ? [...view.mySunk, shot.sunk] : view.mySunk;
  return {
    ...view,
    incoming: [...view.incoming, shot],
    mySunk,
    turn: "me",
    deadline: now + TURN_SECONDS * 1000,
    log: [...view.log, { ...shot, by, at: now }],
    winner: mySunk.length === FLEET.length ? "enemy" : undefined,
  };
};

/** A fake opponent that fires back ~1s after you, plus a live turn clock with auto-miss. */
export const useFakeBattle = (): BattleProps => {
  const [view, setView] = useState(initial);
  const viewRef = useRef(view);
  viewRef.current = view;

  const fire = useCallback((cell: Cell) => {
    const current = viewRef.current;
    if (current.winner || current.turn !== "me" || current.outgoing.some(same(cell))) return;
    setView(apply(current, "me", cell));
  }, []);

  useEffect(() => {
    if (view.winner) return;
    if (view.turn === "enemy") {
      const timer = setTimeout(
        () => setView((v) => apply(v, "enemy", randomUntried(v.incoming))),
        900 + Math.random() * 700,
      );
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(
      () => setView((v) => apply(v, "me", randomUntried(v.outgoing))),
      Math.max(0, view.deadline - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [view.turn, view.deadline, view.winner]);

  return {
    view,
    fire,
    forfeit: () => setView((v) => ({ ...v, winner: "enemy" })),
    rematch: () => setView(initial()),
  };
};

/** Seconds left on the current turn, ticking. */
export const useCountdown = (deadline: number) => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, Math.ceil((deadline - now) / 1000));
};

export const COLUMN_LABELS = "ABCDEFGHIJ".split("");
export const cellLabel = ({ x, y }: Cell) => `${COLUMN_LABELS[x]}${y + 1}`;
export const shotAt = (shots: ReadonlyArray<Shot>, cell: Cell) => shots.find(same(cell));
export const shipAt = (fleet: ReadonlyArray<Ship>, cell: Cell) =>
  fleet.find((s) => s.cells.some(same(cell)));
