// PROTOTYPE — throwaway. Maps each variant key to its landing + battle screens.
import type { ComponentType } from "react";
import { ArcadeBattle } from "./arcade/Battle";
import { ArcadeLanding } from "./arcade/Landing";
import { BrutalistBattle } from "./brutalist/Battle";
import { BrutalistLanding } from "./brutalist/Landing";
import type { BattleProps, LandingProps } from "./fixtures";
import type { VariantKey } from "./switcher";
import { ToyboxBattle } from "./toybox/Battle";
import { ToyboxLanding } from "./toybox/Landing";

export const LANDINGS: Record<VariantKey, ComponentType<LandingProps>> = {
  A: ArcadeLanding,
  B: BrutalistLanding,
  C: ToyboxLanding,
};

export const BATTLES: Record<VariantKey, ComponentType<BattleProps>> = {
  A: ArcadeBattle,
  B: BrutalistBattle,
  C: ToyboxBattle,
};
