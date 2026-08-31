import { attackDirection, type GameState, otherTeam, PITCH, type Player, type Position, type Team } from "../domain.ts";
import { isForward } from "../formations.ts";
import { clamp, distance, effectiveSkill, GRAVITY } from "./math.ts";
import { startScrum } from "./phases.ts";
import type { Random } from "./types.ts";

// Launches ball toward target with skill-based error and ballistic velocity.
export const launchBall = (
  state: GameState,
  carrier: Player,
  target: Position,
  flight: "pass" | "kick" | "kickoff" | "lineout",
  intendedReceiverId: string | null,
  random: Random = Math.random,
) => {
  const skill =
    flight === "kick" || flight === "kickoff"
      ? effectiveSkill(carrier, "kicking")
      : effectiveSkill(carrier, "passing");
  const error = (1 - skill) * (flight === "pass" || flight === "lineout" ? 5 : 18);
  const actualTarget = {
    x: target.x + (random() - 0.5) * error,
    z: target.z + (random() - 0.5) * error,
  };
  const horizontalDistance = distance(carrier.position, actualTarget);
  const duration = flight === "pass" || flight === "lineout" ? Math.max(0.35, horizontalDistance / 14) : 2.2;
  state.ball = {
    position: { ...carrier.position, y: 1.25 },
    velocity: {
      x: (actualTarget.x - carrier.position.x) / duration,
      y: (GRAVITY * duration) / 2,
      z: (actualTarget.z - carrier.position.z) / duration,
    },
    carrierId: null,
    flight,
    intendedReceiverId,
    lastTouchedTeam: carrier.team,
    kickOrigin: flight === "kick" || flight === "kickoff" ? { ...carrier.position } : null,
    bouncesRemaining: flight === "kick" || flight === "kickoff" ? 2 : 0,
  };
  // Mark teammates ahead of kicker offside for kick and kickoff flights.
  if (flight === "kick" || flight === "kickoff") {
    const direction = attackDirection(carrier.team);
    for (const player of state.players) {
      player.kickOffside =
        player.team === carrier.team &&
        player.id !== carrier.id &&
        (player.position.z - carrier.position.z) * direction > 0;
    }
  }
};

