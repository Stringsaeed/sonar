import { SHIP_LENGTH, type Orientation, type ShipKind } from "@sonar/game";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./ship.css";

export type ShipTone = "ship" | "hover" | "lifted" | "legal" | "illegal" | "sunk" | "revealed";

/** One board cell in sprite units. Every ship is drawn bow-right, `length * CELL` wide. */
const CELL = 100;

/** A gun turret centred on the keel line, barrels pointing at the bow (or the stern when `aft`). */
function Turret({
  x,
  barrels,
  scale = 1,
  aft = false,
}: {
  x: number;
  barrels: 1 | 2 | 3;
  scale?: number;
  aft?: boolean;
}) {
  const ys = barrels === 1 ? [0] : barrels === 2 ? [-3.5, 3.5] : [-6, 0, 6];
  return (
    <g transform={`translate(${x} 50) scale(${aft ? -scale : scale} ${scale})`}>
      {ys.map((y) => (
        <rect
          key={y}
          x={6}
          y={y - 1.6}
          width={30}
          height={3.2}
          rx={1.2}
          fill="var(--ship-detail)"
        />
      ))}
      <path
        d="M-14,-9 Q-14,-13 -9,-13 L4,-13 Q14,-13 14,0 Q14,13 4,13 L-9,13 Q-14,13 -14,9 Z"
        fill="var(--ship-detail)"
      />
      <path d="M-9,-8 L3,-8 Q9,-8 9,0 Q9,8 3,8 L-9,8 Z" fill="var(--ship-hi)" opacity={0.35} />
    </g>
  );
}

/** A parked jet, nose right. */
const Jet = ({ x, y }: { x: number; y: number }) => (
  <path
    transform={`translate(${x} ${y})`}
    d="M0,0 L-6,-2 L-9,-10 L-12,-10 L-11,-2 L-17,-1 L-19,-5 L-21,-5 L-20,0 L-21,5 L-19,5 L-17,1 L-11,2 L-12,10 L-9,10 L-6,2 Z"
    fill="var(--ship-hi)"
    opacity={0.8}
  />
);

interface Hull {
  /** Outline at deck level; the rim and glow follow this. */
  readonly hull: string;
  /** A slightly inset deck surface, drawn over the hull. */
  readonly deck?: string;
  readonly details: ReactNode;
  /** Painted near-black, like a real boat, rather than haze grey. */
  readonly dark?: boolean;
}

