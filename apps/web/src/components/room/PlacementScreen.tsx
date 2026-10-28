import type { PhaseScreenProps } from "./types";

export function PlacementScreen({ phase }: PhaseScreenProps<"Placing">) {
  return <pre>{JSON.stringify(phase, null, 2)}</pre>;
}
