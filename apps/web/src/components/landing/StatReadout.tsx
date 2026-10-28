import { cn } from "@/lib/utils";
import { formatCount, formatCountCompact } from "@/lib/format";

/** A HUD readout flanking the radar scope. `value` is undefined while stats load or when unavailable. */
export function StatReadout({
  label,
  value,
  side,
}: {
  label: string;
  value: number | undefined;
  side: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-sonar-green/30 bg-sonar-abyss/80 px-3.5 py-3 shadow-[inset_0_0_24px_rgb(57_255_136/0.06)]",
        "before:absolute before:top-2.5 before:size-1.5 before:rounded-full before:bg-sonar-green before:shadow-[0_0_8px_var(--color-sonar-green)]",
        side === "left" ? "pr-6 before:right-2.5 md:text-right" : "pl-6 before:left-2.5",
      )}
    >
      <div className="hud-label">{label}</div>
      <div className="glow-green font-display text-2xl leading-tight md:text-3xl">
        {value === undefined ? (
          <span className="opacity-40">···</span>
        ) : (
          <>
            <span className="md:hidden">{formatCountCompact(value)}</span>
            <span className="hidden md:inline">{formatCount(value)}</span>
          </>
        )}
      </div>
    </div>
  );
}
