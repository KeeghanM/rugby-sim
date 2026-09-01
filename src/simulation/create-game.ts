import {
  attackDirection,
  type GameState,
  type MatchConfig,
  type MatchInput,
  type MatchTeamEntrants,
  type PlayerStats,
  type TeamMatchStats,
} from "../domain.ts";
import { ATTACK_FORMATION } from "../formations.ts";
import {
  BENCH_SLOTS,
  createMatchConfig,
  getPlayerProfile,
  rollTeamTactics,
} from "../teams/index.ts";
import type { Random } from "./types.ts";

const createInitialStats = (): PlayerStats => ({
  distanceCovered: 0,
  distanceCarried: 0,
  tacklesMade: 0,
  tacklesMissed: 0,
  triesScored: 0,
  lineBreaks: 0,
  successfulKicks: 0,
  totalKicks: 0,
  successfulPasses: 0,
  totalPasses: 0,
  penaltiesConceded: 0,
  knockOns: 0,
  forwardPasses: 0,
});

const createTeamStats = (): TeamMatchStats => ({
  rucksWon: 0,
  rucksLost: 0,
  maulsWon: 0,
  maulsLost: 0,
  scrumsWon: 0,
  scrumsLost: 0,
  lineoutsWon: 0,
  lineoutsLost: 0,
});

const defaultEntrants = (team: 0 | 1): MatchTeamEntrants => ({
  starters: ATTACK_FORMATION.map(
    (_, index) => `team-${team}-player-${index + 1}`,
  ),
  substitutes: BENCH_SLOTS.map((bench) => `team-${team}-sub-${bench.number}`),
});

export const createMatchInput = (
  teams: MatchConfig = createMatchConfig(),
  entrants: MatchInput["entrants"] = {
    0: defaultEntrants(0),
    1: defaultEntrants(1),
  },
): MatchInput => ({ teams, entrants });

const validateEntrants = (input: MatchInput) => {
  const ids = ([0, 1] as const).flatMap((team) => {
    const entrants = input.entrants[team];
    if (entrants.starters.length !== ATTACK_FORMATION.length) {
      throw new RangeError(`Team ${team} must provide 15 starters`);
    }
    if (entrants.substitutes.length !== BENCH_SLOTS.length) {
      throw new RangeError(`Team ${team} must provide 8 substitutes`);
    }
    return [...entrants.starters, ...entrants.substitutes];
  });
  if (ids.some((id) => !id.trim()))
    throw new RangeError("Player IDs are required");
  if (new Set(ids).size !== ids.length) {
    throw new RangeError("Player IDs must be unique within a match");
  }
};

export const createGame = (
  input: MatchInput = createMatchInput(),
  random: Random = Math.random,
): GameState => {
  validateEntrants(input);
  const gameTeams = createMatchConfig(input.teams);
  const team0Tactics = rollTeamTactics(0, random, gameTeams);
  const team1Tactics = rollTeamTactics(1, random, gameTeams);
  return {
    teams: gameTeams,
    players: ([0, 1] as const).flatMap((team) =>
      ATTACK_FORMATION.map((slot, index) => {
        const position = { x: slot.x, z: slot.z * attackDirection(team) };
        const profile = getPlayerProfile(team, index + 1, slot.role, gameTeams);
        return {
          id: `team-${team}-player-${index + 1}`,
          playerId: input.entrants[team].starters[index],
          started: true,
          team,
          number: index + 1,
          slotIndex: index,
          role: slot.role,
          pod: slot.pod,
          position,
          laneX: position.x,
          velocity: { x: 0, z: 0 },
          intentTarget: { ...position },
          intentKind: "kickoff-forming",
          intentForSeconds: 0,
          decisionForSeconds: 0,
          speed: profile.speed,
          weight: profile.weight,
          stamina: 100,
          injuryPenalty: 0,
          tackleCooldown: 0,
          breakawaySeconds: 0,
          hardLineForSeconds: 0,
          kickOffside: false,
          ruckRecoverySeconds: 0,
          lineBreakActive: false,
          pendingBallAction: null,
          skills: profile.skills,
          stats: createInitialStats(),
        };
      }),
    ),
    substitutes: ([0, 1] as const).flatMap((team) =>
      BENCH_SLOTS.map((bench, index) => {
        const profile = getPlayerProfile(
          team,
          bench.number,
          bench.role,
          gameTeams,
        );
        return {
          id: `team-${team}-sub-${bench.number}`,
          playerId: input.entrants[team].substitutes[index],
          started: false,
          team,
          number: bench.number,
          role: bench.role,
          pod: bench.pod,
          speed: profile.speed,
          weight: profile.weight,
          stamina: 100,
          skills: profile.skills,
          stats: createInitialStats(),
          isUsed: false,
        };
      }),
    ),
    recentSubstitution: null,
    ball: {
      position: { x: 0, y: 0.15, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      carrierId: null,
      flight: null,
      intendedReceiverId: null,
      lastTouchedTeam: null,
      passerId: null,
      kickerId: null,
      kickOrigin: null,
      bouncesRemaining: 0,
    },
    scores: [0, 0],
    phase: {
      kind: "kickoff",
      stage: "forming",
      kickingTeam: 1,
      readyForSeconds: 0,
      reason: "matchStart",
    },
    pendingClearanceKickerId: null,
    pendingLineoutTeam: null,
    defensiveLineZ: [-3, 3],
    attackFlow: [1, -1],
    formations: {
      0: team0Tactics.formations,
      1: team1Tactics.formations,
    },
    activeShapePositions: {
      0: team0Tactics.shapePositions,
      1: team1Tactics.shapePositions,
    },
    matchClockSeconds: 0,
    half: 1,
    referee: {
      position: { x: 6, z: 2 },
      velocity: { x: 0, z: 0 },
      assistants: [
        {
          position: { x: -36.2, z: 0 },
          velocity: { x: 0, z: 0 },
          side: "west",
        },
        { position: { x: 36.2, z: 0 }, velocity: { x: 0, z: 0 }, side: "east" },
      ],
    },
    phaseCount: 1,
    possessionTeam: 0,
    gainLineZ: 0,
    possessionOriginZ: 0,
    distanceGained: 0,
    teamStats: [createTeamStats(), createTeamStats()],
  };
};
