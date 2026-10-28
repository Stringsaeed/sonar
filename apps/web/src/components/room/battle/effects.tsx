import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Sonar ripples spreading from a cell that was just fired on. */
export function Ping({ hit, rings = 3 }: { hit: boolean; rings?: number }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-0 z-[5]",
        hit ? "text-sonar-coral" : "text-sonar-green",
      )}
      aria-hidden="true"
    >
      {Array.from({ length: rings }, (_, i) => (
        <span key={i} className="battle-ping" style={{ animationDelay: `${i * 0.22}s` }} />
      ))}
    </span>
  );
}

const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i * 2 * Math.PI) / 10;
  return { x: Math.cos(angle) * 54, y: Math.sin(angle) * 54 };
});

/** Fireball and sparks for a fresh hit. */
export function Explosion() {
  if (useReducedMotion()) return null;
  return (
    <span className="pointer-events-none absolute inset-0 z-[7]" aria-hidden="true">
      <motion.span
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle,#fff_0,#ffd36b_25%,var(--color-sonar-coral)_55%,transparent_70%)]"
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 3.2, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {SPARKS.map(({ x, y }, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] size-1.5 rounded-full bg-[#ffd36b] shadow-[0_0_8px_#ff8a5b]"
          initial={{ x: 0, y: 0, opacity: 1, scale: 1.4 }}
          animate={{ x, y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}
