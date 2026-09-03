import type { GameState } from './domain.ts'

export const resetContactPlayers = (state: GameState) => {
  for (const player of state.players) player.ruckRecoverySeconds = 0
}
