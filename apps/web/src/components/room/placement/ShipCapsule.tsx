import type { Orientation } from "@sonar/game";
import { cn } from "@/lib/utils";

export type CapsuleTone = "ship" | "hover" | "lifted" | "legal" | "illegal";

const TONES: Record<CapsuleTone, string> = {
  ship: "border-sonar-green/90 bg-linear-to-b from-sonar-green/55 to-[#1fae5e]/40 shadow-[0_0_14px_rgb(57_255_136/0.35),inset_0_0_10px_rgb(57_255_136/0.25)]",
  hover:
    "border-white bg-linear-to-b from-sonar-green/75 to-[#1fae5e]/55 shadow-[0_0_22px_rgb(57_255_136/0.7),inset_0_0_10px_rgb(255_255_255/0.3)]",
  lifted: "border-dashed border-sonar-cyan/70 bg-sonar-cyan/10",
  legal:
    "border-dashed border-sonar-green bg-sonar-green/25 shadow-[0_0_18px_rgb(57_255_136/0.55)]",
  illegal:
    "border-dashed border-sonar-coral bg-sonar-coral/25 shadow-[0_0_18px_rgb(255_79_94/0.55)]",
};

const PORTHOLES: Record<CapsuleTone, string> = {
  ship: "bg-sonar-abyss/55",
  hover: "bg-sonar-abyss/55",
  lifted: "bg-sonar-cyan/40",
  legal: "bg-sonar-green/70",
  illegal: "bg-sonar-coral/70",
};

/**
 * A ship drawn as a glowing capsule with a porthole per cell. `justify-around` puts each
 * porthole at the centre of the cell beneath it.
 */
export function ShipCapsule({
  length,
  orientation,
  tone,
  className,
}: {
  length: number;
  orientation: Orientation;
  tone: CapsuleTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-full items-center justify-around rounded-full border-2",
        orientation === "vertical" && "flex-col",
        TONES[tone],
        className,
      )}
    >
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          className={cn("size-1.5 rounded-full sm:size-2 lg:size-2.5", PORTHOLES[tone])}
        />
      ))}
    </span>
  );
}
