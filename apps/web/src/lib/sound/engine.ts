import { Howl } from "howler";
import { AVAILABLE_CUES } from "./available.gen.ts";
import { CUES, type Cue } from "./cues.ts";

export interface SoundSettings {
  /** Effects, plus vibration on phones that support it. */
  readonly effects: boolean;
  /** The low hum and distant pings behind everything. */
  readonly ambient: boolean;
}

const STORAGE_KEY = "sonar.sound";
const DEFAULTS: SoundSettings = { effects: true, ambient: false };
const AMBIENT_PING_MS = { min: 9_000, max: 20_000 };

export const loadSoundSettings = (): SoundSettings => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
};

let settings = loadSoundSettings();
let howls: Partial<Record<Cue, Howl>> | undefined;
let pingTimer: ReturnType<typeof setTimeout> | undefined;

const howl = (cue: Cue) => howls?.[cue];

const scheduleAmbientPing = () => {
  clearTimeout(pingTimer);
  const wait = AMBIENT_PING_MS.min + Math.random() * (AMBIENT_PING_MS.max - AMBIENT_PING_MS.min);
  pingTimer = setTimeout(() => {
    howl("ambient-ping")?.play();
    scheduleAmbientPing();
  }, wait);
};

const syncAmbient = () => {
  const hum = howl("ambient-hum");
  const audible = settings.ambient && document.visibilityState === "visible";
  if (audible) {
    if (hum && !hum.playing()) hum.play();
    if (!pingTimer) scheduleAmbientPing();
  } else {
    hum?.pause();
    clearTimeout(pingTimer);
    pingTimer = undefined;
  }
};

/**
 * Browsers only allow audio after a user gesture, so nothing loads until the first tap or key.
 * Only cues that have encoded files (see apps/web/sfx) are loaded; the rest stay silent.
 */
export const unlockSound = () => {
  if (howls) return;
  howls = Object.fromEntries(
    AVAILABLE_CUES.map((cue) => {
      const { volume, ...rest } = CUES[cue];
      return [
        cue,
        new Howl({
          src: [`/sfx/${cue}.webm`, `/sfx/${cue}.m4a`],
          volume,
          loop: "loop" in rest && rest.loop,
          preload: true,
        }),
      ];
    }),
  );
  document.addEventListener("visibilitychange", syncAmbient);
  syncAmbient();
};

export const playCue = (cue: Cue) => {
  if (settings.effects) howl(cue)?.play();
};

/** Short buzz on phones that support it (Android; iOS Safari has no Vibration API). */
export const vibrate = (pattern: number | number[]) => {
  if (settings.effects && "vibrate" in navigator) navigator.vibrate(pattern);
};

export const applySoundSettings = (next: SoundSettings) => {
  settings = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  syncAmbient();
};
