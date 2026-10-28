import {
  FLEET,
  isCompleteFleet,
  placementCells,
  randomFleet,
  SHIP_LENGTH,
  shipAt,
  type Coord,
  type Fleet,
  type Orientation,
  type Placement,
  type ShipKind,
} from "@sonar/game";
import { Effect } from "effect";
import { useEffect, useEffectEvent, useState } from "react";
import { playCue } from "@/lib/sound";
import {
  cellName,
  grab,
  heldAt,
  nextUnplaced,
  placementOf,
  placementProblem,
  shipName,
  withShip,
  type Held,
} from "./fleet";

export type InputVia = "mouse" | "pen" | "touch" | "keyboard";

/** The latest thing worth telling the player. `n` changes every time, so repeats still announce. */
export interface Notice {
  readonly text: string;
  readonly tone: "info" | "error";
  readonly n: number;
}

const span = (placement: Placement) => {
  const cells = placementCells(placement);
  return `${cellName(cells[0]!)} to ${cellName(cells.at(-1)!)}`;
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Local placement state: the fleet as drafted, the ship in hand, its orientation and where the
 * footprint preview sits. Every edit keeps the fleet legal, so whatever is drafted is valid.
 */
export function usePlacementEditor(initial: Fleet, locked: boolean) {
  const [fleet, setFleet] = useState(initial);
  const [held, setHeld] = useState<Held | undefined>(() => {
    const kind = nextUnplaced(initial);
    return kind ? { kind, offset: 0 } : undefined;
  });
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [anchor, setAnchor] = useState<Coord>();
  const [notice, setNotice] = useState<Notice>({ text: "", tone: "info", n: 0 });

  const tell = (text: string, tone: Notice["tone"] = "info") =>
    setNotice((last) => ({ text, tone, n: last.n + 1 }));

  const hand = locked ? undefined : held;

  const lift = (next: Held) => {
    const placed = placementOf(fleet, next.kind);
    setHeld(next);
    if (placed) setOrientation(placed.orientation);
    return placed;
  };

  const select = (kind: ShipKind) => {
    if (locked) return;
    if (hand?.kind === kind) {
      setHeld(undefined);
      tell(`${shipName(kind)} put down.`);
      return;
    }
    const placed = lift({ kind, offset: 0 });
    tell(
      placed
        ? `${shipName(kind)} selected, currently ${span(placed)}. Choose a new spot.`
        : `${shipName(kind)} selected, ${SHIP_LENGTH[kind]} cells, ${orientation}.`,
    );
  };

  /** Puts the ship in hand down with `cell` under the held part. Returns whether it fit. */
  const drop = (cell: Coord) => {
    if (!hand) return false;
    const placement = heldAt(hand, orientation, cell);
    const problem = placementProblem(fleet, placement);
    if (problem) {
      tell(`${shipName(hand.kind)} can't go at ${cellName(cell)}: ${problem}.`, "error");
      return false;
    }
    const next = withShip(fleet, placement);
    const following = nextUnplaced(next);
    playCue("ui-place");
    setFleet(next);
    setHeld(following ? { kind: following, offset: 0 } : undefined);
    tell(
      `${shipName(hand.kind)} placed, ${span(placement)}.` +
        (following
          ? ` Next up: ${following}.`
          : isCompleteFleet(next)
            ? " Fleet complete. Ready when you are."
            : ""),
    );
    return true;
  };

  /** A click, tap or Enter on a cell: pick up the ship there, or put the held ship down. */
  const activate = (cell: Coord, via: InputVia) => {
    if (locked) return;
    const occupant = shipAt(fleet, cell);
    if (occupant && occupant.kind !== hand?.kind) {
      lift(grab(occupant, cell));
      playCue("ui-place");
      setAnchor(cell);
      tell(`Picked up your ${occupant.kind}. Choose where it goes.`);
      return;
    }
    if (!hand) {
      tell(nextUnplaced(fleet) ? "Pick a ship from the tray first." : "Every ship is placed.");
      return;
    }
    // Touch has no hover, so a lingering preview after a tap would just be noise.
    if (drop(cell) && via === "touch") setAnchor(undefined);
  };

  const endDrag = (cell: Coord | undefined) => {
    if (!hand) return;
    if (cell && drop(cell)) return;
    const placed = placementOf(fleet, hand.kind);
    if (placed) {
      setHeld(undefined);
      if (!cell) tell(`${shipName(hand.kind)} stays at ${span(placed)}.`);
    }
  };

  const rotate = () => {
    if (!hand) return;
    const next = orientation === "horizontal" ? "vertical" : "horizontal";
    setOrientation(next);
    playCue("ui-rotate");
    tell(`${shipName(hand.kind)} ${next}.`);
  };

  const cancel = () => {
    if (!hand) return;
    setHeld(undefined);
    tell("Cancelled.");
  };

  const randomize = () => {
    if (locked) return;
    setFleet(Effect.runSync(randomFleet));
    playCue("ui-randomize");
    setHeld(undefined);
    tell("Fleet placed at random. Ready when you are.");
  };

  const clear = () => {
    if (locked) return;
    const first = FLEET[0].kind;
    setFleet([]);
    setHeld({ kind: first, offset: 0 });
    tell(`Board cleared. ${shipName(first)} selected.`);
  };

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (locked || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTyping(event.target)) return;
    const ship = FLEET[Number(event.key) - 1];
    if (event.key === "r" || event.key === "R") rotate();
    // Unlike a tray click, a number key never puts the ship back down.
    else if (ship && /^[1-9]$/.test(event.key)) {
      if (hand?.kind !== ship.kind) select(ship.kind);
    } else if (event.key === "Escape") cancel();
    else return;
    event.preventDefault();
  });

  useEffect(() => {
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  return {
    fleet,
    held: hand,
    orientation,
    anchor,
    notice,
    setAnchor,
    lift,
    select,
    activate,
    endDrag,
    rotate,
    cancel,
    randomize,
    clear,
  };
}

export type PlacementEditor = ReturnType<typeof usePlacementEditor>;
