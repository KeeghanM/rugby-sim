import {
  attackDirection,
  type GameState,
  otherTeam,
  PITCH,
  type Player,
  type Position,
  ROLES,
  type Team,
} from "../../domain.ts";
import {
  getKickoffTarget,
  getLineoutTarget,
  getScrumTarget,
  isForward,
  LINEOUT_MEMBER_VARIANTS,
} from "../../formations/index.ts";
import {
  getActiveShapePositions,
  rollTeamFormations,
} from "../../teams/index.ts";
import { carryBall, launchBall, startGoalLineDropout } from "../ball.ts";
import {
  clamp,
  contactStrength,
  distance,
  effectiveSkill,
  GRAVITY,
  insideOwnTwentyTwo,
  overallSkill,
} from "../math.ts";
import type { Random } from "../types.ts";
import {
  GOAL_KICK_TIMEOUT_SECONDS,
  MATCH_CLOCK_RATE,
  goalKickTime,
} from "./utils.ts";

export const startPenalty = (
  state: GameState,
  awardedTeam: Team,
  position: Position,
  offender?: Player,
  random: Random = Math.random,
) => {
  if (offender) {
    offender.stats.penaltiesConceded += 1;
  }
  const kicker =
    state.players.find(
      (p) => p.team === awardedTeam && p.role === ROLES.FlyHalf,
    ) ?? state.players.find((p) => p.team === awardedTeam);
  const targetTryLine =
    awardedTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
  const distToTryLine = Math.abs(targetTryLine - position.z);
  const lateralDistance = Math.abs(position.x);

  const kickSkill = kicker ? effectiveSkill(kicker, "kicking") : 0.75;
  const decisionSkill = kicker ? effectiveSkill(kicker, "decision") : 0.75;

  // 1. Kick accuracy / success rate estimation from this position
  const anglePenalty = (lateralDistance / 35) * 0.32;
  const distancePenalty = Math.max(0, distToTryLine - 22) * 0.01;
  const estimatedGoalChance = clamp(
    0.2 + kickSkill * 0.75 - anglePenalty - distancePenalty,
    0.05,
    0.95,
  );

  // 2. Scoreline context & match clock pressure
  const oppTeam = otherTeam(awardedTeam);
  const scoreDiff = state.scores[awardedTeam] - state.scores[oppTeam];
  const isLateInMatch = state.half === 2 && state.matchClockSeconds >= 3600;

  // 3. Pack strength & maul tendency (heavy pack teams love kicking for touch)
  const forwardPack = state.players.filter(
    (p) => p.team === awardedTeam && isForward(p),
  );
  const packWeight = forwardPack.reduce((sum, p) => sum + p.weight, 0);
  const maulTendency = state.teams[awardedTeam].tendencies.maul;
  const packDominanceBonus =
    (packWeight > 880 ? 0.25 : 0) + (maulTendency > 0.5 ? 0.3 : 0);

  // Calculate Touch Kick vs Goal Kick score
  let touchPreference = 0.5 + packDominanceBonus;
  let goalPreference = 0.5;

  if (distToTryLine > 48 || lateralDistance > 26) {
    // Out of realistic goal kick range -> always kick for touch
    goalPreference = 0.05;
    touchPreference = 0.95;
  } else if (distToTryLine <= 30 && lateralDistance <= 15) {
    // In the pocket right in front of the posts
    goalPreference += estimatedGoalChance * 0.7;
  } else {
    goalPreference += estimatedGoalChance * 0.4;
  }

  // Score context adjustments:
  if (isLateInMatch) {
    if (scoreDiff >= -7 && scoreDiff <= -4) {
      // Trailing by 4-7 points late in game: need a TRY to win/tie! Touch kick heavily favored
      touchPreference += 0.55;
      goalPreference -= 0.35;
    } else if (scoreDiff >= -3 && scoreDiff < 0) {
      // Trailing by 1-3 points late in game: 3 points ties or wins! Goal kick favored if in range
      goalPreference += 0.5;
    } else if (scoreDiff === 0) {
      // Tied late: 3 points takes the lead
      goalPreference += 0.45;
    }
  }

  // Decision skill variation: higher decision skill picks the optimal option
  const noise = (random() - 0.5) * (1 - decisionSkill) * 0.4;
  const choice =
    goalPreference + noise > touchPreference && estimatedGoalChance > 0.3
      ? "goal"
      : "touch";

  state.ball = {
    position: { x: position.x, y: 0.15, z: position.z },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: awardedTeam,
    passerId: null,
    kickerId: kicker?.id ?? null,
    kickOrigin: null,
    bouncesRemaining: 0,
  };
  state.pendingClearanceKickerId = null;
  state.possessionTeam = awardedTeam;
  state.phaseCount = 1;
  state.possessionOriginZ = position.z;
  state.gainLineZ = position.z;
  state.distanceGained = 0;
  state.phase = {
    kind: "penalty",
    stage: "decision",
    position: { ...position },
    awardedTeam,
    choice,
    elapsed: 0,
    kickAtSeconds: goalKickTime(kicker, random),
    kickerId: kicker?.id,
  };
};

