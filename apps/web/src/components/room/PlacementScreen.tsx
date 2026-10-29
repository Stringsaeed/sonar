import { FLEET, isCompleteFleet, SHIP_LENGTH, type Fleet } from "@sonar/game";
import { Anchor, Eraser, Loader2, Lock, RotateCw, Shuffle } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { playCue } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { OpponentStatus } from "./OpponentStatus";
import { DeploymentStatus } from "./placement/DeploymentStatus";
import { placementOf, shipName } from "./placement/fleet";
import { PlacementBoard } from "./placement/PlacementBoard";
import { ShipSprite } from "./ShipSprite";
import { ShipTray } from "./placement/ShipTray";
import { usePlacementEditor, type PlacementEditor } from "./placement/usePlacementEditor";
import { useShipDrag, type DragState } from "./placement/useShipDrag";
import type { PhaseScreenProps } from "./types";

const DRAFT_DEBOUNCE_MS = 300;
const REFUSAL_VISIBLE_MS = 6000;
const REFUSED = "The server refused that fleet. Check your ships and try again.";

/** One line under the board: a fresh error if there is one, otherwise what to do next. */
const hintFor = (editor: PlacementEditor, locked: boolean) => {
  if (editor.notice.tone === "error") return editor.notice.text;
  if (locked) return "Fleet locked in. No more changes this round.";
  const { held, fleet, orientation } = editor;
  if (held) {
    if (placementOf(fleet, held.kind)) {
      return `Moving your ${held.kind}. Pick its new spot.`;
    }
    const end = orientation === "horizontal" ? "left" : "top";
    return `Place your ${held.kind} (${SHIP_LENGTH[held.kind]}). Pick the cell for its ${end} end.`;
  }
  if (isCompleteFleet(fleet)) return "All ships deployed. Pick one up to move it, or lock in.";
  return "Pick a ship from your fleet.";
};

/** The ship following the pointer while it's dragged off the board. Over the board, the preview takes over. */
function DragGhost({ drag, editor }: { drag: DragState; editor: PlacementEditor }) {
  const length = SHIP_LENGTH[drag.held.kind];
  const size = drag.cellSize || 32;
  const horizontal = editor.orientation === "horizontal";
  const grip = (drag.held.offset + 0.5) * size;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-50 p-[3px] opacity-90"
      style={{
        width: horizontal ? length * size : size,
        height: horizontal ? size : length * size,
        transform: `translate(${drag.x - (horizontal ? grip : size / 2)}px, ${drag.y - (horizontal ? size / 2 : grip)}px)`,
      }}
    >
      <ShipSprite kind={drag.held.kind} orientation={editor.orientation} tone="hover" />
    </div>
  );
}

