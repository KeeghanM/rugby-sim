import type { GameState } from "./domain.ts";
import { computeCommands } from "./simulation/decisions.ts";
import { advanceDefensiveLine, applyCommands } from "./simulation/movement.ts";
import type { Random } from "./simulation/types.ts";

export { createGame } from "./simulation/create-game.ts";
export { computeCommands } from "./simulation/decisions.ts";
export { applyCommands } from "./simulation/movement.ts";
export type { PlayerCommand } from "./simulation/types.ts";

// Advances defensive shape, computes commands, and applies one simulation tick.
export const updateGame = (
  state: GameState,
  deltaSeconds: number,
  random: Random = Math.random,
) => {
  advanceDefensiveLine(state, deltaSeconds);
  applyCommands(state, computeCommands(state, random), deltaSeconds, random);
};
