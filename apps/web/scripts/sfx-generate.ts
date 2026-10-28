// Generates raw takes for every cue in sfx/prompts.json with the ElevenLabs Sound Effects API.
// Existing takes are kept, so re-running only fills gaps. Delete a take (or a cue's folder) to
// regenerate it.
//
//   ELEVENLABS_API_KEY=... node scripts/sfx-generate.ts [cue ...]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface Prompt {
  readonly prompt: string;
  readonly seconds: number;
  readonly loop?: boolean;
  readonly takes?: number;
}

const DEFAULT_TAKES = 3;
const PROMPT_INFLUENCE = 0.5;
const root = join(import.meta.dirname, "..", "sfx");
const prompts: Record<string, Prompt> = JSON.parse(
  readFileSync(join(root, "prompts.json"), "utf8"),
);

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("Set ELEVENLABS_API_KEY");

const only = process.argv.slice(2);
for (const [cue, spec] of Object.entries(prompts)) {
  if (only.length > 0 && !only.includes(cue)) continue;
  const dir = join(root, "takes", cue);
  mkdirSync(dir, { recursive: true });
  for (let take = 1; take <= (spec.takes ?? DEFAULT_TAKES); take++) {
    const file = join(dir, `${take}.mp3`);
    if (existsSync(file)) continue;
    const response = await fetch(
      "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          text: spec.prompt,
          duration_seconds: spec.seconds,
          prompt_influence: PROMPT_INFLUENCE,
          ...(spec.loop ? { loop: true } : {}),
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`${cue} take ${take}: ${response.status} ${await response.text()}`);
    }
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    console.log(`generated ${cue}/${take}.mp3`);
  }
}
