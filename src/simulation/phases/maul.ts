import { attackDirection, type GameState, otherTeam, PITCH, type Player, ROLES, type Team } from '../domain.ts'
import { isForward } from '../formations.ts'
import { carryBall } from '../ball.ts'
import { scoreTry } from './conversion.ts'
import { startPenalty } from './penalty.ts'
import { groupStrength, teamDecision } from './utils.ts'
import { clamp, distance, overallSkill } from '../math.ts'
import type { Random } from '../types.ts'

export const startMaul = (state: GameState, carrier: Player) => {
  // Five nearest forwards per side approximate bound support around ball carrier under Law 16.
  const nearestForwards = (team: Team) =>
    state.players
      .filter(
        (player) => player.team === team && isForward(player) && distance(player.position, carrier.position) <= 12,
      )
      .sort((a, b) => distance(a.position, carrier.position) - distance(b.position, carrier.position))
      .slice(0, 5)
      .map((player) => player.id)

  const attackers = nearestForwards(carrier.team)
  if (!attackers.includes(carrier.id)) attackers.unshift(carrier.id)
  state.phase = {
    kind: 'maul',
    stage: 'forming',
    position: { ...carrier.position },
    attackingTeam: carrier.team,
    elapsed: 0,
    attackers,
    defenders: nearestForwards(otherTeam(carrier.team)),
    driveSpeed: 0,
    winningTeam: null,
  }
}

export const updateMaul = (state: GameState, deltaSeconds: number, random: Random) => {
  const phase = state.phase
  if (phase.kind !== 'maul') return
  phase.elapsed += deltaSeconds

  if (phase.stage === 'forming') {
    if (phase.elapsed < 1) return
    const attackStrength = groupStrength(state, phase.attackers, 'handling')
    const defenceStrength = groupStrength(state, phase.defenders)
    const attackScore = attackStrength * (0.85 + random() * 0.3) * 1.08
    const defenceScore = defenceStrength * (0.85 + random() * 0.3)
    const turnoverProb = clamp(
      0.22 + ((defenceStrength - attackStrength) / Math.max(1, attackStrength)) * 0.45,
      0.08,
      0.65,
    )
    phase.winningTeam = random() < turnoverProb ? otherTeam(phase.attackingTeam) : phase.attackingTeam
    // Throwing side receives small formation advantage before random contest variation.
    phase.driveSpeed =
      phase.winningTeam === phase.attackingTeam
        ? clamp(0.35 + ((attackScore - defenceScore) / Math.max(1, attackStrength)) * 1.6, 0.2, 1.8)
        : 0
    state.teamStats[phase.winningTeam].maulsWon += 1
    state.teamStats[otherTeam(phase.winningTeam)].maulsLost += 1

    const losingTeam = otherTeam(phase.winningTeam)
    const collapseChance = 0.015 + (1 - teamDecision(state, losingTeam)) * 0.04
    // Law 16 forbids intentional collapse; poorer collective decisions increase infringement risk.
    if (random() < collapseChance) {
      const offender = state.players.find(
        (player) => player.team === losingTeam && [...phase.attackers, ...phase.defenders].includes(player.id),
      )
      startPenalty(state, phase.winningTeam, phase.position, offender, random)
      return
    }
    phase.stage = 'driving'
    phase.elapsed = 0
    return
  }

  if (phase.stage === 'driving') {
    if (phase.winningTeam === phase.attackingTeam) {
      phase.position.z = clamp(
        phase.position.z + attackDirection(phase.attackingTeam) * phase.driveSpeed * deltaSeconds,
        PITCH.deadBallLines.south,
        PITCH.deadBallLines.north,
      )
      const carrier = state.players.find((player) => player.id === state.ball.carrierId)
      if (carrier) {
        carrier.position = { ...phase.position }
        state.ball.position = { ...phase.position, y: 1.25 }
      }
      const scored =
        phase.attackingTeam === 0 ? phase.position.z >= PITCH.tryLines.north : phase.position.z <= PITCH.tryLines.south
      if (scored) {
        scoreTry(state, phase.attackingTeam, random)
        return
      }
    }
    if (phase.elapsed < 3.5) return
    // Fixed drive window approximates use-it release without modelling referee calls.
    phase.stage = 'release'
    phase.elapsed = 0
    return
  }

  if (phase.elapsed < 0.6) return
  const winningTeam = phase.winningTeam ?? phase.attackingTeam
  // Winning side prefers scrum-half to release ball; nearest teammate prevents stalled maul.
  const receiver =
    state.players.find((player) => player.team === winningTeam && player.role === ROLES.ScrumHalf) ??
    state.players
      .filter((player) => player.team === winningTeam)
      .sort((a, b) => distance(a.position, phase.position) - distance(b.position, phase.position))[0]
  for (const id of [...phase.attackers, ...phase.defenders]) {
    const player = state.players.find((candidate) => candidate.id === id)
    if (player) player.ruckRecoverySeconds = 1.5 * (1.3 - overallSkill(player) * 0.55)
  }
  if (receiver) {
    receiver.position = {
      x: phase.position.x,
      z: phase.position.z - attackDirection(winningTeam) * 1.5,
    }
    carryBall(state, receiver)
  }
  state.phase = { kind: 'openPlay' }
}
