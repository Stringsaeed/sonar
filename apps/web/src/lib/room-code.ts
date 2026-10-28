import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@sonar/game";

export const randomRoomCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint32Array(ROOM_CODE_LENGTH)),
    (n) => ROOM_CODE_ALPHABET[n % ROOM_CODE_ALPHABET.length],
  ).join("");

/** Uppercases and strips anything that can't appear in a room code, as the player types. */
export const normalizeRoomCode = (input: string) =>
  input
    .toUpperCase()
    .split("")
    .filter((char) => ROOM_CODE_ALPHABET.includes(char))
    .join("")
    .slice(0, ROOM_CODE_LENGTH);
