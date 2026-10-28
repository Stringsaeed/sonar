import { Duration } from "effect";

export const BOARD_SIZE = 10;

export const FLEET = [
  { kind: "carrier", length: 5 },
  { kind: "battleship", length: 4 },
  { kind: "cruiser", length: 3 },
  { kind: "submarine", length: 3 },
  { kind: "destroyer", length: 2 },
] as const;

export const CLOCKS = {
  turn: Duration.seconds(30),
  placement: Duration.minutes(2),
  reconnect: Duration.seconds(60),
  lobbyExpiry: Duration.minutes(10),
} as const;

export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 6;
