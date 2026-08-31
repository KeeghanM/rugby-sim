import type { GameState, Player } from "../../domain.ts";
import { command } from "./utils.ts";
import { computeFlightCommands } from "./flight.ts";
import {
  getConversionCommands,
  getKickoffCommands,
  getLineoutCommands,
  getMaulCommands,
  getPenaltyCommands,
  getRuckCommands,
  getScrumCommands,
} from "./set-piece.ts";
import { getOpenPlayCommands } from "./open-play.ts";
import type { PlayerCommand, Random } from "../types.ts";

export const computeCommands = (
  state: GameState,
  random: Random = Math.random,
): PlayerCommand[] => {
  const players = state.players.map((player) => ({
    ...player,
    position: { ...player.position },
    velocity: { ...player.velocity },
    intentTarget: { ...player.intentTarget },
  }));

  if (state.half === "fullTime") {
    return players.map((player) =>
      command(player, player.position, "full-time", true, "stand"),
    );
  }

  const kickoff = getKickoffCommands(state, players);
  if (kickoff) return kickoff;

  const lineout = getLineoutCommands(state, players);
  if (lineout) return lineout;

  const scrum = getScrumCommands(state, players);
  if (scrum) return scrum;

  const maul = getMaulCommands(state, players);
  if (maul) return maul;

  const conversion = getConversionCommands(state, players);
  if (conversion) return conversion;

  const penalty = getPenaltyCommands(state, players);
  if (penalty) return penalty;

  const ruck = getRuckCommands(state, players);
  if (ruck) return ruck;

  if (state.ball.flight) return computeFlightCommands(state, players);

  const carrier = players.find((player) => player.id === state.ball.carrierId);
  return getOpenPlayCommands(state, players, carrier, random);
};

export * from "./utils.ts";
export * from "./carrier.ts";
export * from "./flight.ts";
export * from "./set-piece.ts";
export * from "./open-play.ts";
