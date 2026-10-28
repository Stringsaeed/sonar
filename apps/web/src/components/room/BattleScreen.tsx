import type { PhaseScreenProps } from "./types";

export function BattleScreen({ phase }: PhaseScreenProps<"Battle" | "Over">) {
  return <pre>{JSON.stringify(phase, null, 2)}</pre>;
}
