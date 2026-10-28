import { Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const CONFIRM_WINDOW_MS = 3000;

/** Two presses to surrender: the first arms it, the second (within a few seconds) commits. */
export function ForfeitButton({ onForfeit }: { onForfeit: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), CONFIRM_WINDOW_MS);
    return () => clearTimeout(id);
  }, [confirming]);

  return (
    <Button
      size="sm"
      variant={confirming ? "destructive" : "outline"}
      className="px-3 text-[0.65rem] sm:px-5 sm:text-xs"
      aria-label={confirming ? "Confirm forfeit" : "Forfeit match"}
      onClick={() => (confirming ? onForfeit() : setConfirming(true))}
      onKeyDown={(event) => {
        if (event.key === "Escape") setConfirming(false);
      }}
    >
      <Flag className="size-4" strokeWidth={3} aria-hidden="true" />
      <span className={confirming ? undefined : "max-sm:sr-only"}>
        {confirming ? "Sure?" : "Forfeit"}
      </span>
    </Button>
  );
}
