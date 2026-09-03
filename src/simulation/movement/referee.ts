import { attackDirection, PITCH, type GameState } from '../domain.ts'
import { clamp, distance } from '../math.ts'

export const updateReferee = (state: GameState, deltaSeconds: number) => {
  // Legacy or partial states may omit assistant referees, so movement initialises safe defaults.
  if (!state.referee.assistants) {
    state.referee.assistants = [
      { position: { x: -36.2, z: 0 }, velocity: { x: 0, z: 0 }, side: 'west' },
      { position: { x: 36.2, z: 0 }, velocity: { x: 0, z: 0 }, side: 'east' },
    ]
  }

  const phase = state.phase

  if (phase.kind === 'lineout') {
    const touchSide = phase.position.x < 0 ? -1 : 1
    // Tail position gives referee sightline through lineout tunnel toward thrower.
    const targetX = touchSide * 15.0
    const targetZ = phase.position.z
    const dx = targetX - state.referee.position.x
    const dz = targetZ - state.referee.position.z
    const dist = Math.hypot(dx, dz)
    if (dist > 0.3) {
      const speed = dist > 10 ? 7.8 : dist > 3 ? 5.8 : 3.5
      state.referee.velocity = {
        x: (dx / dist) * speed,
        z: (dz / dist) * speed,
      }
      state.referee.position.x += state.referee.velocity.x * deltaSeconds
      state.referee.position.z += state.referee.velocity.z * deltaSeconds
    } else {
      state.referee.velocity = { x: 0, z: 0 }
    }
    updateAssistantReferees(state, deltaSeconds)
    return
  }

  if (phase.kind === 'scrum') {
    // Tunnel-side position gives referee view of feed and front-row engagement.
    const targetX = clamp(phase.position.x + 2.2, -26, 26)
    const targetZ = phase.position.z
    const dx = targetX - state.referee.position.x
    const dz = targetZ - state.referee.position.z
    const dist = Math.hypot(dx, dz)
    if (dist > 0.3) {
      const speed = dist > 10 ? 7.8 : dist > 3 ? 5.8 : 3.5
      state.referee.velocity = {
        x: (dx / dist) * speed,
        z: (dz / dist) * speed,
      }
      state.referee.position.x += state.referee.velocity.x * deltaSeconds
      state.referee.position.z += state.referee.velocity.z * deltaSeconds
    } else {
      state.referee.velocity = { x: 0, z: 0 }
    }
    updateAssistantReferees(state, deltaSeconds)
    return
  }

  if (phase.kind === 'penalty' && phase.stage === 'decision') {
    // Penalty-mark position makes award location legible before choice is executed.
    const targetX = clamp(phase.position.x, -26, 26)
    const targetZ = phase.position.z
    const dx = targetX - state.referee.position.x
    const dz = targetZ - state.referee.position.z
    const dist = Math.hypot(dx, dz)
    if (dist > 0.3) {
      const speed = dist > 10 ? 7.8 : 5.2
      state.referee.velocity = {
        x: (dx / dist) * speed,
        z: (dz / dist) * speed,
      }
      state.referee.position.x += state.referee.velocity.x * deltaSeconds
      state.referee.position.z += state.referee.velocity.z * deltaSeconds
    } else {
      state.referee.velocity = { x: 0, z: 0 }
    }
    updateAssistantReferees(state, deltaSeconds)
    return
  }

  // Open-play trail line stays behind ball and opposite nearest touch side for broad sightline.
  const ballPos = state.ball.carrierId
    ? (state.players.find((p) => p.id === state.ball.carrierId)?.position ?? state.ball.position)
    : state.ball.position
  const attackDir = attackDirection(state.possessionTeam)

  const refSide = ballPos.x >= 0 ? -5.5 : 5.5
  const targetZ = clamp(ballPos.z - attackDir * 2.8, PITCH.tryLines.south + 3, PITCH.tryLines.north - 3)
  let targetX = clamp(ballPos.x + refSide, -28, 28)

  const carrier = state.players.find((p) => p.id === state.ball.carrierId)
  if (carrier && distance(carrier.position, state.referee.position) < 4.0) {
    targetX += carrier.position.x >= state.referee.position.x ? -4.5 : 4.5
  }

  const dx = targetX - state.referee.position.x
  const dz = targetZ - state.referee.position.z
  const dist = Math.hypot(dx, dz)
  if (dist > 0.4) {
    const speed = dist > 12 ? 7.2 : dist > 5 ? 5.2 : 3.0
    state.referee.velocity = {
      x: (dx / dist) * speed,
      z: (dz / dist) * speed,
    }
    state.referee.position.x += state.referee.velocity.x * deltaSeconds
    state.referee.position.z += state.referee.velocity.z * deltaSeconds
  } else {
    state.referee.velocity = { x: 0, z: 0 }
  }

  updateAssistantReferees(state, deltaSeconds)
}

const updateAssistantReferees = (state: GameState, deltaSeconds: number) => {
  if (!state.referee.assistants) return

  const phase = state.phase
  const isGoalKick = phase.kind === 'conversion' || (phase.kind === 'penalty' && phase.choice === 'goal')

  for (let i = 0; i < state.referee.assistants.length; i++) {
    const ar = state.referee.assistants[i]
    let targetX = ar.side === 'west' ? -36.2 : 36.2
    let targetZ = clamp(state.ball.position.z, PITCH.deadBallLines.south + 4, PITCH.deadBallLines.north - 4)

    if (isGoalKick) {
      // Assistants move behind posts to judge uprights and crossbar under Law 6.
      const kickingTeam = phase.kind === 'conversion' ? phase.kickingTeam : phase.awardedTeam
      const targetTryLine = kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south
      const teamDir = attackDirection(kickingTeam)
      targetX = ar.side === 'west' ? -3.5 : 3.5
      targetZ = targetTryLine + teamDir * 3.5
    }

    const dx = targetX - ar.position.x
    const dz = targetZ - ar.position.z
    const dist = Math.hypot(dx, dz)

    if (dist > 0.3) {
      const speed = dist > 15 ? 7.0 : dist > 5 ? 5.0 : 3.2
      ar.velocity = {
        x: (dx / dist) * speed,
        z: (dz / dist) * speed,
      }
      ar.position.x += ar.velocity.x * deltaSeconds
      ar.position.z += ar.velocity.z * deltaSeconds
    } else {
      ar.velocity = { x: 0, z: 0 }
    }
  }
}
