import { attackDirection, PITCH, type GameState, ROLES } from "../../domain.ts";
import { clamp, distance } from "../math.ts";
import { carryBall } from "../ball.ts";

export const updateReferee = (state: GameState, deltaSeconds: number) => {
  // Ensure assistants array exists
  if (!state.referee.assistants) {
    state.referee.assistants = [
      { position: { x: -36.2, z: 0 }, velocity: { x: 0, z: 0 }, side: "west" },
      { position: { x: 36.2, z: 0 }, velocity: { x: 0, z: 0 }, side: "east" },
    ];
  }

  const phase = state.phase;

  // --- 1. KICKOFF BALL DELIVERY BY REFEREE ---
  // If in kickoff phase and the fly-half (10) doesn't have the ball yet,
  // the referee spawns a fresh ball (never running off into the stands),
  // jogs to the 10, and hands it over at the kickoff mark.
  if (phase.kind === "kickoff" && phase.stage === "forming") {
    const kicker = state.players.find(
      (p) => p.team === phase.kickingTeam && p.role === ROLES.FlyHalf,
    );

    if (kicker && state.ball.carrierId !== kicker.id) {
      // Referee spawns / carries the new match ball
      state.ball.carrierId = "referee";
      state.ball.flight = null;
      state.ball.position.x = state.referee.position.x;
      state.ball.position.y = 1.1;
      state.ball.position.z = state.referee.position.z;

      // Move towards the kicker within pitch bounds
      const targetX = clamp(kicker.position.x, -25, 25);
      const targetZ = clamp(kicker.position.z, -48, 48);
      const dx = targetX - state.referee.position.x;
      const dz = targetZ - state.referee.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= 1.5) {
        // Hand ball to kicker!
        carryBall(state, kicker);
        state.referee.velocity = { x: 0, z: 0 };
      } else {
        const speed = dist > 15 ? 7.5 : dist > 5 ? 5.5 : 3.5;
        state.referee.velocity = {
          x: (dx / dist) * speed,
          z: (dz / dist) * speed,
        };
        state.referee.position.x += state.referee.velocity.x * deltaSeconds;
        state.referee.position.z += state.referee.velocity.z * deltaSeconds;
      }
      updateAssistantReferees(state, deltaSeconds);
      return;
    }
  }

  // --- 2. SET PIECE MARKS: Referee is first to the mark ---
  if (phase.kind === "lineout") {
    const touchSide = phase.position.x < 0 ? -1 : 1;
    // Referee sprints directly to the 5m line mark of the lineout to set the tunnel
    const targetX = touchSide * (PITCH.touchLines.right - 5.0);
    const targetZ = phase.position.z;
    const dx = targetX - state.referee.position.x;
    const dz = targetZ - state.referee.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.3) {
      const speed = dist > 10 ? 7.8 : dist > 3 ? 5.8 : 3.5;
      state.referee.velocity = {
        x: (dx / dist) * speed,
        z: (dz / dist) * speed,
      };
      state.referee.position.x += state.referee.velocity.x * deltaSeconds;
      state.referee.position.z += state.referee.velocity.z * deltaSeconds;
    } else {
      state.referee.velocity = { x: 0, z: 0 };
    }
    updateAssistantReferees(state, deltaSeconds);
    return;
  }

  if (phase.kind === "scrum") {
    // Referee sprints directly to the scrum tunnel to manage engagement
    const targetX = clamp(phase.position.x + 2.2, -26, 26);
    const targetZ = phase.position.z;
    const dx = targetX - state.referee.position.x;
    const dz = targetZ - state.referee.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.3) {
      const speed = dist > 10 ? 7.8 : dist > 3 ? 5.8 : 3.5;
      state.referee.velocity = {
        x: (dx / dist) * speed,
        z: (dz / dist) * speed,
      };
      state.referee.position.x += state.referee.velocity.x * deltaSeconds;
      state.referee.position.z += state.referee.velocity.z * deltaSeconds;
    } else {
      state.referee.velocity = { x: 0, z: 0 };
    }
    updateAssistantReferees(state, deltaSeconds);
    return;
  }

  if (phase.kind === "penalty" && phase.stage === "decision") {
    // Referee stands right at the penalty mark
    const targetX = clamp(phase.position.x, -26, 26);
    const targetZ = phase.position.z;
    const dx = targetX - state.referee.position.x;
    const dz = targetZ - state.referee.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.3) {
      const speed = dist > 10 ? 7.8 : 5.2;
      state.referee.velocity = {
        x: (dx / dist) * speed,
        z: (dz / dist) * speed,
      };
      state.referee.position.x += state.referee.velocity.x * deltaSeconds;
      state.referee.position.z += state.referee.velocity.z * deltaSeconds;
    } else {
      state.referee.velocity = { x: 0, z: 0 };
    }
    updateAssistantReferees(state, deltaSeconds);
    return;
  }

  // --- 3. STANDARD MATCH REFEREE POSITIONING ---
  const ballPos = state.ball.carrierId
    ? (state.players.find((p) => p.id === state.ball.carrierId)?.position ??
      state.ball.position)
    : state.ball.position;
  const attackDir = attackDirection(state.possessionTeam);

  const refSide = ballPos.x >= 0 ? -5.5 : 5.5;
  const targetZ = clamp(
    ballPos.z - attackDir * 2.8,
    PITCH.tryLines.south + 3,
    PITCH.tryLines.north - 3,
  );
  let targetX = clamp(ballPos.x + refSide, -28, 28);

  const carrier = state.players.find((p) => p.id === state.ball.carrierId);
  if (carrier && distance(carrier.position, state.referee.position) < 4.0) {
    targetX += carrier.position.x >= state.referee.position.x ? -4.5 : 4.5;
  }

  const dx = targetX - state.referee.position.x;
  const dz = targetZ - state.referee.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.4) {
    const speed = dist > 12 ? 7.2 : dist > 5 ? 5.2 : 3.0;
    state.referee.velocity = {
      x: (dx / dist) * speed,
      z: (dz / dist) * speed,
    };
    state.referee.position.x += state.referee.velocity.x * deltaSeconds;
    state.referee.position.z += state.referee.velocity.z * deltaSeconds;
  } else {
    state.referee.velocity = { x: 0, z: 0 };
  }

  // --- 3. ASSISTANT REFEREES (TOUCH JUDGES) ---
  updateAssistantReferees(state, deltaSeconds);
};

