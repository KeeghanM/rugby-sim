import { PITCH, type Player, type Position, type Team } from './domain.ts'
import type { Effort } from './types.ts'

export { clamp } from '../lib/math.ts'

export const GRAVITY = 9.81

// Vertical ball height is excluded because player spacing lives on pitch plane.
export const distance = (a: Position, b: Position) => Math.hypot(a.x - b.x, a.z - b.z)

export const overallSkill = (player: Pick<Player, 'skills' | 'stamina'>) =>
  // Stamina scales broad ability from a 70% fatigue floor to full effectiveness.
  (Object.values(player.skills).reduce((total, skill) => total + skill, 0) / Object.keys(player.skills).length) *
  (0.7 + (player.stamina / 100) * 0.3)

// Effort sets gait while stamina and injury convert rated pace into match speed.
export const effectiveSpeed = (player: Player, effort: Effort) => {
  const effortMultiplier = effort === 'sprint' ? 1.28 : effort === 'run' ? 1 : effort === 'jog' ? 0.62 : 0
  const staminaMultiplier = 0.65 + (player.stamina / 100) * 0.35
  return Math.max(0, player.speed * effortMultiplier * staminaMultiplier - player.injuryPenalty)
}

// Fatigue reduces execution linearly but retains a 70% floor so tired players remain functional.
export const effectiveSkill = (player: Player, skill: keyof Player['skills']) =>
  player.skills[skill] * (0.7 + (player.stamina / 100) * 0.3)

// Heavier players lose more recoverable capacity over 80 minutes, bounded by a 45-point floor.
export const maxStamina = (player: Player, matchClockSeconds: number) => {
  const timeProgress = Math.min(1, matchClockSeconds / 4800)
  const weightFatigue = (player.weight / 100) * 22
  return Math.max(45, 100 - timeProgress * weightFatigue)
}

export const contactStrength = (player: Player, primary: keyof Player['skills'] = 'tackling') => {
  // Contact combines role-relevant technique with mass and a steeper fatigue penalty than open-play skill.
  const technique = effectiveSkill(player, primary) * 0.7 + overallSkill(player) * 0.3
  const fatigue = 0.45 + (player.stamina / 100) * 0.55
  return player.weight * fatigue * (0.6 + technique * 0.45)
}

// Team-relative sign handling maps both ends of pitch to same own-22 question.
export const insideOwnTwentyTwo = (team: Team, z: number) =>
  team === 0 ? z <= PITCH.twentyTwoMetreLines.south : z >= PITCH.twentyTwoMetreLines.north

// Direction is normalised so target distance does not change commanded top speed.
export const desiredVelocity = (player: Player, target: Position, effort: Effort): Position => {
  const dx = target.x - player.position.x
  const dz = target.z - player.position.z
  const length = Math.hypot(dx, dz)
  // Ten-centimetre dead zone prevents velocity jitter at target.
  if (length < 0.1) return { x: 0, z: 0 }
  const maxSpeed = effectiveSpeed(player, effort)
  // Two-metre linear braking radius prevents overshoot without simulating acceleration control.
  const speed = length < 2.0 ? maxSpeed * (length / 2.0) : maxSpeed
  return { x: (dx / length) * speed, z: (dz / length) * speed }
}
