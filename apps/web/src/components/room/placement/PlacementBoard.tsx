import {
  BOARD_SIZE,
  coordKey,
  placementCells,
  sameCoord,
  SHIP_LENGTH,
  shipAt,
  type Coord,
} from "@sonar/game";
import { motion } from "motion/react";
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import {
  cellName,
  CELLS,
  COLUMNS,
  grab,
  heldAt,
  inBounds,
  placementProblem,
  ROWS,
  type Held,
} from "./fleet";
import { ShipCapsule, type CapsuleTone } from "./ShipCapsule";
import type { DragState } from "./useShipDrag";
import type { InputVia, PlacementEditor } from "./usePlacementEditor";
import "./placement.css";

const STEPS: Record<string, Coord> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const clamp = (n: number) => Math.min(BOARD_SIZE - 1, Math.max(0, n));

/** The grid area covering `cells`, so a ship is one grid item spanning its run of cells. */
const areaOf = (cells: ReadonlyArray<Coord>) => {
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  return {
    gridColumn: `${Math.min(...xs) + 1} / ${Math.max(...xs) + 2}`,
    gridRow: `${Math.min(...ys) + 1} / ${Math.max(...ys) + 2}`,
  };
};

const pointerVia = (pointerType: string): InputVia =>
  pointerType === "touch" ? "touch" : pointerType === "pen" ? "pen" : "mouse";

