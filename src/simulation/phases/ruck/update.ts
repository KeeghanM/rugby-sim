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

import { executeRuckPlay } from "./execute.ts";
import { chooseRuckPlay } from "./helpers.ts";

export const updateRuck = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  if (phase.kind !== "ruck") return;
  phase.elapsed += deltaSeconds;

  const joinedCount =
    phase.joinedAttackers.length + phase.joinedDefenders.length;

  // 1. Process players reaching the ruck mark to join
  for (const player of state.players) {
    if (player.id === phase.tackledPlayerId || player.id === phase.tacklerId)
      continue;
    const distToRuck = distance(player.position, phase.position);

    const isAttacking = player.team === phase.attackingTeam;
    const isTargeting = isAttacking
      ? phase.attackers.includes(player.id)
      : phase.defenders.includes(player.id);
    const isAlreadyJoined = isAttacking
      ? phase.joinedAttackers.includes(player.id)
      : phase.joinedDefenders.includes(player.id);

    // Anyone close (<= 1.6m) hits the ruck if ruck has few players (< 3) or if they were targeting it
    const shouldJoin =
      !isAlreadyJoined && distToRuck <= 1.6 && (isTargeting || joinedCount < 3);

    if (shouldJoin) {
      if (isAttacking) {
        phase.joinedAttackers.push(player.id);
        if (!phase.attackers.includes(player.id))
          phase.attackers.push(player.id);
      } else {
        phase.joinedDefenders.push(player.id);
        if (!phase.defenders.includes(player.id))
          phase.defenders.push(player.id);
      }
      phase.joinOrder.push(player.id);
      player.ruckRecoverySeconds = 999;
    }
  }

  // 2. Stage arrivals: evaluate ruck contest & turnover
  if (phase.stage === "arrivals") {
    const attackersArrived = phase.joinedAttackers.filter(
      (id) => id !== phase.tackledPlayerId,
    ).length;
    const defendersArrived = phase.joinedDefenders.filter(
      (id) => id !== phase.tacklerId,
    ).length;
    const arrivalsTimeout =
      phase.elapsed >= (phase.tempo === "quick" ? 1.0 : 2.2);

    if (arrivalsTimeout || (attackersArrived >= 1 && defendersArrived >= 1)) {
      // Breakdown penalty check (holding on vs not releasing/hands in ruck)
      const attackError =
        0.01 + (1 - teamDecision(state, phase.attackingTeam)) * 0.045;
      const defenceError =
        0.01 +
        (1 - teamDecision(state, otherTeam(phase.attackingTeam))) * 0.045;
      if (random() < (attackError + defenceError) / 2) {
        const isAttackerInfraction =
          random() < attackError / (attackError + defenceError);
        if (isAttackerInfraction) {
          const carrier = state.players.find(
            (p) => p.id === phase.tackledPlayerId,
          );
          startPenalty(
            state,
            otherTeam(phase.attackingTeam),
            phase.position,
            carrier,
            random,
          );
        } else {
          const tackler = state.players.find((p) => p.id === phase.tacklerId);
          startPenalty(
            state,
            phase.attackingTeam,
            phase.position,
            tackler,
            random,
          );
        }
        return;
      }

      const jackleMultiplier =
        defendersArrived > 0 && attackersArrived === 0 ? 1.85 : 1.0;
      const originalAttackingTeam = phase.attackingTeam;
      const attackWeight = groupStrength(state, phase.joinedAttackers);
      const defenceWeight =
        groupStrength(state, phase.joinedDefenders) * jackleMultiplier;
      phase.counterRuck =
        defenceWeight * (0.8 + random() * 0.4) > attackWeight * 0.7;
      phase.winningTeam =
        phase.counterRuck &&
        defenceWeight * (0.85 + random() * 0.3) > attackWeight
          ? otherTeam(phase.attackingTeam)
          : phase.attackingTeam;

      state.teamStats[phase.winningTeam].rucksWon += 1;
      state.teamStats[otherTeam(phase.winningTeam)].rucksLost += 1;

      if (phase.winningTeam !== originalAttackingTeam) {
        phase.attackingTeam = phase.winningTeam;
        phase.play = chooseRuckPlay(
          state,
          phase.attackingTeam,
          phase.position,
          random,
        );
      }
      phase.stage = "secure";
      phase.elapsed = 0;
    }
    return;
  }

  // 3. Stage secure / available: attacking team digs ball out and executes play
  const winningTeam = phase.winningTeam ?? phase.attackingTeam;
  const isAvailable = (p: Player) =>
    !phase.joinedAttackers.includes(p.id) &&
    !phase.joinedDefenders.includes(p.id) &&
    p.id !== phase.tackledPlayerId &&
    p.id !== phase.tacklerId;

  const preferredHalf = state.players.find(
    (p) =>
      p.team === winningTeam && p.role === ROLES.ScrumHalf && isAvailable(p),
  );
  const distributor =
    preferredHalf ??
    state.players
      .filter((p) => p.team === winningTeam && isAvailable(p))
      .sort(
        (a, b) =>
          distance(a.position, phase.position) -
          distance(b.position, phase.position),
      )[0];

  if (!distributor) return;

  const teamDir = attackDirection(winningTeam);
  const ruckBasePos: Position = {
    x: clamp(phase.position.x, -32, 32),
    z: clamp(
      phase.position.z - teamDir * 1.1,
      PITCH.deadBallLines.south + 1,
      PITCH.deadBallLines.north - 1,
    ),
  };

  const distributorAtBase = distance(distributor.position, ruckBasePos) <= 1.4;

  if (phase.stage === "secure") {
    // Distributor approaches base of ruck
    if (distributorAtBase || phase.elapsed >= 3.5) {
      phase.stage = "available";
      phase.elapsed = 0;
      // Nine gets hands on ball at base of ruck
      state.ball.carrierId = distributor.id;
      state.ball.flight = null;
      state.ball.position = {
        x: distributor.position.x,
        y: 0.5,
        z: distributor.position.z,
      };
    }
    return;
  }

  // Nine pauses at base of ruck surveying receivers before delivering pass
  if (phase.stage === "available") {
    const pauseTime = phase.tempo === "quick" ? 0.45 : 0.95;
    if (phase.elapsed >= pauseTime) {
      executeRuckPlay(state, random);
    }
  }
};

// Advances kickoff formation, pause, flight, and open-play transition.
