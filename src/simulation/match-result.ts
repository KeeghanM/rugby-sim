import type { GameState, MatchResult } from "../domain.ts";

export const SIMULATION_VERSION = 1;

export const createMatchResult = (
  state: GameState,
  seed: number,
): MatchResult => ({
  simulationVersion: SIMULATION_VERSION,
  seed,
  score: [...state.scores],
  players: [...state.players, ...state.substitutes].map((player) => ({
    playerId: player.playerId,
    team: player.team,
    number: player.number,
    role: player.role,
    started: player.started,
    stats: { ...player.stats },
  })),
  teamStats: state.teamStats.map((stats) => ({
    ...stats,
  })) as MatchResult["teamStats"],
});
