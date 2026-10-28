import { Link } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import type { ReactNode } from "react";

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <Link to="/" className="flex items-center gap-2 rounded-lg" aria-label="Sonar home">
        <Radar className="size-6 text-sonar-green" strokeWidth={2.5} aria-hidden="true" />
        <span className="glow-green font-display text-lg">SONAR</span>
      </Link>
      {children}
    </header>
  );
}
