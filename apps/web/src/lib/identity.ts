import { Callsign, PlayerToken } from "@sonar/game";
import { Option, Schema } from "effect";

const TOKEN_KEY = "sonar.token";
const CALLSIGN_KEY = "sonar.callsign";

const ADJECTIVES = [
  "Silent",
  "Rogue",
  "Iron",
  "Salty",
  "Ghost",
  "Brave",
  "Deep",
  "Lucky",
  "Grim",
  "Swift",
];
const NOUNS = [
  "Kraken",
  "Barnacle",
  "Marlin",
  "Torpedo",
  "Anchor",
  "Narwhal",
  "Squid",
  "Harpoon",
  "Reef",
  "Gale",
];

const pick = <A>(items: ReadonlyArray<A>): A => items[Math.floor(Math.random() * items.length)]!;

const remembered = <A>(key: string, schema: Schema.Codec<A, string>, make: () => string): A => {
  const stored = Schema.decodeUnknownOption(schema)(localStorage.getItem(key));
  if (Option.isSome(stored)) return stored.value;
  const fresh = Schema.decodeSync(schema)(make());
  localStorage.setItem(key, Schema.encodeSync(schema)(fresh));
  return fresh;
};

export interface Identity {
  readonly token: PlayerToken;
  readonly callsign: Callsign;
}

export const loadIdentity = (): Identity => ({
  token: remembered(TOKEN_KEY, PlayerToken, () => crypto.randomUUID()),
  callsign: remembered(CALLSIGN_KEY, Callsign, () => `${pick(ADJECTIVES)} ${pick(NOUNS)}`),
});
