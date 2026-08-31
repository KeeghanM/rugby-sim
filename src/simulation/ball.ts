import { attackDirection, type GameState, otherTeam, PITCH, type Player, type Position, type Team } from "../domain.ts";
import { clamp, distance, GRAVITY } from "./math.ts";
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
  const skill = flight === "kick" || flight === "kickoff" ? carrier.skills.kicking : carrier.skills.passing;
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

// Transfers grounded or caught ball into player possession.
export const carryBall = (state: GameState, player: Player) => {
  state.ball.carrierId = player.id;
  state.ball.flight = null;
  state.ball.intendedReceiverId = null;
  state.ball.velocity = { x: 0, y: 0, z: 0 };
  state.ball.position = { ...player.position, y: 1.25 };
  state.ball.lastTouchedTeam = player.team;
  state.ball.kickOrigin = null;
  for (const teammate of state.players) teammate.kickOffside = false;
};

// Converts a kick crossing touch into a forming opposition lineout.
const startLineout = (state: GameState, kickingTeam: Team, z: number, x: number) => {
  state.ball = {
    position: { x: Math.sign(x) * PITCH.touchLines.right, y: 0.15, z },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: kickingTeam,
    kickOrigin: null,
  };
  state.pendingClearanceKickerId = null;
  state.phase = {
    kind: "lineout",
    stage: "forming",
    position: { x: Math.sign(x) * PITCH.touchLines.right, z },
    throwingTeam: otherTeam(kickingTeam),
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

  state.ball.position.x += state.ball.velocity.x * deltaSeconds;
  state.ball.position.y += state.ball.velocity.y * deltaSeconds;
  state.ball.position.z += state.ball.velocity.z * deltaSeconds;
  state.ball.velocity.y -= GRAVITY * deltaSeconds;

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
      // Drop ball loose when handling check fails.
      if (random() < (1 - catcher.skills.handling) * 0.25) {
        state.ball.position.x = clamp(state.ball.position.x + (random() - 0.5) * 3, PITCH.touchLines.left, PITCH.touchLines.right);
        state.ball.position.y = 0.15;
        state.ball.velocity = { x: 0, y: 0, z: 0 };
        state.ball.flight = null;
        state.ball.intendedReceiverId = null;
        return;
      }
      carryBall(state, catcher);
      return;
    }
  }
  // Stop uncaught ball when it reaches ground.
  if (state.ball.position.y <= 0.15) {
    state.ball.position.y = 0.15;
    state.ball.velocity = { x: 0, y: 0, z: 0 };
    state.ball.flight = null;
    state.ball.intendedReceiverId = null;
  }
};
