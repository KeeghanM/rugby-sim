import {
  attackDirection,
  type GameState,
  otherTeam,
  PITCH,
  type Player,
  type Position,
  type Team,
} from "../../domain.ts";
import { isForward } from "../../formations.ts";
import { clamp, distance, effectiveSkill, GRAVITY } from "../math.ts";
import { startScrum } from "../phases/scrum.ts";
import type { Random } from "../types.ts";

import { carryBall } from "./carry.ts";
import { launchBall } from "./launch.ts";
import { startGoalLineDropout } from "./dropout.ts";
import { startLineout } from "./lineout.ts";

const attemptPossession = (
  state: GameState,
  player: Player,
  failureChance: number,
  random: Random,
  staminaCost = 0,
) => {
  if (random() < failureChance) {
    player.stats.knockOns += 1;
    startScrum(state, otherTeam(player.team), player.position, random);
    return;
  }
  player.stamina = clamp(player.stamina - staminaCost, 0, 100);
  carryBall(state, player);
};

export const updateBall = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const carrier = state.players.find(
    (player) => player.id === state.ball.carrierId,
  );
  // Established possession pins ball to carrier rather than integrating a separate trajectory.
  if (carrier) {
    state.ball.position = { ...carrier.position, y: 1.25 };
    return;
  }
  if (!state.ball.flight) {
    if (
      state.phase.kind === "openPlay" &&
      Math.abs(state.ball.position.z) >= Math.abs(PITCH.deadBallLines.north)
    ) {
      startGoalLineDropout(state, state.ball.position.z);
      return;
    }
    const picker = state.players
      .filter((player) => distance(player.position, state.ball.position) <= 0.8)
      .sort(
        (a, b) =>
          distance(a.position, state.ball.position) -
          distance(b.position, state.ball.position),
      )[0];
    // Squared skill deficit keeps routine pickups reliable while preserving handling errors.
    if (picker) {
      attemptPossession(
        state,
        picker,
        (1 - effectiveSkill(picker, "handling")) ** 2 * 0.12,
        random,
      );
    }
    return;
  }

  // Linear damping approximates turf friction without a full rolling-physics model.
  if (state.ball.flight === "rolling") {
    state.ball.position.x += state.ball.velocity.x * deltaSeconds;
    state.ball.position.z += state.ball.velocity.z * deltaSeconds;
    const friction = Math.max(0, 1 - deltaSeconds * 1.8);
    state.ball.velocity.x *= friction;
    state.ball.velocity.z *= friction;
    // Dead-ball crossings use a goal-line dropout as the simulation's simplified restart.
    if (
      state.phase.kind === "openPlay" &&
      Math.abs(state.ball.position.x) < PITCH.touchLines.right &&
      Math.abs(state.ball.position.z) >= Math.abs(PITCH.deadBallLines.north)
    ) {
      startGoalLineDropout(state, state.ball.position.z);
      return;
    }
    // Ball entering touch restarts with a lineout at the crossing point.
    if (
      state.phase.kind !== "lineout" &&
      Math.abs(state.ball.position.x) >= PITCH.touchLines.right
    ) {
      startLineout(
        state,
        state.ball.lastTouchedTeam ?? 0,
        clamp(
          state.ball.position.z,
          PITCH.tryLines.south,
          PITCH.tryLines.north,
        ),
        state.ball.position.x,
      );
      return;
    }
    const rollingPicker = state.players
      .filter((player) => distance(player.position, state.ball.position) <= 1.1)
      .sort(
        (a, b) =>
          distance(a.position, state.ball.position) -
          distance(b.position, state.ball.position),
      )[0];
    if (rollingPicker) {
      attemptPossession(
        state,
        rollingPicker,
        (1 - effectiveSkill(rollingPicker, "handling")) ** 2 * 0.16,
        random,
      );
      return;
    }
    if (Math.hypot(state.ball.velocity.x, state.ball.velocity.z) < 0.2) {
      state.ball.velocity = { x: 0, y: 0, z: 0 };
      state.ball.flight = null;
    }
    return;
  }

  state.ball.position.x += state.ball.velocity.x * deltaSeconds;
  state.ball.position.y += state.ball.velocity.y * deltaSeconds;
  state.ball.position.z += state.ball.velocity.z * deltaSeconds;
  state.ball.velocity.y -= GRAVITY * deltaSeconds;

  // Law 8 awards a drop goal only when ball crosses above the 3 m bar and between 5.6 m uprights.
  if (state.ball.flight === "dropGoal") {
    const kickingTeam = state.ball.lastTouchedTeam ?? 0;
    const dir = attackDirection(kickingTeam);
    const targetTryLine =
      dir === 1 ? PITCH.tryLines.north : PITCH.tryLines.south;
    const hasReachedGoalLine =
      (state.ball.position.z - targetTryLine) * dir >= 0;

    if (hasReachedGoalLine) {
      const isBetweenUprights = Math.abs(state.ball.position.x) <= 2.8;
      const isOverCrossbar = state.ball.position.y >= 3.0;

      if (isBetweenUprights && isOverCrossbar) {
        state.scores[kickingTeam] += 3;
        if (state.ball.kickerId) {
          const kicker =
            state.players.find((p) => p.id === state.ball.kickerId) ??
            state.substitutes.find((s) => s.id === state.ball.kickerId);
          if (kicker) kicker.stats.successfulKicks += 1;
        }
        state.ball.flight = "kick";
        state.phase = {
          kind: "kickoff",
          stage: "forming",
          kickingTeam: otherTeam(kickingTeam),
          readyForSeconds: 0,
          reason: "try",
        };
      }
    }
  }

  // Goal attempts keep flying after scoring so post-kick motion remains visible.
  const isGoalAttempt =
    (state.phase.kind === "conversion" ||
      (state.phase.kind === "penalty" && state.phase.choice === "goal")) &&
    state.phase.stage === "inFlight";
  if (isGoalAttempt) {
    return;
  }

  // Dead-ball crossings use a goal-line dropout approximation without modelling who grounded the ball.
  if (
    state.phase.kind === "openPlay" &&
    (state.ball.flight === "kick" ||
      state.ball.flight === "kickoff" ||
      state.ball.flight === "dropGoal") &&
    Math.abs(state.ball.position.x) < PITCH.touchLines.right &&
    Math.abs(state.ball.position.z) >= Math.abs(PITCH.deadBallLines.north)
  ) {
    startGoalLineDropout(state, state.ball.position.z);
    return;
  }

  // Touch ends play and places the lineout mark at the bounded crossing position.
  if (
    state.phase.kind !== "lineout" &&
    (state.ball.flight === "kick" ||
      state.ball.flight === "pass" ||
      state.ball.flight === "lineout" ||
      state.ball.flight === "grubber") &&
    Math.abs(state.ball.position.x) >= PITCH.touchLines.right
  ) {
    const kickerTeam = state.ball.lastTouchedTeam ?? 0;
    const kickDir = attackDirection(kickerTeam);
    const opp22Z =
      kickDir === 1
        ? PITCH.twentyTwoMetreLines.north
        : PITCH.twentyTwoMetreLines.south;

    // Law 18 preserves throw-in for a 50:22 kick originating in own half, bouncing in field, and reaching opposition 22.
    const is5022 =
      state.ball.flight === "kick" &&
      state.ball.kickOrigin !== null &&
      state.ball.kickOrigin.z * kickDir <= 0 &&
      (state.ball.position.z - opp22Z) * kickDir >= 0 &&
      state.ball.bouncesRemaining < 2;

    const throwingTeam =
      state.pendingLineoutTeam !== null
        ? state.pendingLineoutTeam
        : is5022
          ? kickerTeam
          : otherTeam(kickerTeam);

    startLineout(
      state,
      throwingTeam,
      clamp(state.ball.position.z, PITCH.tryLines.south, PITCH.tryLines.north),
      state.ball.position.x,
    );
    return;
  }

  // Nearby free defenders may intercept low passes; bound scrum forwards remain unavailable.
  if (state.ball.flight === "pass" && state.ball.position.y <= 2.1) {
    const interceptor = state.players
      .filter(
        (p) =>
          p.team !== state.ball.lastTouchedTeam &&
          p.ruckRecoverySeconds === 0 &&
          (state.phase.kind !== "scrum" || !isForward(p)) &&
          distance(p.position, state.ball.position) <= 1.25,
      )
      .sort(
        (a, b) =>
          distance(a.position, state.ball.position) -
          distance(b.position, state.ball.position),
      )[0];
    if (interceptor) {
      const handleSkill = effectiveSkill(interceptor, "handling");
      if (random() < handleSkill * 0.45) {
        carryBall(state, interceptor);
        return;
      }
    }
  }

  const catchable =
    state.ball.flight === "pass" ||
    state.ball.flight === "lineout" ||
    state.ball.velocity.y <= 0;
  // Passes and throws are catchable throughout flight; kicks become catchable only while descending.
  if (catchable && state.ball.position.y <= 2.2) {
    const catcher = state.players
      .filter(
        (player) =>
          distance(player.position, state.ball.position) <= 1.5 &&
          (state.ball.flight !== "kickoff" ||
            player.team !== state.ball.lastTouchedTeam) &&
          ((state.ball.flight !== "pass" && state.ball.flight !== "lineout") ||
            player.id === state.ball.intendedReceiverId),
      )
      .sort(
        (a, b) =>
          distance(a.position, state.ball.position) -
          distance(b.position, state.ball.position),
      )[0];
    // Squared skill deficit concentrates failures among weaker handlers instead of penalising all catches linearly.
    if (catcher) {
      attemptPossession(
        state,
        catcher,
        0.01 + (1 - effectiveSkill(catcher, "handling")) ** 2 * 0.4,
        random,
        0.15,
      );
      return;
    }
  }
  if (state.ball.position.y <= 0.15) {
    state.ball.position.y = 0.15;

    const flight = state.ball.flight;
    const isGrubber = flight === "grubber";
    const isHighKick =
      flight === "kick" || flight === "kickoff" || flight === "dropGoal";

    // Grubbers retain direction, with weaker kicking skill increasing rare lateral deflections.
    if (isGrubber && state.ball.bouncesRemaining > 0) {
      const kicker = state.players.find((p) => p.id === state.ball.kickerId);
      const skill = kicker ? effectiveSkill(kicker, "kicking") : 0.8;
      const deviationChance = 0.005 + (1 - skill) * 0.04; // Chance ranges from 0.5% to 4.5% as skill falls.

      if (random() < deviationChance) {
        state.ball.velocity.x += (random() - 0.5) * 2.2;
      }

      state.ball.velocity.y = Math.abs(state.ball.velocity.y) * 0.35;
      state.ball.velocity.x *= 0.88;
      state.ball.velocity.z *= 0.88;
      state.ball.bouncesRemaining -= 1;
      return;
    }

    // Pointed rugby-ball bounces are approximated with larger random lateral and longitudinal changes.
    if (isHighKick && state.ball.bouncesRemaining > 0) {
      const kicker = state.players.find((p) => p.id === state.ball.kickerId);
      const skill = kicker ? effectiveSkill(kicker, "kicking") : 0.8;

      // Restitution returns 35% to 60% of vertical impact speed.
      state.ball.velocity.y =
        Math.abs(state.ball.velocity.y) * (0.35 + random() * 0.25);

      // Lateral-deflection chance rises from 40% toward 70% as kicking skill falls.
      const lateralChance = 0.4 + (1 - skill) * 0.3;
      if (random() < lateralChance) {
        const lateralMagnitude = (random() - 0.5) * (4.5 + random() * 5.5);
        state.ball.velocity.x += lateralMagnitude;
      } else {
        state.ball.velocity.x *= 0.65;
      }

      // Longitudinal branches represent reverse, checked, and forward rugby-ball bounces.
      const bounceType = random();
      if (bounceType < 0.25) {
        // Reverse bounce retains 35% to 80% of speed toward the kicking side.
        state.ball.velocity.z =
          -state.ball.velocity.z * (0.35 + random() * 0.45);
      } else if (bounceType < 0.45) {
        // Checked bounce retains one quarter of forward speed.
        state.ball.velocity.z *= 0.25;
      } else {
        state.ball.velocity.z *= 0.65;
      }

      state.ball.bouncesRemaining -= 1;
      return;
    }

    // Final bounce retains 65% of horizontal velocity as roll momentum.
    if (isHighKick || isGrubber) {
      state.ball.velocity.y = 0;
      state.ball.velocity.x *= 0.65;
      state.ball.velocity.z *= 0.65;
      state.ball.flight = "rolling";
      state.ball.intendedReceiverId = null;
      return;
    }

    // Uncaught passes and throws remain loose so open-play recovery can decide possession.
    state.ball.velocity = { x: 0, y: 0, z: 0 };
    state.ball.flight = null;
    state.ball.intendedReceiverId = null;
  }
};
