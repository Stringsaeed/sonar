import { useAtom } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { applySoundSettings, loadSoundSettings, type SoundSettings } from "./engine.ts";

export { playCue, unlockSound, vibrate } from "./engine.ts";
export type { Cue } from "./cues.ts";

const settingsAtom = Atom.make(loadSoundSettings()).pipe(Atom.keepAlive);

export const useSoundSettings = () => {
  const [settings, set] = useAtom(settingsAtom);
  const update = (patch: Partial<SoundSettings>) => {
    const next = { ...settings, ...patch };
    applySoundSettings(next);
    set(next);
  };
  return { settings, update };
};
