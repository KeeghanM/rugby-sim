import type { GameState, MatchConfig, Team } from "./domain.ts";
import { createMatchConfig, setStats, setTactics } from "./teams/index.ts";
import { computeCommands } from "./simulation/decisions/index.ts";
import { createGame } from "./simulation/create-game.ts";
import {
  advanceDefensiveLine,
  applyCommands,
} from "./simulation/movement/index.ts";
import type { Random } from "./simulation/types.ts";

export { createGame } from "./simulation/create-game.ts";
export { computeCommands } from "./simulation/decisions/index.ts";
export { applyCommands } from "./simulation/movement/index.ts";
export { createMatchConfig, setStats, setTactics } from "./teams/index.ts";
export type { MatchConfig, TeamDefinition, TeamMatchStats } from "./domain.ts";
export type { TeamStatsInput, TeamTacticsInput } from "./teams/index.ts";
export type { PlayerCommand } from "./simulation/types.ts";

// Reverse lateral attack flow when current carrier reaches either touch-side channel.
const updateAttackFlow = (state: GameState) => {
  const carrier = state.players.find(
    (player) => player.id === state.ball.carrierId,
  );
  // Preserve current flow while ball is loose or inside central field.
  if (!carrier) return;
  // Turn attack back right before left touchline removes passing space.
  if (carrier.position.x <= -25) state.attackFlow[carrier.team] = 1;
  // Turn attack back left before right touchline removes passing space.
  if (carrier.position.x >= 25) state.attackFlow[carrier.team] = -1;
};

export const updateGame = (
  state: GameState,
  deltaSeconds: number,
  random: Random = Math.random,
) => {
  updateAttackFlow(state);
  advanceDefensiveLine(state, deltaSeconds);
  applyCommands(state, computeCommands(state, random), deltaSeconds, random);
};

export const createSeededRandom = (seed: number): Random => {
  let value = seed >>> 0;
  return () => {
    // Mulberry32 mixing maps each 32-bit state to a reproducible uniform fraction in [0, 1).
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

export type SimulateMatchOptions = {
  teams?: MatchConfig;
  seed?: number;
  stepSeconds?: number;
  maxTicks?: number;
};

export const simulateMatch = ({
  teams = createMatchConfig(),
  seed = Date.now(),
  stepSeconds = 0.05,
  maxTicks = 250_000,
}: SimulateMatchOptions = {}) => {
  if (!(stepSeconds > 0) || !Number.isFinite(stepSeconds)) {
    throw new RangeError("stepSeconds must be a positive finite number");
  }
  if (!(maxTicks > 0) || !Number.isFinite(maxTicks)) {
    throw new RangeError("maxTicks must be a positive finite number");
  }
  const random = createSeededRandom(seed);
  const state = createGame(teams, random);
  let ticks = 0;
  while (state.half !== "fullTime" && ticks < maxTicks) {
    updateGame(state, stepSeconds, random);
    ticks += 1;
  }
  if (state.half !== "fullTime") {
    throw new Error(`Match failed to finish after ${maxTicks} ticks`);
  }
  return state;
};

export type MonteCarloSummary = {
  matches: number;
  wins: [number, number];
  draws: number;
  averageScore: [number, number];
  tries: [number, number];
  knockOns: [number, number];
  tackleCompletion: [number, number];
  contestWinRate: Record<
    "ruck" | "maul" | "scrum" | "lineout",
    [number, number]
  >;
};

const ratio = (won: number, lost: number) =>
  // Empty samples report zero rather than producing NaN in Monte Carlo summaries.
  won + lost === 0 ? 0 : won / (won + lost);

export const simulateMonteCarlo = (
  matches: number,
  options: Omit<SimulateMatchOptions, "seed"> & { seed?: number } = {},
): MonteCarloSummary => {
  if (!(matches > 0) || !Number.isFinite(matches)) {
    throw new RangeError("matches must be a positive finite number");
  }
  const count = Math.max(1, Math.floor(matches));
  const wins: [number, number] = [0, 0];
  const scores: [number, number] = [0, 0];
  const tries: [number, number] = [0, 0];
  const knockOns: [number, number] = [0, 0];
  const tacklesMade: [number, number] = [0, 0];
  const tacklesMissed: [number, number] = [0, 0];
  const contests = {
    ruck: [
      [0, 0],
      [0, 0],
    ],
    maul: [
      [0, 0],
      [0, 0],
    ],
    scrum: [
      [0, 0],
      [0, 0],
    ],
    lineout: [
      [0, 0],
      [0, 0],
    ],
  } as Record<
    "ruck" | "maul" | "scrum" | "lineout",
    [[number, number], [number, number]]
  >;
  let draws = 0;

  for (let index = 0; index < count; index += 1) {
    const state = simulateMatch({
      ...options,
      seed: (options.seed ?? 1) + index,
    });
    scores[0] += state.scores[0];
    scores[1] += state.scores[1];
    if (state.scores[0] === state.scores[1]) draws += 1;
    else wins[state.scores[0] > state.scores[1] ? 0 : 1] += 1;

    for (const team of [0, 1] as const) {
      const players = [
        ...state.players.filter((player) => player.team === team),
        ...state.substitutes.filter((player) => player.team === team),
      ];
      tries[team] += players.reduce(
        (total, player) => total + player.stats.triesScored,
        0,
      );
      knockOns[team] += players.reduce(
        (total, player) => total + player.stats.knockOns,
        0,
      );
      tacklesMade[team] += players.reduce(
        (total, player) => total + player.stats.tacklesMade,
        0,
      );
      tacklesMissed[team] += players.reduce(
        (total, player) => total + player.stats.tacklesMissed,
        0,
      );
      const teamStats = state.teamStats[team];
      for (const contest of Object.keys(
        contests,
      ) as (keyof typeof contests)[]) {
        const prefix = `${contest}s` as
          "rucks" | "mauls" | "scrums" | "lineouts";
        contests[contest][team][0] += teamStats[`${prefix}Won`];
        contests[contest][team][1] += teamStats[`${prefix}Lost`];
      }
    }
  }

  const contestWinRate = Object.fromEntries(
    (Object.keys(contests) as (keyof typeof contests)[]).map((contest) => [
      contest,
      [ratio(...contests[contest][0]), ratio(...contests[contest][1])],
    ]),
  ) as MonteCarloSummary["contestWinRate"];

  return {
    matches: count,
    wins,
    draws,
    averageScore: [scores[0] / count, scores[1] / count],
    tries,
    knockOns,
    tackleCompletion: [
      ratio(tacklesMade[0], tacklesMissed[0]),
      ratio(tacklesMade[1], tacklesMissed[1]),
    ],
    contestWinRate,
  };
};
