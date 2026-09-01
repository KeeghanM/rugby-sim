import type { GameState, Player } from "../../domain.ts";
import { clamp, distance, maxStamina, overallSkill } from "../math.ts";
import type { PlayerCommand } from "../types.ts";

export const updateStamina = (
  state: GameState,
  player: Player,
  next: PlayerCommand,
  deltaSeconds: number,
) => {
  const atTarget = distance(player.position, next.target) < 0.35;
  const isTightFive = player.number >= 1 && player.number <= 5;
  const isLooseForward = player.number >= 6 && player.number <= 8;

  const matchSeconds = deltaSeconds * 6;

  // Positional drain rates approximate heavier forwards' greater repeated-work cost.
  const baseDrainRate = isTightFive ? 0.024 : isLooseForward ? 0.017 : 0.013;
  const effortMod =
    next.effort === "sprint"
      ? 2.1
      : next.effort === "run"
        ? 1.0
        : next.effort === "jog"
          ? 0.4
          : 0;

  const weightFactor = Math.max(0.4, 1 - (player.weight - 70) / 120);
  const skillFactor = 0.55 + overallSkill(player) * 0.9;
  // Recovery favours lighter, fitter players but keeps at least 40% of weight contribution.
  const recoveryRate = 0.014 * weightFactor * skillFactor;

  const netRate =
    atTarget || next.effort === "stand"
      ? recoveryRate
      : -baseDrainRate * effortMod;

  const ceiling = maxStamina(player, state.matchClockSeconds);
  player.stamina = clamp(player.stamina + netRate * matchSeconds, 0, ceiling);
};
