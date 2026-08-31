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

import { startRuck } from "./helpers.ts";

export const attemptTackle = (state: GameState, random: Random) => {
  const carrier = state.players.find(
    (player) => player.id === state.ball.carrierId,
  );
  // Abort when no current carrier exists.
  if (!carrier) return false;
  if (carrier.breakawaySeconds > 0) return false;
  const tackler = state.players
    .filter(
      (player) =>
        player.team !== carrier.team &&
        player.tackleCooldown === 0 &&
        distance(player.position, carrier.position) <= 1.4,
    )
    .sort(
      (a, b) =>
        distance(a.position, carrier.position) -
        distance(b.position, carrier.position),
    )[0];
  // Abort when no defender is close and ready enough to tackle.
  if (!tackler) return false;
  tackler.tackleCooldown = 0.5;
  tackler.stamina = Math.max(0, tackler.stamina - 1.5);

  const tacklerSkill = effectiveSkill(tackler, "tackling");
  const carrierSkill =
    effectiveSkill(carrier, "handling") * 0.7 +
    effectiveSkill(carrier, "decision") * 0.3;

  // 1. Offload in contact: if support runner is right behind, high handling skill allows offload before grounded
  const direction = attackDirection(carrier.team);
  const supportRunner = state.players.find(
    (p) =>
      p.team === carrier.team &&
      p.id !== carrier.id &&
      p.ruckRecoverySeconds === 0 &&
      distance(p.position, carrier.position) <= 3.5 &&
      (p.position.z - carrier.position.z) * direction <= 0.2,
  );
  if (
    supportRunner &&
    random() < carrierSkill * 0.26 * (1.15 - tacklerSkill * 0.45)
  ) {
    carrier.stamina = Math.max(0, carrier.stamina - 0.5);
    tackler.tackleCooldown = 1.0;
    launchBall(
      state,
      carrier,
      supportRunner.position,
      "pass",
      supportRunner.id,
      random,
    );
    return false;
  }

  // Resolve tackle as an opposed technique, physicality, and momentum contest.
  const carrierSpeed = Math.hypot(carrier.velocity.x, carrier.velocity.z);
  const tackleChance = clamp(
    0.78 +
      (tacklerSkill - carrierSkill) * 0.65 +
      (tackler.weight - carrier.weight) * 0.0015 -
      Math.max(0, carrierSpeed - 4.5) * 0.025,
    0.2,
    0.97,
  );
  if (random() >= tackleChance) {
    tackler.tackleCooldown = 1.2;
    tackler.stats.tacklesMissed += 1;
    carrier.stamina = Math.max(0, carrier.stamina - 0.8);
    carrier.breakawaySeconds = 1.2;
    return false;
  }

  // Poor technique also increases dangerous-tackle penalties.
  if (random() < 0.002 + (1 - tacklerSkill) ** 2 * 0.045) {
    tackler.tackleCooldown = 1.0;
    startPenalty(state, carrier.team, carrier.position, tackler, random);
    return true;
  }

  // Tackle made!
  tackler.stats.tacklesMade += 1;

  // In-goal contact: never form a ruck in in-goal!
  const isAttackingInGoal =
    carrier.team === 0
      ? carrier.position.z >= PITCH.tryLines.north
      : carrier.position.z <= PITCH.tryLines.south;
  if (isAttackingInGoal) {
    scoreTry(state, carrier.team, random);
    return true;
  }
  const isDefendingInGoal =
    carrier.team === 0
      ? carrier.position.z <= PITCH.tryLines.south
      : carrier.position.z >= PITCH.tryLines.north;
  if (isDefendingInGoal) {
    startGoalLineDropout(state, carrier.position.z);
    return true;
  }

  // 3. Completed tackle: carrier brought down into a ruck
  startRuck(state, carrier, tackler, random);
  return true;
};

// Releases won ruck ball through selected play.
