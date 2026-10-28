import { Link } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import type { ReactNode } from "react";
import { SoundToggles } from "./SoundToggles";

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <Link to="/" className="flex shrink-0 items-center gap-2 rounded-lg" aria-label="Sonar home">
        <Radar className="size-6 text-sonar-green" strokeWidth={2.5} aria-hidden="true" />
        <span className="glow-green font-display text-lg">SONAR</span>
      </Link>
      {/* min-w-0 lets a long "callsign vs callsign" truncate instead of widening the page on phones. */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {children}
        <SoundToggles className="shrink-0" />
      </div>
    </header>
  );
}
