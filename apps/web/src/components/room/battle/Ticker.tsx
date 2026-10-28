import { useEffect, useRef } from "react";
import { coordKey } from "@sonar/game";
import { cellLabel, shipName, type LogEntry } from "./model";

function Line({ entry: { shot, mine } }: { entry: LogEntry }) {
  const hit = shot.result === "hit";
  return (
    <li className="flex gap-2 whitespace-nowrap">
      <span className={mine ? "text-sonar-green" : "text-sonar-coral/80"}>
        {mine ? "YOU" : "FOE"}
      </span>
      <span className="text-white/35" aria-hidden="true">
        {">"}
      </span>
      <span className="truncate">
        <span className="text-white">{cellLabel(shot.at)}</span>{" "}
        {shot.auto ? (
          <span className="font-extrabold text-sonar-amber">CLOCK RAN OUT — AUTO MISS</span>
        ) : (
          <span className={hit ? "font-extrabold text-sonar-coral" : "text-sonar-cyan/70"}>
            {hit ? "HIT" : "MISS"}
          </span>
        )}
        {shot.sunk && (
          <span className="font-extrabold text-sonar-amber"> — {shipName(shot.sunk)} SUNK</span>
        )}
      </span>
    </li>
  );
}

/** The terminal-style shot log, both sides interleaved, newest at the bottom. */
export function Ticker({ log }: { log: ReadonlyArray<LogEntry> }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  return (
    <div className="battle-terminal flex min-h-0 flex-1 flex-col rounded-2xl border-2 border-sonar-green/25 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="hud-label !text-sonar-green/80">Sonar log</h2>
        <span className="hud-label">
          {log.length} {log.length === 1 ? "contact" : "contacts"}
        </span>
      </div>
      <ol
        ref={list}
        // Focusable so keyboard users can scroll back through the history.
        tabIndex={0}
        className="max-h-44 min-h-0 flex-1 space-y-0.5 overflow-y-auto rounded-md pr-1 text-[0.72rem] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-sonar-green/60 sm:text-xs lg:max-h-none"
        aria-label="Shot log"
      >
        {log.map((entry) => (
          <Line key={`${entry.mine ? "me" : "foe"}-${coordKey(entry.shot.at)}`} entry={entry} />
        ))}
        <li aria-hidden="true">
          <span className="text-sonar-green">{">"}</span>{" "}
          {log.length === 0 && <span className="text-sonar-ink/50">awaiting first contact </span>}
          <span className="battle-caret" />
        </li>
      </ol>
    </div>
  );
}
