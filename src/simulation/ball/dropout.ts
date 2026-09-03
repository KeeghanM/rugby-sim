import type { GameState, Team } from '../domain.ts'
import { resetContactPlayers } from '../contact.ts'

export const startGoalLineDropout = (state: GameState, z: number) => {
  resetContactPlayers(state)
  const defendingTeam: Team = z < 0 ? 0 : 1
  // Goal-line dropout is assigned to defending side; formation flow supplies replacement ball later.
  state.ball.carrierId = null
  state.pendingClearanceKickerId = null
  state.pendingLineoutTeam = null
  state.phase = {
    kind: 'kickoff',
    stage: 'forming',
    kickingTeam: defendingTeam,
    readyForSeconds: 0,
    reason: 'goalLineDropout',
  }
}