// Converts a ball crossing dead-ball line into defending goal-line dropout.
const startGoalLineDropout = (state: GameState, z: number) => {
  const defendingTeam: Team = z < 0 ? 0 : 1;
  state.ball = {
    position: { x: 0, y: 0.15, z: defendingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: defendingTeam,
    kickOrigin: null,
    bouncesRemaining: 0,
  };
  state.pendingClearanceKickerId = null;
  state.phase = {
    kind: "kickoff",
    stage: "forming",
    kickingTeam: defendingTeam,
    readyForSeconds: 0,
    reason: "goalLineDropout",
  };
};

// Transfers grounded or caught ball into player possession.
export const carryBall = (state: GameState, player: Player) => {
  // Cancel stale preparations whenever possession changes hands.
  for (const candidate of state.players) candidate.pendingBallAction = null;
  state.ball.carrierId = player.id;
  state.ball.flight = null;
  state.ball.intendedReceiverId = null;
  state.ball.velocity = { x: 0, y: 0, z: 0 };
  state.ball.position = { ...player.position, y: 1.25 };
  state.ball.lastTouchedTeam = player.team;
  state.ball.kickOrigin = null;
  state.ball.bouncesRemaining = 0;
  for (const teammate of state.players) teammate.kickOffside = false;

  // Track possession team, phase count, and establish gainline at the catcher's position
  const isRestartCatch =
    state.phase.kind === "kickoff" ||
    state.phase.kind === "lineout" ||
    state.phase.kind === "scrum";
  if (player.team !== state.possessionTeam || isRestartCatch) {
    state.possessionTeam = player.team;
    state.phaseCount = 1;
    state.possessionOriginZ = player.position.z;
    state.gainLineZ = player.position.z;
    state.distanceGained = 0;
  }

  // Initialize defending team line relative to carrier upon possession change
  const direction = attackDirection(player.team);
  const defendingTeam = otherTeam(player.team);
  state.defensiveLineZ[defendingTeam] = clamp(
    player.position.z + direction * 7,
    PITCH.tryLines.south,
    PITCH.tryLines.north,
  );
};

// Converts a kick crossing touch into a forming opposition lineout.
const startLineout = (state: GameState, kickingTeam: Team, z: number, x: number) => {
  const throwingTeam = otherTeam(kickingTeam);
  state.ball = {
    position: { x: Math.sign(x) * PITCH.touchLines.right, y: 0.15, z },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: kickingTeam,
    kickOrigin: null,
    bouncesRemaining: 0,
  };
  state.pendingClearanceKickerId = null;
  state.possessionTeam = throwingTeam;
  state.phaseCount = 1;
  state.possessionOriginZ = z;
  state.gainLineZ = z;
  state.distanceGained = 0;
  state.phase = {
    kind: "lineout",
    stage: "forming",
    position: { x: Math.sign(x) * PITCH.touchLines.right, z },
    throwingTeam,
    elapsed: 0,
  };
};

// Advances ball possession, flight, catches, drops, touch, and landing.
export const updateBall = (state: GameState, deltaSeconds: number, random: Random) => {
  const carrier = state.players.find((player) => player.id === state.ball.carrierId);
  // Attach ball to current carrier while possession remains established.
  if (carrier) {
    state.ball.position = { ...carrier.position, y: 1.25 };
    return;
  }
  // Let nearest player collect a loose grounded ball.
  if (!state.ball.flight) {
    const picker = state.players
      .filter((player) => distance(player.position, state.ball.position) <= 0.8)
      .sort((a, b) => distance(a.position, state.ball.position) - distance(b.position, state.ball.position))[0];
    // Establish possession when an eligible picker reaches ball.
    if (picker) carryBall(state, picker);
    return;
  }

  // Move grounded kick with friction until rolling speed is exhausted.
  if (state.ball.flight === "rolling") {
    state.ball.position.x += state.ball.velocity.x * deltaSeconds;
    state.ball.position.z += state.ball.velocity.z * deltaSeconds;
    const friction = Math.max(0, 1 - deltaSeconds * 1.8);
    state.ball.velocity.x *= friction;
    state.ball.velocity.z *= friction;
    // Restart when rolling ball crosses dead-ball line.
    if (
      Math.abs(state.ball.position.z) >= Math.abs(PITCH.deadBallLines.north)
    ) {
      startGoalLineDropout(state, state.ball.position.z);
      return;
    }
    // Award lineout when rolling kick crosses touchline.
    if (Math.abs(state.ball.position.x) >= PITCH.touchLines.right) {
      startLineout(
        state,
        state.ball.lastTouchedTeam ?? 0,
        clamp(state.ball.position.z, PITCH.tryLines.south, PITCH.tryLines.north),
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
      carryBall(state, rollingPicker);
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

  // Restart with goal-line dropout when flight crosses either dead-ball line.
  if (
    (state.ball.flight === "kick" || state.ball.flight === "kickoff") &&
    Math.abs(state.ball.position.z) >= Math.abs(PITCH.deadBallLines.north)
  ) {
    startGoalLineDropout(state, state.ball.position.z);
    return;
  }

  // Start lineout when normal kick crosses either touchline.
  if (state.ball.flight === "kick" && Math.abs(state.ball.position.x) >= PITCH.touchLines.right) {
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

  const catchable = state.ball.flight === "pass" || state.ball.flight === "lineout" || state.ball.velocity.y <= 0;
  // Attempt a catch only once ball type and height permit it.
  if (catchable && state.ball.position.y <= 2.2) {
    const catcher = state.players
      .filter(
        (player) =>
          distance(player.position, state.ball.position) <= 1.5 &&
          (state.ball.flight !== "kickoff" || player.team !== state.ball.lastTouchedTeam) &&
          (state.ball.flight !== "pass" && state.ball.flight !== "lineout" || player.id === state.ball.intendedReceiverId),
      )
      .sort((a, b) => distance(a.position, state.ball.position) - distance(b.position, state.ball.position))[0];
    // Resolve handling outcome when eligible catcher reaches ball.
    if (catcher) {
      // Knock-on: fumble forward on failed handling check awards scrum to opposition
      if (random() < (1 - effectiveSkill(catcher, "handling")) * 0.25) {
        startScrum(state, otherTeam(catcher.team), catcher.position);
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
    // Let territorial kicks bounce before converting remaining momentum to roll.
    if (
      (state.ball.flight === "kick" || state.ball.flight === "kickoff") &&
      state.ball.bouncesRemaining > 0
    ) {
      state.ball.velocity.y = Math.abs(state.ball.velocity.y) * 0.42;
      state.ball.velocity.x *= 0.72;
      state.ball.velocity.z *= 0.72;
      state.ball.bouncesRemaining -= 1;
      return;
    }
    // Preserve horizontal kick momentum as rolling ball after final bounce.
    if (state.ball.flight === "kick" || state.ball.flight === "kickoff") {
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
