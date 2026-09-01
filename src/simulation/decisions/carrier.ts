import {
  attackDirection,
  PITCH,
  ROLES,
  type GameState,
  type Player,
} from "../../domain.ts";
import {
  clamp,
  distance,
  effectiveSkill,
  insideOwnTwentyTwo,
} from "../math.ts";
import type { PlayerCommand, Random } from "../types.ts";
import {
  choosePassTarget,
  clearanceTarget,
  command,
  hasBrokenLine,
  nearestOpponentDistance,
} from "./utils.ts";

export const chooseCarrierCommand = (
  state: GameState,
  players: Player[],
  carrier: Player,
  random: Random,
): PlayerCommand => {
  const direction = attackDirection(carrier.team);
  if (carrier.pendingBallAction) {
    const isKick = carrier.pendingBallAction.kind === "kick";
    return command(
      carrier,
      isKick
        ? carrier.position
        : { x: carrier.position.x, z: carrier.position.z + direction * 4 },
      `prepare-${carrier.pendingBallAction.kind}`,
      false,
      isKick ? "stand" : "jog",
    );
  }
  const lineBroken = hasBrokenLine(state, players, carrier);
  const flowDirection =
    carrier.position.x <= -25
      ? 1
      : carrier.position.x >= 25
        ? -1
        : state.attackFlow[carrier.team];
  if (lineBroken) {
    const sprint = command(
      carrier,
      {
        x: carrier.position.x,
        z: carrier.team === 0 ? PITCH.tryLines.north : PITCH.tryLines.south,
      },
      "line-break",
      true,
      "sprint",
    );
    sprint.decisionForSeconds = 1;
    sprint.lineBreakActive = true;
    return sprint;
  }
  if (carrier.decisionForSeconds > 0) {
    const continuing = command(
      carrier,
      carrier.intentTarget,
      "carrier",
      false,
      "run",
    );
    continuing.lineBreakActive = false;
    return continuing;
  }

  const defendersAhead = players
    .filter(
      (player) =>
        player.team !== carrier.team &&
        (player.position.z - carrier.position.z) * direction > 0 &&
        Math.abs(player.position.x - carrier.position.x) < 6 &&
        distance(player.position, carrier.position) < 10,
    )
    .sort(
      (a, b) =>
        distance(a.position, carrier.position) -
        distance(b.position, carrier.position),
    );
  const result = command(
    carrier,
    { x: carrier.position.x, z: carrier.position.z + direction * 20 },
    "carrier",
    false,
    "run",
  );
  result.lineBreakActive = false;
  result.decisionForSeconds =
    0.25 + (1 - effectiveSkill(carrier, "decision")) * 0.65;

  const forcedClearance = state.pendingClearanceKickerId === carrier.id;
  const trapped =
    insideOwnTwentyTwo(carrier.team, carrier.position.z) &&
    defendersAhead.length > 0;
  const isFullbackReturn =
    carrier.role === ROLES.FullBack &&
    insideOwnTwentyTwo(carrier.team, carrier.position.z);
  const nearbyTeammates = players.filter(
    (p) =>
      p.team === carrier.team &&
      p.id !== carrier.id &&
      distance(p.position, carrier.position) <= 15,
  );
  const isStranded = nearbyTeammates.length === 0 && defendersAhead.length > 0;
  const recognisesClearance =
    random() >= (1 - effectiveSkill(carrier, "decision")) * 0.18;
  // Clearance becomes attractive under territorial pressure, but poor decision-makers may miss cue.
  const canKick =
    carrier.role === ROLES.ScrumHalf ||
    carrier.role === ROLES.FlyHalf ||
    carrier.role === ROLES.FullBack ||
    carrier.role === ROLES.Wing;
  if (
    (forcedClearance || trapped || isFullbackReturn || isStranded) &&
    canKick &&
    recognisesClearance
  ) {
    result.ballAction = {
      kind: "kick",
      target: clearanceTarget(carrier, random),
    };
    return result;
  }
  if (trapped && !canKick && recognisesClearance) {
    const kicker = choosePassTarget(
      players,
      carrier,
      new Set([ROLES.ScrumHalf, ROLES.FlyHalf, ROLES.FullBack]),
    );
    if (kicker) {
      result.ballAction = {
        kind: "pass",
        receiverId: kicker.id,
        clearance: true,
      };
      return result;
    }
  }

  const targetTryLine =
    carrier.team === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
  const distToGoalLine = (targetTryLine - carrier.position.z) * direction;
  const angleFromPosts = Math.abs(carrier.position.x);
  const nearestDefDist = nearestOpponentDistance(players, carrier);
  const canAttemptDropGoal =
    canKick &&
    carrier.skills.kicking >= 0.78 &&
    distToGoalLine >= 12 &&
    distToGoalLine <= 38 &&
    angleFromPosts <= 18 &&
    nearestDefDist >= 4.5;

  if (canAttemptDropGoal) {
    // Range, angle, available space, and team kicking tendency jointly gate speculative drop goals.
    const proximityScore =
      (1 - distToGoalLine / 40) * (1 - angleFromPosts / 22);
    const spaceBonus = Math.min(1.5, nearestDefDist / 6);
    const dropGoalChance =
      0.28 *
      proximityScore *
      spaceBonus *
      state.teams[carrier.team].tendencies.kick *
      3;
    if (random() < dropGoalChance) {
      result.ballAction = {
        kind: "kick",
        target: { x: (random() - 0.5) * 3, z: targetTryLine + direction * 6 },
        flight: "dropGoal",
      };
      return result;
    }
  }

  if (defendersAhead.length === 0) return result;
  const isTightFive =
    carrier.role === ROLES.LooseHead ||
    carrier.role === ROLES.Hooker ||
    carrier.role === ROLES.TightHead ||
    carrier.role === ROLES.Lock;
  const isBackRow =
    carrier.role === ROLES.BlindSideFlanker ||
    carrier.role === ROLES.OpenSideFlanker ||
    carrier.role === ROLES.NumberEight;
  const isHalf =
    carrier.role === ROLES.ScrumHalf || carrier.role === ROLES.FlyHalf;
  const isCentre =
    carrier.role === ROLES.InsideCentre || carrier.role === ROLES.OutsideCentre;

  const weights = isTightFive
    ? [0.86, 0.08, 0.06]
    : isBackRow
      ? [0.76, 0.12, 0.12]
      : isHalf
        ? [0.22, 0.54, 0.14]
        : isCentre
          ? [0.44, 0.38, 0.16]
          : [0.36, 0.18, 0.38];
  const kickWeight =
    isTightFive || isBackRow ? 0 : isHalf ? 0.1 : isCentre ? 0.02 : 0.08;
  // Role priors encode common responsibilities before team tendencies bias final choice.
  const tendencies = state.teams[carrier.team].tendencies;
  const weighted = [
    weights[0] * tendencies.carry,
    weights[1] * tendencies.pass,
    weights[2] * tendencies.carry,
    kickWeight * tendencies.kick,
  ];
  const totalWeight = weighted.reduce((total, weight) => total + weight, 0);
  for (let index = 0; index < weighted.length; index += 1)
    weighted[index] /= totalWeight;
  const decisionSkill = effectiveSkill(carrier, "decision");
  const isErratic = random() < (1 - decisionSkill) * 0.22;
  // Decision errors can ignore established lateral flow when selecting receiver.
  const roll = random();
  const passTarget = choosePassTarget(
    players,
    carrier,
    undefined,
    isErratic ? undefined : flowDirection,
  );
  if (roll < weighted[0] || (!passTarget && roll < weighted[0] + weighted[1]))
    return result;
  if (roll < weighted[0] + weighted[1] && passTarget) {
    result.ballAction = { kind: "pass", receiverId: passTarget.id };
    return result;
  }
  if (roll < weighted[0] + weighted[1] + weighted[2]) {
    const defender = defendersAhead[0];
    result.target = {
      x:
        carrier.position.x +
        (defender.position.x >= carrier.position.x ? -8 : 8),
      z: carrier.position.z + direction * 12,
    };
    return result;
  }
  if (canKick) {
    if (
      insideOwnTwentyTwo(carrier.team, carrier.position.z) ||
      carrier.role === ROLES.FullBack
    ) {
      result.ballAction = {
        kind: "kick",
        target: clearanceTarget(carrier, random),
        flight: "kick",
      };
    } else {
      const isGrubber = random() < 0.55;
      const kickDistance = isGrubber ? 14 + random() * 8 : 18 + random() * 8;
      const targetZ = clamp(
        carrier.position.z + direction * kickDistance,
        PITCH.tryLines.south + 2,
        PITCH.tryLines.north - 2,
      );
      const targetX = clamp(carrier.position.x + (random() - 0.5) * 4, -30, 30);
      result.ballAction = {
        kind: "kick",
        target: { x: targetX, z: targetZ },
        flight: isGrubber ? "grubber" : "kick",
      };
    }
  } else {
    result.target = {
      x:
        carrier.position.x +
        (defendersAhead[0]?.position.x >= carrier.position.x ? -6 : 6),
      z: carrier.position.z + direction * 10,
    };
  }
  return result;
};
