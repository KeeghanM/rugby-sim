import type { GameState } from "./domain.ts";
import { computeCommands } from "./simulation/decisions.ts";
import { advanceDefensiveLine, applyCommands } from "./simulation/movement.ts";
import type { Random } from "./simulation/types.ts";

export { createGame } from "./simulation/create-game.ts";
export { computeCommands } from "./simulation/decisions.ts";
export { applyCommands } from "./simulation/movement.ts";
export type { PlayerCommand } from "./simulation/types.ts";

// Reverse lateral attack flow when current carrier reaches either touch-side channel.
const updateAttackFlow = (state: GameState) => {
  const carrier = state.players.find(
    (player) => player.id === state.ball.carrierId,
  );
  // Preserve current flow while ball is loose or inside central field.
  if (!carrier) return;
  // Turn attack back right before left touchline removes passing space.
  if (carrier.position.x <= -25) state.attackFlow[carrier.team] = 1;
  // Turn attack back left before right touchline removes passing space.
  if (carrier.position.x >= 25) state.attackFlow[carrier.team] = -1;
};

// Advances defensive shape, computes commands, and applies one simulation tick.
export const updateGame = (
  state: GameState,
  deltaSeconds: number,
  random: Random = Math.random,
) => {
  updateAttackFlow(state);
  advanceDefensiveLine(state, deltaSeconds);
  applyCommands(state, computeCommands(state, random), deltaSeconds, random);
};
