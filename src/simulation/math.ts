import {
  attackDirection,
  PITCH,
  type Player,
  type Position,
  type Team,
} from "../domain.ts";
import type { Effort } from "./types.ts";
import { clamp } from "../math.ts";

export { clamp } from "../math.ts";

export const GRAVITY = 9.81;

// Measures horizontal pitch distance between two positions.
export const distance = (a: Position, b: Position) =>
  Math.hypot(a.x - b.x, a.z - b.z);

export const overallSkill = (player: Pick<Player, "skills" | "stamina">) =>
  (Object.values(player.skills).reduce((total, skill) => total + skill, 0) /
    Object.keys(player.skills).length) *
  (0.7 + (player.stamina / 100) * 0.3);

// Calculates movement speed from effort, stamina, and injury state.
export const effectiveSpeed = (player: Player, effort: Effort) => {
  const effortMultiplier =
    effort === "sprint"
      ? 1.28
      : effort === "run"
        ? 1
        : effort === "jog"
          ? 0.62
          : 0;
  const staminaMultiplier = 0.65 + (player.stamina / 100) * 0.35;
  const skillMultiplier = 0.78 + overallSkill(player) * 0.28;
  return Math.max(
    0,
    player.speed * effortMultiplier * staminaMultiplier * skillMultiplier -
      player.injuryPenalty,
  );
};

// Reduces execution skill as fatigue accumulates without making tired players useless.
export const effectiveSkill = (player: Player, skill: keyof Player["skills"]) =>
  player.skills[skill] * (0.7 + (player.stamina / 100) * 0.3);

// Calculates maximum stamina capacity based on match clock (0-80min) and player weight.
export const maxStamina = (player: Player, matchClockSeconds: number) => {
  const timeProgress = Math.min(1, matchClockSeconds / 4800);
  const weightFatigue = (player.weight / 100) * 22;
  return Math.max(45, 100 - timeProgress * weightFatigue);
};

export const contactStrength = (
  player: Player,
  primary: keyof Player["skills"] = "tackling",
) => {
  const technique =
    effectiveSkill(player, primary) * 0.7 + overallSkill(player) * 0.3;
  const fatigue = 0.45 + (player.stamina / 100) * 0.55;
  return player.weight * fatigue * (0.42 + technique * 0.72);
};

// Reports whether a position lies inside its team's own twenty-two.
export const insideOwnTwentyTwo = (team: Team, z: number) =>
  team === 0
    ? z <= PITCH.twentyTwoMetreLines.south
    : z >= PITCH.twentyTwoMetreLines.north;

// Builds velocity needed to move a player toward a target at effective speed.
export const desiredVelocity = (
  player: Player,
  target: Position,
  effort: Effort,
): Position => {
  const dx = target.x - player.position.x;
  const dz = target.z - player.position.z;
  const length = Math.hypot(dx, dz);
  // Complete stop when virtually on target
  if (length < 0.1) return { x: 0, z: 0 };
  const maxSpeed = effectiveSpeed(player, effort);
  // Smoothly ramp down speed inside 2.0m arrival radius so player stops cleanly without overshoot
  const speed = length < 2.0 ? maxSpeed * (length / 2.0) : maxSpeed;
  return { x: (dx / length) * speed, z: (dz / length) * speed };
};
