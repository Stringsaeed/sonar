export const CUES = {
  fire: { volume: 0.6 },
  splash: { volume: 0.55 },
  explosion: { volume: 0.8 },
  sink: { volume: 0.9 },
  "your-turn": { volume: 0.55 },
  "clock-tick": { volume: 0.35 },
  "match-found": { volume: 0.7 },
  victory: { volume: 0.75 },
  defeat: { volume: 0.75 },
  "ui-place": { volume: 0.5 },
  "ui-rotate": { volume: 0.4 },
  "ui-randomize": { volume: 0.5 },
  "ui-ready": { volume: 0.6 },
  "ambient-hum": { volume: 0.22, loop: true },
  "ambient-ping": { volume: 0.18 },
} as const satisfies Record<string, { volume: number; loop?: boolean }>;

export type Cue = keyof typeof CUES;