const HULLS: Record<ShipKind, Hull> = {
  carrier: {
    hull: "M10,32 L18,24 L250,22 L300,12 L362,12 L440,24 Q478,32 492,50 Q478,66 440,72 L120,77 L20,77 L10,70 Z",
    details: (
      <>
        {/* Angled landing deck and the straight bow runway. */}
        <path
          d="M40,64 L320,20"
          stroke="var(--ship-mark)"
          strokeWidth={2}
          strokeDasharray="14 10"
        />
        <path
          d="M60,50 L470,50"
          stroke="var(--ship-mark)"
          strokeWidth={2}
          strokeDasharray="14 10"
        />
        <path
          d="M30,72 L300,26 M60,76 L330,30"
          stroke="var(--ship-mark)"
          strokeWidth={1}
          opacity={0.5}
        />
        <rect x={200} y={67} width={26} height={10} fill="var(--ship-shade)" />
        <rect x={392} y={62} width={22} height={10} fill="var(--ship-shade)" />
        {/* The island, on the starboard edge. */}
        <rect x={296} y={62} width={74} height={14} rx={4} fill="var(--ship-detail)" />
        <rect x={322} y={64} width={22} height={10} rx={3} fill="var(--ship-hi)" opacity={0.55} />
        <circle cx={354} cy={69} r={3.5} fill="var(--ship-hi)" />
        <Jet x={470} y={38} />
        <Jet x={448} y={36} />
        <Jet x={426} y={34} />
        <Jet x={120} y={36} />
        <Jet x={96} y={38} />
      </>
    ),
  },
  battleship: {
    hull: "M12,50 C12,36 26,28 56,27 L290,27 C340,27 374,38 394,50 C374,62 340,73 290,73 L56,73 C26,72 12,64 12,50 Z",
    deck: "M22,50 C22,39 34,33 58,33 L288,33 C330,33 358,41 374,50 C358,59 330,67 288,67 L58,67 C34,67 22,61 22,50 Z",
    details: (
      <>
        <Turret x={300} barrels={3} />
        <Turret x={252} barrels={3} />
        <Turret x={76} barrels={3} aft />
        <rect x={124} y={36} width={98} height={28} rx={9} fill="var(--ship-detail)" />
        <ellipse cx={156} cy={50} rx={15} ry={9} fill="var(--ship-shade)" />
        <ellipse cx={156} cy={50} rx={9} ry={5} fill="#0b1118" />
        <rect x={190} y={40} width={26} height={20} rx={6} fill="var(--ship-hi)" opacity={0.6} />
        {[140, 172, 204].map((x) => (
          <g key={x} fill="var(--ship-detail)">
            <circle cx={x} cy={32} r={3.5} />
            <circle cx={x} cy={68} r={3.5} />
          </g>
        ))}
      </>
    ),
  },
  cruiser: {
    hull: "M10,50 C10,38 22,31 46,31 L210,31 C252,31 278,41 294,50 C278,59 252,69 210,69 L46,69 C22,69 10,62 10,50 Z",
    deck: "M19,50 C19,41 29,36 48,36 L208,36 C244,36 264,43 276,50 C264,57 244,64 208,64 L48,64 C29,64 19,59 19,50 Z",
    details: (
      <>
        <Turret x={226} barrels={2} scale={0.8} />
        <Turret x={190} barrels={2} scale={0.8} />
        <Turret x={56} barrels={2} scale={0.8} aft />
        <rect x={94} y={39} width={74} height={22} rx={7} fill="var(--ship-detail)" />
        <ellipse cx={114} cy={50} rx={9} ry={6} fill="#0b1118" />
        <ellipse cx={136} cy={50} rx={9} ry={6} fill="#0b1118" />
        <rect x={150} y={42} width={16} height={16} rx={4} fill="var(--ship-hi)" opacity={0.6} />
      </>
    ),
  },
  submarine: {
    dark: true,
    hull: "M10,50 C10,46 30,38 70,36 L232,35 C270,35 292,42 292,50 C292,58 270,65 232,65 L70,64 C30,62 10,54 10,50 Z",
    details: (
      <>
        {/* Cruciform tail planes and the screw. */}
        <path
          d="M24,47 L14,30 L27,30 L40,45 Z M24,53 L14,70 L27,70 L40,55 Z"
          fill="var(--ship-shade)"
        />
        <rect x={3} y={46} width={9} height={8} rx={2} fill="var(--ship-shade)" />
        <path d="M60,50 L170,50" stroke="var(--ship-mark)" strokeWidth={1.5} opacity={0.5} />
        {[80, 96, 112, 128, 144].map((x) => (
          <circle key={x} cx={x} cy={50} r={3.5} fill="var(--ship-detail)" />
        ))}
        {/* Sail with fairwater planes. */}
        <rect x={196} y={33} width={9} height={34} rx={3} fill="var(--ship-shade)" />
        <path
          d="M176,50 C176,44 186,42 206,42 C226,42 236,46 238,50 C236,54 226,58 206,58 C186,58 176,56 176,50 Z"
          fill="var(--ship-deck)"
        />
        <ellipse cx={216} cy={50} rx={10} ry={4} fill="var(--ship-hi)" opacity={0.4} />
      </>
    ),
  },
  destroyer: {
    hull: "M8,50 C8,40 16,35 32,35 L134,35 C164,35 182,43 194,50 C182,57 164,65 134,65 L32,65 C16,65 8,60 8,50 Z",
    deck: "M15,50 C15,43 22,39 34,39 L132,39 C158,39 172,45 180,50 C172,55 158,61 132,61 L34,61 C22,61 15,57 15,50 Z",
    details: (
      <>
        <Turret x={150} barrels={1} scale={0.7} />
        <rect x={124} y={44} width={12} height={12} rx={2} fill="var(--ship-shade)" />
        <rect x={64} y={40} width={52} height={20} rx={6} fill="var(--ship-detail)" />
        <ellipse cx={80} cy={50} rx={8} ry={5} fill="#0b1118" />
        <rect x={100} y={43} width={13} height={14} rx={3} fill="var(--ship-hi)" opacity={0.6} />
        {/* Helipad on the fantail. */}
        <circle cx={36} cy={50} r={10} fill="none" stroke="var(--ship-mark)" strokeWidth={1.5} />
        <path
          d="M32,45 L32,55 M40,45 L40,55 M32,50 L40,50"
          stroke="var(--ship-mark)"
          strokeWidth={1.5}
        />
      </>
    ),
  },
};

/**
 * A ship seen from above: hull, deck and superstructure for its class, scaled to fill the grid
 * area it sits in. Horizontal ships point their bow right, vertical ones down.
 *
 * `window` crops it to a run of its cells, for a preview hanging off the edge of the board.
 */
export function ShipSprite({
  kind,
  orientation,
  tone,
  window,
  className,
}: {
  kind: ShipKind;
  orientation: Orientation;
  tone: ShipTone;
  window?: { start: number; count: number };
  className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const length = SHIP_LENGTH[kind];
  const start = (window?.start ?? 0) * CELL;
  const span = (window?.count ?? length) * CELL;
  const horizontal = orientation === "horizontal";
  const { hull, deck, details, dark } = HULLS[kind];
  const steel = `${id}-steel`;

  return (
    <svg
      aria-hidden="true"
      className={cn("ship-sprite block size-full overflow-visible", className)}
      data-tone={tone}
      viewBox={horizontal ? `${start} 0 ${span} ${CELL}` : `0 ${start} ${CELL} ${span}`}
    >
      <defs>
        {/* Shading across the beam: lit along the keel, dark at the sides. */}
        <linearGradient id={steel} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark ? "var(--ship-detail)" : "var(--ship-shade)"} />
          <stop offset="0.45" stopColor={dark ? "var(--ship-shade)" : "var(--ship-light)"} />
          <stop offset="1" stopColor={dark ? "var(--ship-detail)" : "var(--ship-shade)"} />
        </linearGradient>
      </defs>
      <g transform={horizontal ? undefined : `rotate(90) translate(0 -${CELL})`}>
        <path
          className="ship-sprite-hull"
          d={hull}
          fill={`url(#${steel})`}
          vectorEffect="non-scaling-stroke"
        />
        {deck && <path d={deck} fill="var(--ship-deck)" />}
        {details}
      </g>
    </svg>
  );
}
