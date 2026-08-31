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
import { startScrum } from "../phases.ts";
import type { Random } from "../types.ts";

// Launches ball toward target with skill-based error and ballistic velocity.
import { carryBall } from "./carry.ts";
import { launchBall } from "./launch.ts";
import { startGoalLineDropout } from "./dropout.ts";
import { startLineout } from "./lineout.ts";

export const updateBall = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const carrier = state.players.find(
    (player) => player.id === state.ball.carrierId,
  );
  // Attach ball to current carrier while possession remains established.
  if (carrier) {
    state.ball.position = { ...carrier.position, y: 1.25 };
    return;
  }
  // Let nearest player collect a loose grounded ball.
  if (!state.ball.flight) {
    const picker = state.players
      .filter((player) => distance(player.position, state.ball.position) <= 0.8)
      .sort(
        (a, b) =>
          distance(a.position, state.ball.position) -
          distance(b.position, state.ball.position),
      )[0];
    // Establish possession when an eligible picker reaches ball.
    if (picker) {
      if (random() < (1 - effectiveSkill(picker, "handling")) ** 2 * 0.12) {
        picker.stats.knockOns += 1;
        startScrum(state, otherTeam(picker.team), picker.position, random);
      } else {
        carryBall(state, picker);
      }
    }
    return;
  }

  // Move grounded kick with friction until rolling speed is exhausted.
  if (state.ball.flight === "rolling") {
    state.ball.position.x += state.ball.velocity.x * deltaSeconds;
    state.ball.position.z += state.ball.velocity.z * deltaSeconds;
    const friction = Math.max(0, 1 - deltaSeconds * 1.8);
    state.ball.velocity.x *= friction;
    state.ball.velocity.z *= friction;
    // Restart when rolling ball crosses dead-ball line within touchlines (not in touch).
    if (
      state.phase.kind !== "lineout" &&
      Math.abs(state.ball.position.x) < PITCH.touchLines.right &&
      Math.abs(state.ball.position.z) >= Math.abs(PITCH.deadBallLines.north)
    ) {
      startGoalLineDropout(state, state.ball.position.z);
      return;
    }
    // Award lineout when rolling kick crosses touchline.
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
    // Give moving ball to first player reaching its rolling path.
    if (rollingPicker) {
      if (
        random() <
        (1 - effectiveSkill(rollingPicker, "handling")) ** 2 * 0.16
      ) {
        rollingPicker.stats.knockOns += 1;
        startScrum(
          state,
          otherTeam(rollingPicker.team),
          rollingPicker.position,
          random,
        );
      } else {
        carryBall(state, rollingPicker);
      }
      return;
    }
    // Stop ball once rolling momentum is negligible.
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

  // Check for drop goal passing cleanly over crossbar (y >= 3m) between uprights (width 5.6m)
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
        state.ball.flight = null;
        state.phase = {
          kind: "kickoff",
          stage: "forming",
          kickingTeam: otherTeam(kickingTeam),
          readyForSeconds: 0,
          reason: "try",
        };
        return;
      }
    }
  }

  // Goal attempts are resolved by their scoring phase, never normal kick restarts.
  const isGoalAttempt =
    (state.phase.kind === "conversion" ||
      (state.phase.kind === "penalty" && state.phase.choice === "goal")) &&
    state.phase.stage === "inFlight";
  if (isGoalAttempt) {
    if (state.ball.position.y <= 0.15) {
      state.ball.position.y = 0.15;
      state.ball.velocity = { x: 0, y: 0, z: 0 };
      state.ball.flight = null;
    }
    return;
  }

  // Restart with goal-line dropout when flight crosses dead-ball line within pitch width (not in touch).
  if (
    state.phase.kind !== "lineout" &&
    (state.ball.flight === "kick" ||
      state.ball.flight === "kickoff" ||
      state.ball.flight === "dropGoal") &&
    Math.abs(state.ball.position.x) < PITCH.touchLines.right &&
    Math.abs(state.ball.position.z) >= Math.abs(PITCH.deadBallLines.north)
  ) {
    startGoalLineDropout(state, state.ball.position.z);
    return;
  }

  // Start lineout when kick or pass crosses either touchline.
  if (
    state.phase.kind !== "lineout" &&
    (state.ball.flight === "kick" ||
      state.ball.flight === "pass" ||
      state.ball.flight === "lineout" ||
      state.ball.flight === "grubber") &&
    Math.abs(state.ball.position.x) >= PITCH.touchLines.right
  ) {
    startLineout(
      state,
      state.ball.lastTouchedTeam ?? 0,
      clamp(state.ball.position.z, PITCH.tryLines.south, PITCH.tryLines.north),
      state.ball.position.x,
    );
    return;
  }

  // Check for pass interceptions by alert opposing defenders in the passing channel (excluding pack forwards bound in scrums/rucks)
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
      // Clean interception catches ball directly into counter-attack
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
  // Attempt a catch only once ball type and height permit it.
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
    // Resolve handling outcome when eligible catcher reaches ball.
    if (catcher) {
      // Knock-on: fumble forward on failed handling check awards scrum to opposition
      if (
        random() <
        0.01 + (1 - effectiveSkill(catcher, "handling")) ** 2 * 0.4
      ) {
        catcher.stats.knockOns += 1;
        startScrum(state, otherTeam(catcher.team), catcher.position, random);
        return;
      }
      catcher.stamina = clamp(catcher.stamina - 0.15, 0, 100);
      carryBall(state, catcher);
      return;
    }
  }
  // Resolve bounce, roll, or loose ball when flight reaches ground.
  if (state.ball.position.y <= 0.15) {
    state.ball.position.y = 0.15;

    const flight = state.ball.flight;
    const isGrubber = flight === "grubber";
    const isHighKick =
      flight === "kick" || flight === "kickoff" || flight === "dropGoal";

    // 1. Grubber bounce: runs straight with small skill-based deflection chance
    if (isGrubber && state.ball.bouncesRemaining > 0) {
      const kicker = state.players.find((p) => p.id === state.ball.kickerId);
      const skill = kicker ? effectiveSkill(kicker, "kicking") : 0.8;
      const deviationChance = 0.005 + (1 - skill) * 0.04; // 0.5% base up to 4.5%

      if (random() < deviationChance) {
        // Small random lateral nudge
        state.ball.velocity.x += (random() - 0.5) * 2.2;
      }

      state.ball.velocity.y = Math.abs(state.ball.velocity.y) * 0.35;
      state.ball.velocity.x *= 0.88;
      state.ball.velocity.z *= 0.88;
      state.ball.bouncesRemaining -= 1;
      return;
    }

    // 2. High kick / Bomb / Kickoff: realistic unpredictable rugby bounce dynamics!
    if (isHighKick && state.ball.bouncesRemaining > 0) {
      const kicker = state.players.find((p) => p.id === state.ball.kickerId);
      const skill = kicker ? effectiveSkill(kicker, "kicking") : 0.8;

      // Bounce restitution
      state.ball.velocity.y =
        Math.abs(state.ball.velocity.y) * (0.35 + random() * 0.25);

      // High chance of lateral sideways deflection (40% base + up to 30% on low skill)
      const lateralChance = 0.4 + (1 - skill) * 0.3;
      if (random() < lateralChance) {
        const lateralMagnitude = (random() - 0.5) * (4.5 + random() * 5.5);
        state.ball.velocity.x += lateralMagnitude;
      } else {
        state.ball.velocity.x *= 0.65;
      }

      // Chance of check-up or reverse bounce back toward kicker
      const bounceType = random();
      if (bounceType < 0.25) {
        // Reverse bounce: ball checks up and kicks backward toward the kicking side
        state.ball.velocity.z =
          -state.ball.velocity.z * (0.35 + random() * 0.45);
      } else if (bounceType < 0.45) {
        // Check-up dead bounce: loses horizontal momentum and bounces mostly upward
        state.ball.velocity.z *= 0.25;
      } else {
        // Forward deflection
        state.ball.velocity.z *= 0.65;
      }

      state.ball.bouncesRemaining -= 1;
      return;
    }

    // Preserve horizontal momentum into a rolling ball after final bounce
    if (isHighKick || isGrubber) {
      state.ball.velocity.y = 0;
      state.ball.velocity.x *= 0.65;
      state.ball.velocity.z *= 0.65;
      state.ball.flight = "rolling";
      state.ball.intendedReceiverId = null;
      return;
    }

    // Leave failed pass or lineout throw stationary and loose.
    state.ball.velocity = { x: 0, y: 0, z: 0 };
    state.ball.flight = null;
    state.ball.intendedReceiverId = null;
  }
};
