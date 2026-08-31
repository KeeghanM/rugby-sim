import { attackDirection, PITCH, type Player, type Position, type Team } from "../domain.ts";
import type { Effort } from "./types.ts";

export const GRAVITY = 9.81;

// Measures horizontal pitch distance between two positions.
export const distance = (a: Position, b: Position) =>
  Math.hypot(a.x - b.x, a.z - b.z);

// Restricts a numeric value to inclusive bounds.
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

// Calculates movement speed from effort, stamina, and injury state.
export const effectiveSpeed = (player: Player, effort: Effort) => {
  const effortMultiplier =
    effort === "sprint" ? 1.28 : effort === "run" ? 1 : effort === "jog" ? 0.62 : 0;
  const staminaMultiplier = 0.65 + (player.stamina / 100) * 0.35;
  return Math.max(
    0,
    player.speed * effortMultiplier * staminaMultiplier - player.injuryPenalty,
  );
};

// Reduces execution skill as fatigue accumulates without making tired players useless.
export const effectiveSkill = (player: Player, skill: keyof Player["skills"]) =>
  player.skills[skill] * (0.7 + (player.stamina / 100) * 0.3);

// Calculates contact weight after stamina loss.
export const effectiveWeight = (player: Player) => player.weight * (player.stamina / 100);

// Reports whether a position lies inside its team's own twenty-two.
export const insideOwnTwentyTwo = (team: Team, z: number) =>
  team === 0 ? z <= PITCH.twentyTwoMetreLines.south : z >= PITCH.twentyTwoMetreLines.north;

// Builds velocity needed to move a player toward a target at effective speed.
export const desiredVelocity = (
  player: Player,
  target: Position,
  effort: Effort,
): Position => {
  const dx = target.x - player.position.x;
  const dz = target.z - player.position.z;
  const length = Math.hypot(dx, dz);
  // Stop close to target to avoid oscillation.
  if (length < 0.35) return { x: 0, z: 0 };
  const speed = effectiveSpeed(player, effort);
  return { x: (dx / length) * speed, z: (dz / length) * speed };
};
