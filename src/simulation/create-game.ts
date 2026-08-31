import { attackDirection, type GameState } from "../domain.ts";
import { ATTACK_FORMATION } from "../formations.ts";
import { getPlayerProfile, rollTeamFormations } from "../teams.ts";

// Creates initial teams, ball, score, kickoff, and defensive lines.
export const createGame = (): GameState => ({
  players: ([0, 1] as const).flatMap((team) =>
    ATTACK_FORMATION.map((slot, index) => {
      const position = { x: slot.x, z: slot.z * attackDirection(team) };
      const profile = getPlayerProfile(team, index + 1, slot.role);
      return {
        id: `team-${team}-player-${index + 1}`,
        team,
        number: index + 1,
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
        hardLineForSeconds: 0,
        kickOffside: false,
        ruckRecoverySeconds: 0,
        pendingBallAction: null,
        skills: profile.skills,
      };
    }),
  ),
  ball: {
    position: { x: 0, y: 0.15, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: null,
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
  defensiveLineZ: [-3, 3],
  attackFlow: [1, -1],
  formations: {
    0: rollTeamFormations(0),
    1: rollTeamFormations(1),
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
});
