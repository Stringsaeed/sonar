import { BOARD_SIZE, type Coord } from "@sonar/game";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { inBounds, type Held } from "./fleet";

/** How far the pointer must travel before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD_PX = 6;

export interface DragState {
  readonly held: Held;
  readonly x: number;
  readonly y: number;
  /** The board cell under the pointer, if it's over the board. */
  readonly cell: Coord | undefined;
  readonly cellSize: number;
}

interface Press {
  readonly held: Held;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  dragging: boolean;
}

/**
 * Mouse and pen drag-and-drop for ships, on plain pointer events. Touch is left alone so the
 * page still scrolls; phones use tap-to-select, tap-to-place instead.
 */
export function useShipDrag({
  gridRef,
  onLift,
  onDrop,
}: {
  gridRef: RefObject<HTMLElement | null>;
  onLift: (held: Held) => void;
  onDrop: (cell: Coord | undefined) => void;
}) {
  const [drag, setDrag] = useState<DragState>();
  const press = useRef<Press | undefined>(undefined);
  // A drag that ends over a button still fires a click on it; that click isn't a placement.
  const swallowClick = useRef(false);

  const measure = (x: number, y: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return { cell: undefined, cellSize: 0 };
    const cellSize = rect.width / BOARD_SIZE;
    const cell = {
      x: Math.floor((x - rect.left) / cellSize),
      y: Math.floor((y - rect.top) / cellSize),
    };
    return { cell: inBounds(cell) ? cell : undefined, cellSize };
  };

  const finish = (dropAt: Coord | undefined, drop: boolean) => {
    const current = press.current;
    press.current = undefined;
    if (!current?.dragging) return;
    swallowClick.current = true;
    setTimeout(() => (swallowClick.current = false));
    setDrag(undefined);
    if (drop) onDrop(dropAt);
  };

  const onMove = useEffectEvent((event: PointerEvent) => {
    const current = press.current;
    if (!current || event.pointerId !== current.pointerId) return;
    if (!current.dragging) {
      const travel = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
      if (travel < DRAG_THRESHOLD_PX) return;
      current.dragging = true;
      onLift(current.held);
    }
    setDrag({
      held: current.held,
      x: event.clientX,
      y: event.clientY,
      ...measure(event.clientX, event.clientY),
    });
  });

  const onUp = useEffectEvent((event: PointerEvent) => {
    if (event.pointerId !== press.current?.pointerId) return;
    finish(measure(event.clientX, event.clientY).cell, true);
  });

  const onCancel = useEffectEvent(() => finish(undefined, true));

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") finish(undefined, false);
  });

  useEffect(() => {
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  /** Call from a ship's onPointerDown. Ignores touch and non-primary buttons. */
  const startPress = (event: ReactPointerEvent, held: Held) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    press.current = {
      held,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
  };

  return {
    drag,
    startPress,
    /** True right after a drag ended, so the click it produced can be ignored. */
    shouldSwallowClick: () => swallowClick.current,
  };
}
