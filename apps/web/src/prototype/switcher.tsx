// PROTOTYPE — throwaway. Floating variant switcher, dev builds only.
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const VARIANTS = [
  { key: "A", name: "Sonar arcade" },
  { key: "B", name: "Neo-brutalist" },
  { key: "C", name: "Toy-box" },
] as const;

export type VariantKey = (typeof VARIANTS)[number]["key"];

export const parseVariant = (search: Record<string, unknown>): { variant: VariantKey } => {
  const key = VARIANTS.find((v) => v.key === search.variant)?.key;
  return { variant: key ?? "A" };
};

export function PrototypeSwitcher({ current }: { current: VariantKey }) {
  const navigate = useNavigate();
  const index = VARIANTS.findIndex((v) => v.key === current);

  const go = (step: number) => {
    const next = VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length]!;
    void navigate({ to: ".", search: (prev) => ({ ...prev, variant: next.key }), replace: true });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (event.key === "ArrowLeft" && event.altKey) go(-1);
      if (event.key === "ArrowRight" && event.altKey) go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!import.meta.env.DEV) return null;

  return (
    <div
      style={{ fontFamily: "ui-monospace, monospace", zIndex: 2147483647 }}
      className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1 text-xs text-white shadow-2xl ring-2 ring-white/80"
    >
      <button
        className="rounded-full px-2 py-1 hover:bg-white/20"
        onClick={() => go(-1)}
        aria-label="Previous variant"
      >
        ←
      </button>
      <span className="px-2">
        PROTOTYPE {current} · {VARIANTS[index]?.name} <span className="opacity-60">(alt ←/→)</span>
      </span>
      <button
        className="rounded-full px-2 py-1 hover:bg-white/20"
        onClick={() => go(1)}
        aria-label="Next variant"
      >
        →
      </button>
    </div>
  );
}
