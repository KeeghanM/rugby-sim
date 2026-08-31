import { attackDirection, PITCH, type Player, type Position, type Team } from "../domain.ts";

export const GRAVITY = 9.81;

// Measures horizontal pitch distance between two positions.
export const distance = (a: Position, b: Position) =>
  Math.hypot(a.x - b.x, a.z - b.z);

// Restricts a numeric value to inclusive bounds.
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

// Calculates running speed after stamina and injury penalties.
export const effectiveSpeed = (player: Player) =>
  Math.max(0, player.speed * (player.stamina / 100) - player.injuryPenalty);

// Calculates contact weight after stamina loss.
export const effectiveWeight = (player: Player) => player.weight * (player.stamina / 100);

// Reports whether a position lies inside its team's own twenty-two.
export const insideOwnTwentyTwo = (team: Team, z: number) =>
  team === 0 ? z <= PITCH.twentyTwoMetreLines.south : z >= PITCH.twentyTwoMetreLines.north;

// Builds velocity needed to move a player toward a target at effective speed.
export const desiredVelocity = (player: Player, target: Position): Position => {
  const dx = target.x - player.position.x;
  const dz = target.z - player.position.z;
  const length = Math.hypot(dx, dz);
  // Stop close to target to avoid oscillation.
  if (length < 0.35) return { x: 0, z: 0 };
  const speed = effectiveSpeed(player);
  return { x: (dx / length) * speed, z: (dz / length) * speed };
};
