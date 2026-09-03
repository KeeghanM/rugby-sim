import { attackDirection, type GameState, type Player, type Position } from '../domain.ts'
import { distance, effectiveSkill, GRAVITY } from '../math.ts'
import type { Random } from '../types.ts'

export const launchBall = (
  state: GameState,
  carrier: Player,
  target: Position,
  flight: 'pass' | 'kick' | 'kickoff' | 'lineout' | 'grubber' | 'dropGoal',
  intendedReceiverId: string | null,
  random: Random = Math.random,
  origin: Position = carrier.position,
) => {
  const isKicking = flight === 'kick' || flight === 'kickoff' || flight === 'grubber' || flight === 'dropGoal'

  if (flight === 'pass' || flight === 'lineout') {
    carrier.stats.totalPasses += 1
  } else if (isKicking) {
    carrier.stats.totalKicks += 1
  }

  const skill = isKicking ? effectiveSkill(carrier, 'kicking') : effectiveSkill(carrier, 'passing')
  const error = (1 - skill) * (flight === 'pass' || flight === 'lineout' ? 5 : flight === 'grubber' ? 8 : 18)
  const actualTarget = {
    x: target.x + (random() - 0.5) * error,
    z: target.z + (random() - 0.5) * error,
  }
  const horizontalDistance = distance(origin, actualTarget)
  const isGrubber = flight === 'grubber'
  const duration =
    flight === 'pass' || flight === 'lineout'
      ? Math.max(0.35, horizontalDistance / 14)
      : isGrubber
        ? Math.max(0.65, horizontalDistance / 16)
        : flight === 'dropGoal'
          ? 1.8
          : 2.2
  // Half-gravity initial vertical speed makes non-grubbers return to launch height at chosen duration.
  state.ball = {
    position: { ...origin, y: isGrubber ? 0.35 : 1.25 },
    velocity: {
      x: (actualTarget.x - origin.x) / duration,
      y: isGrubber ? 1.4 : (GRAVITY * duration) / 2,
      z: (actualTarget.z - origin.z) / duration,
    },
    carrierId: null,
    flight,
    intendedReceiverId,
    lastTouchedTeam: carrier.team,
    passerId: flight === 'pass' || flight === 'lineout' ? carrier.id : null,
    kickerId: isKicking ? carrier.id : null,
    kickOrigin: isKicking ? { ...origin } : null,
    bouncesRemaining: isGrubber ? 4 : isKicking ? 2 : 0,
  }
  // Law 10 makes teammates ahead of kicker liable to sanction until put onside.
  if (isKicking) {
    const direction = attackDirection(carrier.team)
    for (const player of state.players) {
      player.kickOffside =
        player.team === carrier.team && player.id !== carrier.id && (player.position.z - origin.z) * direction > 0
    }
  }
}