const updateAssistantReferees = (state: GameState, deltaSeconds: number) => {
  if (!state.referee.assistants) return;

  const phase = state.phase;
  const isGoalKick =
    phase.kind === "conversion" ||
    (phase.kind === "penalty" && phase.choice === "goal");

  for (let i = 0; i < state.referee.assistants.length; i++) {
    const ar = state.referee.assistants[i];
    let targetX = ar.side === "west" ? -36.2 : 36.2;
    let targetZ = clamp(
      state.ball.position.z,
      PITCH.deadBallLines.south + 4,
      PITCH.deadBallLines.north - 4,
    );

    if (isGoalKick) {
      const kickingTeam =
        phase.kind === "conversion" ? phase.kickingTeam : phase.awardedTeam;
      const targetTryLine =
        kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
      const teamDir = attackDirection(kickingTeam);
      targetX = ar.side === "west" ? -3.5 : 3.5;
      targetZ = targetTryLine + teamDir * 3.5;
    }

    const dx = targetX - ar.position.x;
    const dz = targetZ - ar.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.3) {
      const speed = dist > 15 ? 7.0 : dist > 5 ? 5.0 : 3.2;
      ar.velocity = {
        x: (dx / dist) * speed,
        z: (dz / dist) * speed,
      };
      ar.position.x += ar.velocity.x * deltaSeconds;
      ar.position.z += ar.velocity.z * deltaSeconds;
    } else {
      ar.velocity = { x: 0, z: 0 };
    }
  }
};
