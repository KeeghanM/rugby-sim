import { attackDirection, type GameState, PITCH, type Player, ROLES } from '../../domain.ts'
import { carryBall, launchBall } from '../../ball.ts'
import { clamp, distance, overallSkill } from '../../math.ts'
import type { Random } from '../../types.ts'

export const executeRuckPlay = (state: GameState, random: Random) => {
  const phase = state.phase
  if (phase.kind !== 'ruck') return
  const team = phase.winningTeam ?? phase.attackingTeam
  const isAvailable = (p: Player) =>
    !phase.joinedAttackers.includes(p.id) &&
    !phase.joinedDefenders.includes(p.id) &&
    p.id !== phase.tackledPlayerId &&
    p.id !== phase.tacklerId

  // Scrum-half distributes by default; nearest free teammate prevents stalled ruck when nine is committed.
  const preferredHalf = state.players.find((p) => p.team === team && p.role === ROLES.ScrumHalf && isAvailable(p))
  const distributor =
    preferredHalf ??
    state.players
      .filter((p) => p.team === team && isAvailable(p))
      .sort((a, b) => distance(a.position, phase.position) - distance(b.position, phase.position))[0]
  if (!distributor) return

  // Distributor is snapped to simulated hindmost foot after availability stage has completed approach.
  const teamDir = attackDirection(team)
  distributor.position.x = phase.position.x
  distributor.position.z = clamp(
    phase.position.z - teamDir * 1.1,
    PITCH.deadBallLines.south + 1,
    PITCH.deadBallLines.north - 1,
  )
  distributor.velocity = { x: 0, z: 0 }

  // Reverse release ordering lets last joiner peel first, then earlier cleaners, with tackled player last.
  const reversedJoiners = [...phase.joinOrder].reverse()
  reversedJoiners.forEach((playerId, index) => {
    const player = state.players.find((p) => p.id === playerId)
    if (player && playerId !== phase.tackledPlayerId) {
      player.ruckRecoverySeconds = (0.6 + index * 0.6) * (1.2 - overallSkill(player) * 0.4)
    }
  })

  const tackledPlayer = state.players.find((p) => p.id === phase.tackledPlayerId)
  if (tackledPlayer) {
    tackledPlayer.ruckRecoverySeconds = 1.8 + reversedJoiners.length * 0.4
  }

  // Non-joiners must lose sentinel recovery lock when ruck ends.
  for (const player of state.players) {
    if (
      !phase.joinOrder.includes(player.id) &&
      player.id !== phase.tackledPlayerId &&
      player.id !== phase.tacklerId &&
      player.ruckRecoverySeconds > 50
    ) {
      player.ruckRecoverySeconds = 0
    }
  }

  // Retained possession increments phase count; turnover resets possession and gain-line origin.
  if (team === state.possessionTeam) {
    state.phaseCount += 1
    state.gainLineZ = phase.position.z
  } else {
    state.possessionTeam = team
    state.phaseCount = 1
    state.possessionOriginZ = phase.position.z
    state.gainLineZ = phase.position.z
    state.distanceGained = 0
  }

  if (phase.play === 'pickAndGo') {
    const runner = state.players
      .filter((player) => player.team === team && isAvailable(player))
      .sort((a, b) => distance(a.position, phase.position) - distance(b.position, phase.position))[0]
    if (runner) {
      runner.stamina = clamp(runner.stamina - 0.3, 0, 100)
      carryBall(state, runner)
    } else {
      carryBall(state, distributor)
    }
  } else if (phase.play === 'boxKick') {
    // Box kick aims 28 to 36 metres ahead with lateral uncertainty for contestability.
    distributor.stamina = clamp(distributor.stamina - 0.8, 0, 100)
    launchBall(
      state,
      distributor,
      {
        x: clamp(distributor.position.x + (random() - 0.5) * 12, -30, 30),
        z: distributor.position.z + attackDirection(team) * (28 + random() * 8),
      },
      'kick',
      null,
      random,
    )
  } else {
    // Fly-half is preferred receiver; nearest available teammate prevents deadlock.
    const receiver = state.players
      .filter((player) => player.team === team && player.id !== distributor.id && isAvailable(player))
      .sort((a, b) => {
        const aFly = a.role === ROLES.FlyHalf ? 0 : 1
        const bFly = b.role === ROLES.FlyHalf ? 0 : 1
        return aFly - bFly || distance(a.position, phase.position) - distance(b.position, phase.position)
      })[0]
    if (receiver) {
      distributor.stamina = clamp(distributor.stamina - 0.25, 0, 100)
      launchBall(state, distributor, receiver.position, 'pass', receiver.id, random)
      if (phase.play === 'clearance') state.pendingClearanceKickerId = receiver.id
    } else {
      carryBall(state, distributor)
    }
  }
  state.phase = { kind: 'openPlay' }
}
