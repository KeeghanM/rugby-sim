import type { GameState, Player, Team } from '../domain.ts'
import { contactStrength, effectiveSkill } from '../math.ts'
import type { Random } from '../types.ts'
export { MATCH_CLOCK_RATE } from '../constants.ts'

export const GOAL_KICK_TIMEOUT_SECONDS = 30
// Kicking skill shortens setup while random variation avoids identical shot routines.
export const goalKickTime = (kicker: Player | undefined, random: Random) =>
  20 + Math.floor(random() * 10) + Math.max(0, 0.5 - (kicker ? effectiveSkill(kicker, 'kicking') : 0)) * 10

export const groupStrength = (state: GameState, ids: string[], primary: keyof Player['skills'] = 'tackling') =>
  // Summed contact strength makes extra committed bodies valuable in collective contests.
  ids.reduce((total, id) => {
    const player = state.players.find((candidate) => candidate.id === id)
    return total + (player ? contactStrength(player, primary) : 0)
  }, 0)

export const teamDecision = (state: GameState, team: Team) => {
  // Mean decision skill approximates collective discipline for team-level infringement checks.
  const players = state.players.filter((player) => player.team === team)
  return players.reduce((total, player) => total + effectiveSkill(player, 'decision'), 0) / Math.max(1, players.length)
}