// Executes penalty kick for touch or goal
export const updatePenalty = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  if (phase.kind !== "penalty") return;
  phase.elapsed += deltaSeconds;

  const kicker =
    state.players.find((p) => p.id === phase.kickerId) ??
    state.players.find(
      (p) => p.team === phase.awardedTeam && p.role === ROLES.FlyHalf,
    ) ??
    state.players.find((p) => p.team === phase.awardedTeam);

  if (phase.stage === "decision") {
    if (phase.elapsed < 1.5) return;
    phase.stage = "executing";
    return;
  }

  if (phase.stage === "executing") {
    if (!kicker) return;
    const teamDir = attackDirection(phase.awardedTeam);
    if (phase.choice === "goal") {
      const shotClockSeconds = phase.elapsed * MATCH_CLOCK_RATE;
      const timedOut = shotClockSeconds >= GOAL_KICK_TIMEOUT_SECONDS;
      if (
        shotClockSeconds <
        Math.min(phase.kickAtSeconds, GOAL_KICK_TIMEOUT_SECONDS)
      )
        return;
      const targetTryLine =
        phase.awardedTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
      const kickSkill = effectiveSkill(kicker, "kicking");
      const anglePenalty = (Math.abs(phase.position.x) / 35) * 0.28;
      const distToPosts = Math.abs(targetTryLine - phase.position.z);
      const distancePenalty = Math.max(0, distToPosts - 22) * 0.008;
      const isSuccess =
        !timedOut &&
        random() <
          clamp(
            0.18 + kickSkill * 0.78 - anglePenalty - distancePenalty,
            0.08,
            0.94,
          );

      phase.isSuccess = isSuccess;
      kicker.stamina = clamp(kicker.stamina - 0.5, 0, 100);
      kicker.stats.totalKicks += 1;

      const targetX = isSuccess
        ? (random() - 0.5) * 2.5
        : (Math.sign(phase.position.x) || 1) * (6 + random() * 4);
      // Ball sails through the posts into the in-goal area
      const targetZ = targetTryLine + teamDir * (18 + random() * 8);
      const distToTarget = Math.abs(targetZ - phase.position.z);
      const duration = Math.max(1.8, distToTarget / 20);
      const peakHeight = isSuccess
        ? 7.0 + random() * 2.5
        : 2.5 + random() * 2.5;

      state.ball = {
        position: { x: phase.position.x, y: 0.2, z: phase.position.z },
        velocity: {
          x: (targetX - phase.position.x) / duration,
          y: (GRAVITY * duration) / 2 + peakHeight / duration,
          z: (targetZ - phase.position.z) / duration,
        },
        carrierId: null,
        flight: "kick",
        intendedReceiverId: null,
        lastTouchedTeam: phase.awardedTeam,
        passerId: null,
        kickerId: kicker.id,
        kickOrigin: { ...phase.position },
        bouncesRemaining: 2,
      };

      phase.stage = "inFlight";
      phase.elapsed = 0;
      return;
    }

    // Touch kick: find touch downfield for lineout restart
    const touchX = Math.sign(phase.position.x || 1) * PITCH.touchLines.right;
    const touchZ = clamp(
      phase.position.z + teamDir * (28 + random() * 12),
      PITCH.tryLines.south + 5,
      PITCH.tryLines.north - 5,
    );
    launchBall(
      state,
      kicker,
      { x: touchX * 1.05, z: touchZ },
      "kick",
      null,
      random,
    );
    state.pendingLineoutTeam = phase.awardedTeam;
    state.phase = { kind: "openPlay" };
    return;
  }

  if (phase.stage === "inFlight") {
    const teamDir = attackDirection(phase.awardedTeam);
    const targetTryLine =
      phase.awardedTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
    const hasReachedPosts =
      (state.ball.position.z - targetTryLine) * teamDir >= 0;

    if (phase.isSuccess && hasReachedPosts) {
      state.scores[phase.awardedTeam] += 3;
      if (kicker) kicker.stats.successfulKicks += 1;
      phase.isSuccess = false;
    }

    // After kick flight naturally lands/bounces, transition smoothly to kickoff restart
    if (
      phase.elapsed >= 3.8 ||
      (phase.elapsed >= 2.0 && state.ball.position.y <= 0.2)
    ) {
      state.phase = {
        kind: "kickoff",
        stage: "forming",
        kickingTeam: otherTeam(phase.awardedTeam),
        readyForSeconds: 0,
        reason: "try",
      };
    }
  }
};

// Starts a scrum restart at mark awarded to non-offending team
