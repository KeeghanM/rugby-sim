import { attackDirection, type GameState, otherTeam, PITCH, type Player, ROLES } from '../domain.ts'
import { getKickoffTarget } from '../formations.ts'
import { launchBall } from '../ball.ts'
import { clamp, distance } from '../math.ts'
import type { Random } from '../types.ts'

export const updateKickoff = (state: GameState, deltaSeconds: number, random: Random) => {
  const phase = state.phase
  if (phase.kind !== 'kickoff') return
  const kickingTryLine = phase.kickingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north
  const restartPosition = {
    x: 0,
    z: phase.reason === 'goalLineDropout' ? kickingTryLine - attackDirection(phase.kickingTeam) * 0.5 : 0,
  }
  const targetFor = (player: Player) =>
    getKickoffTarget(
      player,
      phase.kickingTeam,
      phase.reason,
      state.formations[phase.kickingTeam].kickoffAttack,
      state.formations[player.team].kickoffDefence,
      state.activeShapePositions[player.team][player.team === phase.kickingTeam ? 'kickoffAttack' : 'kickoffDefence'],
    )
  const allPlayersReady = () => state.players.every((player) => distance(player.position, targetFor(player)) <= 2.5)
  if (phase.stage === 'forming') {
    phase.readyForSeconds += deltaSeconds
    state.ball.carrierId = null
    state.ball.flight = null
    state.ball.position = { ...restartPosition, y: 0.15 }
    state.ball.velocity = { x: 0, y: 0, z: 0 }
    const kicker = state.players.find((player) => player.team === phase.kickingTeam && player.role === ROLES.FlyHalf)
    const kickerTarget = kicker ? targetFor(kicker) : null
    const kickerReady = kicker && kickerTarget && distance(kicker.position, kickerTarget) <= 2.2

    const kickDir = attackDirection(phase.kickingTeam)
    const allKickingBehindTryLine = state.players
      .filter((player) => player.team === phase.kickingTeam)
      .every((player) => (player.position.z - kickingTryLine) * kickDir <= 0.2)

    // Goal-line dropout requires kicking side behind own goal line in this simplified Law 12 setup.
    const isGoalLine = phase.reason === 'goalLineDropout'
    const isFormed = isGoalLine
      ? kickerReady && allKickingBehindTryLine && allPlayersReady()
      : kickerReady && allPlayersReady()

    if (isFormed) {
      phase.stage = 'ready'
      phase.readyForSeconds = 0
    }
    return
  }
  if (phase.stage === 'ready') {
    phase.readyForSeconds += deltaSeconds
    // Preserve pre-kick pause so restart shape is visible.
    if (phase.readyForSeconds < 0.75) return
    if (!allPlayersReady()) {
      phase.stage = 'forming'
      phase.readyForSeconds = 0
      return
    }
    const kickDir = attackDirection(phase.kickingTeam)
    const allKickingBehindTryLine = state.players
      .filter((player) => player.team === phase.kickingTeam)
      .every((player) => (player.position.z - kickingTryLine) * kickDir <= 0.2)
    if (phase.reason === 'goalLineDropout' && !allKickingBehindTryLine) {
      return
    }
    const kicker = state.players.find((player) => player.team === phase.kickingTeam && player.role === ROLES.FlyHalf)
    if (!kicker) return
    const receivingTeam = otherTeam(phase.kickingTeam)
    const receivingDirection = attackDirection(receivingTeam)
    const receivingTryLine = receivingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north
    // Territorial target approximates Law 12 restart reaching ten metres without scripting receiver.
    const targetPosition =
      phase.reason === 'goalLineDropout'
        ? {
            x: (random() - 0.5) * 36,
            z: kickingTryLine + attackDirection(phase.kickingTeam) * (22 + random() * 10),
          }
        : {
            x: (random() - 0.5) * 44,
            z: receivingTryLine + receivingDirection * (10 + random() * 10),
          }
    kicker.stamina = clamp(kicker.stamina - 0.8, 0, 100)
    launchBall(state, kicker, targetPosition, 'kickoff', null, random, restartPosition)
    phase.stage = 'inFlight'
    return
  }
  if (state.ball.carrierId || state.ball.flight === null) {
    for (const player of state.players) player.laneX = player.position.x
    state.phase = { kind: 'openPlay' }
  }
}