export function PlacementScreen({
  view,
  phase,
  clockOffset,
  rejection,
  send,
}: PhaseScreenProps<"Placing">) {
  const rival = view.opponent?.callsign ?? "Your opponent";

  // Lock as soon as Ready is sent; unlock again only if the server refuses the fleet.
  const [readySentAt, setReadySentAt] = useState<number>();
  const refused = rejection?.reason === "invalid-fleet" ? rejection : undefined;
  const awaitingReady = readySentAt !== undefined && !(refused && refused.at >= readySentAt);
  const locked = phase.myReady || awaitingReady;

  const editor = usePlacementEditor(phase.myDraft, locked);
  const gridRef = useRef<HTMLDivElement>(null);
  const { drag, startPress, shouldSwallowClick } = useShipDrag({
    gridRef,
    onLift: editor.lift,
    onDrop: editor.endDrag,
  });
  const complete = isCompleteFleet(editor.fleet);
  const missing = FLEET.length - editor.fleet.length;

  // Drafts let the server keep what's placed if the clock runs out. The draft we were handed
  // is already on the server, so only send once the fleet actually changes.
  const lastDraft = useRef<Fleet>(phase.myDraft);
  const sendDraft = useEffectEvent((fleet: Fleet) => {
    lastDraft.current = fleet;
    send({ _tag: "Draft", fleet });
  });
  useEffect(() => {
    const fleet = editor.fleet;
    if (locked || fleet === lastDraft.current) return;
    const id = setTimeout(() => sendDraft(fleet), DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [editor.fleet, locked]);

  const [dismissedRefusal, setDismissedRefusal] = useState<number>();
  const showRefusal = refused !== undefined && refused.at !== dismissedRefusal;
  useEffect(() => {
    if (!refused) return;
    const id = setTimeout(() => setDismissedRefusal(refused.at), REFUSAL_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [refused]);

  const lockIn = () => {
    if (!complete || locked) return;
    lastDraft.current = editor.fleet;
    setReadySentAt(Date.now());
    playCue("ui-ready");
    send({ _tag: "Ready", fleet: editor.fleet });
  };

  const hint = showRefusal ? REFUSED : hintFor(editor, locked);
  const hintIsError = showRefusal || editor.notice.tone === "error";
  const spoken = showRefusal
    ? REFUSED
    : phase.myReady
      ? `Fleet locked in. Waiting for ${rival}.`
      : editor.notice.text;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "mx-auto flex max-w-6xl flex-col gap-4 px-3 pt-4 pb-10 sm:px-6 md:pt-6 lg:pb-16",
          drag && "cursor-grabbing",
        )}
      >
        <AppHeader>
          <span className="hud-label min-w-0 truncate">
            {view.me.callsign} <span className="text-sonar-ink/30">vs</span> {rival}
          </span>
        </AppHeader>

        <OpponentStatus opponent={view.opponent} clockOffset={clockOffset} consequence="FORFEITS" />

        <main className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-5">
          <div className="lg:col-start-2 lg:row-start-1">
            <DeploymentStatus
              round={view.round}
              rival={rival}
              rivalReady={phase.opponentReady}
              deadline={phase.deadline}
              clockOffset={clockOffset}
              locked={locked}
            />
          </div>

          <section
            aria-label="Placement board"
            className="flex min-w-0 flex-col items-center gap-3 lg:col-start-1 lg:row-span-2 lg:row-start-1"
          >
            <div className="w-full lg:max-w-[min(100%,calc(100dvh-7.5rem))]">
              <PlacementBoard
                editor={editor}
                drag={drag}
                gridRef={gridRef}
                locked={locked}
                onGrab={startPress}
                shouldSwallowClick={shouldSwallowClick}
              >
                <AnimatePresence>
                  {locked && (
                    <motion.div
                      className="absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-sonar-abyss/45 p-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="hud-panel flex max-w-sm flex-col items-center gap-2 border-sonar-cyan/50 px-6 py-5 text-center sm:px-10 sm:py-7"
                        initial={{ scale: 0.85, y: 12 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      >
                        <Lock
                          className="size-7 text-sonar-cyan"
                          strokeWidth={2.5}
                          aria-hidden="true"
                        />
                        <p className="font-display text-lg text-sonar-cyan sm:text-2xl">
                          Fleet locked
                        </p>
                        <p className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-sonar-ink/80 uppercase">
                          {phase.myReady ? (
                            <>
                              <span className="live-dot shrink-0 text-sonar-amber" />
                              Waiting for {rival}…
                            </>
                          ) : (
                            <>
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                              Locking in…
                            </>
                          )}
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </PlacementBoard>
            </div>
            <motion.p
              key={hintIsError ? editor.notice.n : "hint"}
              aria-hidden="true"
              initial={hintIsError ? { x: -6 } : false}
              animate={{ x: 0 }}
              transition={{ type: "spring", stiffness: 700, damping: 12 }}
              className={cn(
                "min-h-[2lh] text-center text-xs leading-snug sm:min-h-0 sm:text-sm",
                hintIsError ? "font-extrabold text-sonar-coral" : "text-sonar-ink/70",
              )}
            >
              {hint}
            </motion.p>
          </section>

          <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2">
            {!locked && (
              <div className="grid grid-cols-3 gap-2 max-lg:order-first max-sm:[&_svg]:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2"
                  onClick={editor.rotate}
                  disabled={!editor.held}
                  aria-keyshortcuts="R"
                  aria-label={
                    editor.held
                      ? `Rotate ${shipName(editor.held.kind)}, now ${editor.orientation}`
                      : "Rotate"
                  }
                >
                  <RotateCw strokeWidth={3} aria-hidden="true" />
                  Rotate
                </Button>
                <Button variant="secondary" size="sm" className="px-2" onClick={editor.randomize}>
                  <Shuffle strokeWidth={3} aria-hidden="true" />
                  Random
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2"
                  onClick={editor.clear}
                  disabled={editor.fleet.length === 0}
                >
                  <Eraser strokeWidth={3} aria-hidden="true" />
                  Clear
                </Button>
              </div>
            )}

            <ShipTray
              fleet={editor.fleet}
              held={editor.held}
              locked={locked}
              onSelect={editor.select}
              onGrab={startPress}
            />

            {!locked && (
              // Once the fleet is complete, keep Ready in reach on phones without scrolling.
              <div
                className={cn(
                  complete &&
                    "sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 lg:static",
                )}
              >
                <Button size="lg" className="w-full" disabled={!complete} onClick={lockIn}>
                  <Anchor strokeWidth={3} aria-hidden="true" />
                  {complete
                    ? "Ready for battle"
                    : `Place ${missing} more ship${missing === 1 ? "" : "s"}`}
                </Button>
              </div>
            )}
          </div>
        </main>

        <p className="sr-only" aria-live="polite">
          {/* A trailing space on alternate notices makes identical messages announce again. */}
          {spoken}
          {editor.notice.n % 2 === 1 ? " " : ""}
        </p>

        {drag && !drag.cell && <DragGhost drag={drag} editor={editor} />}
      </div>
    </MotionConfig>
  );
}
