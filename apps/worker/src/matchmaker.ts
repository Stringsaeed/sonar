import { Server } from "partyserver";

export class Matchmaker extends Server<Env> {
  static override options = { hibernate: true };
}
