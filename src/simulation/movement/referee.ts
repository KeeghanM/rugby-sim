import { attackDirection, PITCH, type GameState } from "../../domain.ts";
import { clamp, distance } from "../math.ts";

export const updateReferee = (state: GameState, deltaSeconds: number) => {
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
};
