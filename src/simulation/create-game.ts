import {
  attackDirection,
  type GameState,
  type MatchConfig,
  type PlayerStats,
  type TeamMatchStats,
} from "../domain.ts";
import { ATTACK_FORMATION } from "../formations.ts";
import {
  BENCH_SLOTS,
  createMatchConfig,
  getPlayerProfile,
  rollTeamFormations,
} from "../teams.ts";
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

// Creates initial teams, bench substitutes, ball, score, kickoff, and defensive lines.
export const createGame = (
  teams: MatchConfig = createMatchConfig(),
  random: Random = Math.random,
): GameState => ({
  teams,
  players: ([0, 1] as const).flatMap((team) =>
    ATTACK_FORMATION.map((slot, index) => {
      const position = { x: slot.x, z: slot.z * attackDirection(team) };
      const profile = getPlayerProfile(team, index + 1, slot.role, teams);
      return {
        id: `team-${team}-player-${index + 1}`,
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
    BENCH_SLOTS.map((bench) => {
      const profile = getPlayerProfile(team, bench.number, bench.role, teams);
      return {
        id: `team-${team}-sub-${bench.number}`,
        team,
        number: bench.number,
        role: bench.role,
        pod: bench.pod,
        speed: profile.speed,
        weight: profile.weight,
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
    0: rollTeamFormations(0, random, teams),
    1: rollTeamFormations(1, random, teams),
  },
  matchClockSeconds: 0,
  half: 1,
  referee: {
    position: { x: 6, z: 2 },
    velocity: { x: 0, z: 0 },
  },
  phaseCount: 1,
  possessionTeam: 0,
  gainLineZ: 0,
  possessionOriginZ: 0,
  distanceGained: 0,
  teamStats: [createTeamStats(), createTeamStats()],
});
