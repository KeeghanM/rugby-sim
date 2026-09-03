import { attackDirection, type GameState, otherTeam, PITCH, ROLES, type Team } from '../domain.ts'
import { rerollTeamTactics } from '../teams/index.ts'
import { clamp, distance, effectiveSkill, GRAVITY } from '../math.ts'
import type { Random } from '../types.ts'
import { resetContactPlayers } from '../contact.ts'
import { GOAL_KICK_TIMEOUT_SECONDS, MATCH_CLOCK_RATE, goalKickTime } from './utils.ts'

export const scoreTry = (state: GameState, team: Team, random: Random = Math.random) => {
  resetContactPlayers(state)
  state.scores[team] += 5
  const carrier = state.players.find((p) => p.id === state.ball.carrierId)
  if (carrier) {
    carrier.stats.triesScored += 1
    carrier.lineBreakActive = false
  }
  const teamDir = attackDirection(team)
  const tryX = clamp(carrier?.position.x ?? 0, -28, 28)
  const tryZ = team === 0 ? PITCH.tryLines.north : PITCH.tryLines.south
  // Law 8 requires kick on line through grounding point; fixed 22-metre depth approximates chosen tee distance.
  const teeSpot = { x: tryX, z: clamp(tryZ - teamDir * 22, -48, 48) }

  const kicker =
    state.players.find((p) => p.team === team && p.role === ROLES.FlyHalf) ?? state.players.find((p) => p.team === team)

  // Keeping ball with scorer makes transition to tee visible before dead-ball kick.
  const ballCarrier = carrier ?? kicker ?? null
  state.ball = {
    position: ballCarrier
      ? { x: ballCarrier.position.x, y: 1.25, z: ballCarrier.position.z }
      : { x: teeSpot.x, y: 0.15, z: teeSpot.z },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: ballCarrier?.id ?? null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: team,
    passerId: null,
    kickerId: kicker?.id ?? null,
    kickOrigin: null,
    bouncesRemaining: 0,
  }
  state.pendingClearanceKickerId = null
  rerollTeamTactics(state, random)
  state.phase = {
    kind: 'conversion',
    stage: 'forming',
    position: teeSpot,
    kickingTeam: team,
    elapsed: 0,
    kickAtSeconds: goalKickTime(kicker, random),
    isSuccess: null,
    kickerId: kicker?.id ?? '',
  }
}

export const updateConversion = (state: GameState, deltaSeconds: number, random: Random) => {
  const phase = state.phase
  if (phase.kind !== 'conversion') return
  phase.elapsed += deltaSeconds

  const kicker =
    state.players.find((p) => p.id === phase.kickerId) ??
    state.players.find((p) => p.team === phase.kickingTeam && p.role === ROLES.FlyHalf) ??
    state.players.find((p) => p.team === phase.kickingTeam)

  if (state.ball.carrierId) {
    const carrier = state.players.find((p) => p.id === state.ball.carrierId)
    if (carrier && distance(carrier.position, phase.position) <= 1.5) {
      state.ball.carrierId = null
      state.ball.position = {
        x: phase.position.x,
        y: 0.15,
        z: phase.position.z,
      }
    }
  }

  // Law 8 keeps opponents behind goal line while conversion is prepared.
  if (phase.stage === 'forming') {
    const kickerInPlace = kicker && distance(kicker.position, phase.position) <= 2.2
    const teamDir = attackDirection(phase.kickingTeam)
    const defendingTryLine = phase.kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south
    const defendersBehindGoalLine = state.players
      .filter((p) => p.team !== phase.kickingTeam)
      .every((p) => (p.position.z - defendingTryLine) * teamDir >= -0.2)
    const allPlayersReady = state.players.every(
      (player) => player.intentKind.startsWith('conversion-') && distance(player.position, player.intentTarget) <= 2.5,
    )

    const ballAtTee = state.ball.carrierId === null
    const isFormed = ballAtTee && kickerInPlace && defendersBehindGoalLine && allPlayersReady

    if (!isFormed) return
    phase.stage = 'ready'
    phase.elapsed = 0
    return
  }

  if (phase.stage === 'ready') {
    const shotClockSeconds = phase.elapsed * MATCH_CLOCK_RATE
    const timedOut = shotClockSeconds >= GOAL_KICK_TIMEOUT_SECONDS
    if (shotClockSeconds < Math.min(phase.kickAtSeconds, GOAL_KICK_TIMEOUT_SECONDS)) return
    if (!kicker) return
    const teamDir = attackDirection(phase.kickingTeam)
    const targetTryLine = phase.kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south
    const anglePenalty = (Math.abs(phase.position.x) / 35) * 0.35
    const kickSkill = effectiveSkill(kicker, 'kicking')
    const successChance = clamp(0.3 + kickSkill * 0.68 - anglePenalty, 0.15, 0.96)
    const isSuccess = !timedOut && random() < successChance

    phase.isSuccess = isSuccess
    kicker.stamina = clamp(kicker.stamina - 0.4, 0, 100)
    kicker.stats.totalKicks += 1

    const targetX = isSuccess ? (random() - 0.5) * 2.6 : (Math.sign(phase.position.x) || 1) * (5.5 + random() * 4)
    // Target beyond posts keeps scored and missed flights visually continuous.
    const targetZ = targetTryLine + teamDir * (18 + random() * 8)
    const distToTarget = Math.abs(targetZ - phase.position.z)
    const duration = Math.max(1.8, distToTarget / 20)
    const peakHeight = isSuccess ? 7.5 + random() * 2.5 : 2.5 + random() * 2.5

    state.ball = {
      position: { x: phase.position.x, y: 0.2, z: phase.position.z },
      velocity: {
        x: (targetX - phase.position.x) / duration,
        y: (GRAVITY * duration) / 2 + peakHeight / duration,
        z: (targetZ - phase.position.z) / duration,
      },
      carrierId: null,
      flight: 'kick',
      intendedReceiverId: null,
      lastTouchedTeam: phase.kickingTeam,
      passerId: null,
      kickerId: kicker.id,
      kickOrigin: { ...phase.position },
      bouncesRemaining: 2,
    }

    phase.stage = 'inFlight'
    phase.elapsed = 0
    return
  }

  if (phase.stage === 'inFlight') {
    const teamDir = attackDirection(phase.kickingTeam)
    const targetTryLine = phase.kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south
    const hasReachedPosts = (state.ball.position.z - targetTryLine) * teamDir >= 0

    if (phase.isSuccess && hasReachedPosts) {
      state.scores[phase.kickingTeam] += 2
      if (kicker) kicker.stats.successfulKicks += 1
      phase.isSuccess = false // Clearing success flag prevents duplicate points on later flight ticks.
    }

    // Try sequence restarts with non-scoring team kicking from halfway after conversion flight.
    if (phase.elapsed >= 3.8 || (phase.elapsed >= 2.0 && state.ball.position.y <= 0.2)) {
      state.phase = {
        kind: 'kickoff',
        stage: 'forming',
        kickingTeam: otherTeam(phase.kickingTeam),
        readyForSeconds: 0,
        reason: 'try',
      }
    }
  }
}
