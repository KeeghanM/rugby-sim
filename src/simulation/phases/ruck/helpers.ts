import {
  attackDirection,
  type GameState,
  otherTeam,
  PITCH,
  type Player,
  type Position,
  ROLES,
  type Team,
} from "../../../domain.ts";
import {
  getKickoffTarget,
  getLineoutTarget,
  getScrumTarget,
  isForward,
  LINEOUT_MEMBER_VARIANTS,
} from "../../../formations/index.ts";
import {
  getActiveShapePositions,
  rollTeamFormations,
} from "../../../teams/index.ts";
import { carryBall, launchBall, startGoalLineDropout } from "../../ball.ts";
import { scoreTry } from "../conversion.ts";
import { startPenalty } from "../penalty.ts";
import { groupStrength, teamDecision } from "../utils.ts";
import {
  clamp,
  contactStrength,
  distance,
  effectiveSkill,
  GRAVITY,
  insideOwnTwentyTwo,
  overallSkill,
} from "../../math.ts";
import type { Random } from "../../types.ts";

// Selects nearest players to target a ruck.
// If ruck has <= 2 players, ANY nearby player (backs or forwards) hits it.
// If 3+ players already in ruck, only forwards will join.
const selectRuckTargeters = (
  state: GameState,
  team: Team,
  position: Position,
  targetCount: number,
  excludeIds: Set<string>,
  joinedCount: number,
) => {
  const candidates = state.players
    .filter(
      (player) =>
        player.team === team &&
        !excludeIds.has(player.id) &&
        player.role !== ROLES.ScrumHalf,
    )
    .map((player) => {
      const dist = distance(player.position, position);
      const forwardBonus = joinedCount < 3 ? 0 : isForward(player) ? 0 : 15;
      return { player, score: dist + forwardBonus, dist };
    })
    .filter(({ dist, score }) => dist <= 16 && score < 25)
    .sort((a, b) => a.score - b.score);

  return candidates.slice(0, targetCount).map(({ player }) => player.id);
};

// Chooses next ruck play from field position and team tendencies.
export const chooseRuckPlay = (
  state: GameState,
  team: Team,
  position: Position,
  random: Random,
) => {
  const tendencies = state.teams[team].tendencies;
  const inOwnTwentyTwo = insideOwnTwentyTwo(team, position.z);
  const nine = state.players.find(
    (player) => player.team === team && player.role === ROLES.ScrumHalf,
  );
  const ten = state.players.find(
    (player) => player.team === team && player.role === ROLES.FlyHalf,
  );
  const decision = Math.max(
    nine ? effectiveSkill(nine, "decision") : 0,
    ten ? effectiveSkill(ten, "decision") : 0,
  );
  const boxSkill = nine ? effectiveSkill(nine, "kicking") : 0;
  const clearanceSkill = Math.max(
    boxSkill,
    ten ? effectiveSkill(ten, "kicking") : 0,
  );
  const weights = {
    pickAndGo:
      tendencies.carry * (inOwnTwentyTwo ? 0.7 + (1 - decision) * 0.6 : 0.45),
    pass: tendencies.pass * (inOwnTwentyTwo ? 0.7 + decision * 0.4 : 1),
    boxKick: tendencies.kick * (inOwnTwentyTwo ? 0.45 + boxSkill * 0.55 : 1),
    clearance: inOwnTwentyTwo
      ? tendencies.kick * (0.25 + clearanceSkill * 0.9) * (0.4 + decision * 0.6)
      : 0,
  };
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  roll -= weights.pickAndGo;
  if (roll < 0) return "pickAndGo" as const;
  roll -= weights.pass;
  if (roll < 0) return "pass" as const;
  roll -= weights.boxKick;
  if (roll < 0) return "boxKick" as const;
  if (weights.clearance > 0) return "clearance" as const;
  return "pass" as const;
};

// Converts successful tackle into initialized ruck state.
export const startRuck = (
  state: GameState,
  carrier: Player,
  tackler: Player,
  random: Random,
) => {
  carrier.pendingBallAction = null;
  carrier.lineBreakActive = false;

  // Law 14: Tackler must immediately release and roll away laterally from the ball/gate
  const rollLateral = tackler.position.x >= carrier.position.x ? 1.6 : -1.6;
  const defDir = attackDirection(tackler.team);
  tackler.position.x = clamp(tackler.position.x + rollLateral, -33, 33);
  tackler.position.z = clamp(tackler.position.z + defDir * 0.8, -58, 58);
  tackler.ruckRecoverySeconds = 1.0; // rolling away and returning to feet

  // Tackled carrier stays on ground presenting the ball
  carrier.ruckRecoverySeconds = 999;

  const initialJoinedAttackers = [carrier.id];
  const initialJoinedDefenders: string[] = []; // tackler rolled away; cleaners arrive through gate
  const joinOrder = [carrier.id];

  const excludeSet = new Set([carrier.id, tackler.id]);
  const attackers = [
    carrier.id,
    ...selectRuckTargeters(
      state,
      carrier.team,
      carrier.position,
      2,
      excludeSet,
      2,
    ),
  ];
  const defenders = [
    ...selectRuckTargeters(
      state,
      otherTeam(carrier.team),
      carrier.position,
      2,
      excludeSet,
      2,
    ),
  ];

  state.ball = {
    position: { ...carrier.position, y: 0.15 },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: carrier.team,
    passerId: null,
    kickerId: null,
    kickOrigin: null,
    bouncesRemaining: 0,
  };

  state.phase = {
    kind: "ruck",
    stage: "arrivals",
    position: { ...carrier.position },
    attackingTeam: carrier.team,
    tempo:
      random() < 0.2 + effectiveSkill(carrier, "decision") * 0.6
        ? "quick"
        : "slow",
    play: chooseRuckPlay(state, carrier.team, carrier.position, random),
    counterRuck: false,
    winningTeam: null,
    elapsed: 0,
    attackers,
    defenders,
    joinedAttackers: initialJoinedAttackers,
    joinedDefenders: initialJoinedDefenders,
    tackledPlayerId: carrier.id,
    tacklerId: tackler.id,
    joinOrder,
  };

  // Reverse phase direction only when contact reaches current touch-side limit.
  if (carrier.position.x <= -25) state.attackFlow[carrier.team] = 1;
  if (carrier.position.x >= 25) state.attackFlow[carrier.team] = -1;
  // Roll dynamic tactical structures for next phase with team default preference
  state.formations[0] = rollTeamFormations(0, random, state.teams);
  state.formations[1] = rollTeamFormations(1, random, state.teams);
};

// Attempts nearest eligible defender's tackle against carrier, resolving tackle breaks and offloads