export function PlacementBoard({
  editor,
  drag,
  gridRef,
  locked,
  onGrab,
  shouldSwallowClick,
  children,
}: {
  editor: PlacementEditor;
  drag: DragState | undefined;
  gridRef: RefObject<HTMLDivElement | null>;
  locked: boolean;
  onGrab: (event: PointerEvent, held: Held) => void;
  shouldSwallowClick: () => boolean;
  /** Overlay drawn over the board, e.g. the locked-in notice. */
  children?: ReactNode;
}) {
  const helpId = useId();
  const { fleet, held, orientation, anchor } = editor;
  const [cursor, setCursor] = useState<Coord>({ x: 0, y: 0 });
  const cells = useRef<Array<HTMLButtonElement | null>>([]);
  const lastInput = useRef<InputVia>("mouse");

  // While dragging the preview follows the pointer; otherwise it sits on the hovered or
  // keyboard-focused cell. Resting on a different ship means a click picks that ship up, so
  // highlight it instead of drawing a footprint that a click wouldn't place.
  const target = drag ? drag.cell : anchor;
  const occupant = target && shipAt(fleet, target);
  const grabbable = !drag && occupant && occupant.kind !== held?.kind ? occupant : undefined;
  const preview = held && target && !grabbable ? heldAt(held, orientation, target) : undefined;
  const previewCells = preview ? placementCells(preview).filter(inBounds) : [];
  const legal = preview !== undefined && placementProblem(fleet, preview) === undefined;
  const focus = target ?? cursor;

  const moveCursor = (next: Coord) => {
    setCursor(next);
    editor.setAnchor(next);
    cells.current[coordKey(next)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    lastInput.current = "keyboard";
    const step = STEPS[event.key];
    let next: Coord | undefined;
    if (step) next = { x: clamp(cursor.x + step.x), y: clamp(cursor.y + step.y) };
    else if (event.key === "Home") next = { x: 0, y: cursor.y };
    else if (event.key === "End") next = { x: BOARD_SIZE - 1, y: cursor.y };
    if (!next) return;
    event.preventDefault();
    moveCursor(next);
  };

  const toneOf = (kind: string): CapsuleTone =>
    locked ? "ship" : held?.kind === kind ? "lifted" : grabbable?.kind === kind ? "hover" : "ship";

  return (
    <div
      className={cn(
        "relative rounded-[22px] border-[3px] bg-linear-160 from-sonar-cyan-deep to-[#061430] p-1.5 sm:rounded-[26px] sm:p-2.5",
        "shadow-[0_0_0_5px_rgb(3_13_34/0.9),0_0_50px_rgb(57_255_136/0.18),inset_0_0_30px_rgb(0_0_0/0.6)]",
        locked ? "border-sonar-cyan/40" : "border-sonar-green/35",
      )}
    >
      <div className="grid grid-cols-[1.1rem_1fr] grid-rows-[1.1rem_1fr] gap-0.5 sm:grid-cols-[1.6rem_1fr] sm:grid-rows-[1.6rem_1fr] sm:gap-1">
        <span aria-hidden="true" />
        <div className="grid grid-cols-10" aria-hidden="true">
          {COLUMNS.map((column, x) => (
            <span
              key={column}
              className={cn(
                "grid place-items-center font-display text-[0.62rem] sm:text-sm",
                x === focus.x ? "text-sonar-green" : "text-sonar-green/45",
              )}
            >
              {column}
            </span>
          ))}
        </div>
        <div className="grid grid-rows-10" aria-hidden="true">
          {ROWS.map((row, y) => (
            <span
              key={row}
              className={cn(
                "grid place-items-center font-display text-[0.62rem] sm:text-sm",
                y === focus.y ? "text-sonar-green" : "text-sonar-green/45",
              )}
            >
              {row}
            </span>
          ))}
        </div>

        <div
          ref={gridRef}
          role="group"
          aria-label="Your waters"
          aria-describedby={helpId}
          className="placement-grid relative grid aspect-square touch-manipulation grid-cols-10 grid-rows-10 overflow-hidden rounded-[10px] select-none"
          onKeyDown={onKeyDown}
          onPointerLeave={(event) => {
            if (event.pointerType !== "touch") editor.setAnchor(undefined);
          }}
          onBlur={(event) => {
            // Keyboard previews end when focus leaves the board; a tap elsewhere (say, on
            // Rotate) must keep a touch preview alive.
            const leaving = !event.currentTarget.contains(event.relatedTarget as Node | null);
            if (leaving && lastInput.current === "keyboard") editor.setAnchor(undefined);
          }}
        >
          <p id={helpId} className="sr-only">
            Arrow keys move. Enter or Space places the selected ship, or picks up the ship under the
            cursor. R rotates, 1 to 5 select ships, Escape cancels.
          </p>
          <span
            className="placement-rings pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
          <span className="placement-sweep pointer-events-none absolute z-[3]" aria-hidden="true" />

          {fleet.map((ship) => (
            <motion.span
              key={ship.kind}
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="pointer-events-none relative z-[2] p-[2px] sm:p-[3px]"
              style={areaOf(placementCells(ship))}
            >
              <ShipCapsule
                length={SHIP_LENGTH[ship.kind]}
                orientation={ship.orientation}
                tone={toneOf(ship.kind)}
              />
            </motion.span>
          ))}

          {preview && previewCells.length > 0 && (
            <span
              className="pointer-events-none relative z-[3] p-[2px] sm:p-[3px]"
              style={areaOf(previewCells)}
            >
              <ShipCapsule
                length={previewCells.length}
                orientation={preview.orientation}
                tone={legal ? "legal" : "illegal"}
              />
            </span>
          )}

          {CELLS.map((cell) => {
            const ship = shipAt(fleet, cell);
            const canGrab = !locked && ship !== undefined && ship.kind !== held?.kind;
            return (
              <button
                key={coordKey(cell)}
                ref={(el) => {
                  cells.current[coordKey(cell)] = el;
                }}
                type="button"
                style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
                tabIndex={sameCoord(cell, cursor) ? 0 : -1}
                aria-label={`${cellName(cell)}, ${ship?.kind ?? "empty"}`}
                aria-disabled={locked || undefined}
                className={cn(
                  "relative z-[4] outline-none",
                  "focus-visible:z-[6] focus-visible:bg-white/10 focus-visible:shadow-[inset_0_0_0_3px_#fff,0_0_18px_rgb(57_255_136/0.8)]",
                  locked
                    ? "cursor-default"
                    : canGrab
                      ? "cursor-grab"
                      : held
                        ? "cursor-crosshair"
                        : "cursor-default",
                  drag && "cursor-grabbing",
                )}
                onPointerDown={(event) => {
                  lastInput.current = pointerVia(event.pointerType);
                  if (!locked && ship) onGrab(event, grab(ship, cell));
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") editor.setAnchor(cell);
                }}
                onFocus={(event) => {
                  setCursor(cell);
                  if (event.currentTarget.matches(":focus-visible")) editor.setAnchor(cell);
                }}
                onClick={(event) => {
                  if (shouldSwallowClick()) return;
                  setCursor(cell);
                  editor.activate(cell, event.detail === 0 ? "keyboard" : lastInput.current);
                }}
              />
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
