import type { GameState, Player, Position } from "../../domain.ts";
import { isForward } from "../../formations/index.ts";
import { distance } from "../math.ts";

export const separatedVelocity = (
  state: GameState,
  player: Player,
  velocity: Position,
): Position => {
  const phase = state.phase;
  if (
    (phase.kind === "kickoff" && phase.stage === "forming") ||
    (phase.kind === "penalty" && phase.stage === "decision") ||
    (phase.kind === "conversion" && phase.stage === "forming")
  ) {
    return velocity;
  }

  let x = velocity.x;
  let z = velocity.z;
  const isCarrier = player.id === state.ball.carrierId;

  const ruckPhase = state.phase.kind === "ruck" ? state.phase : null;
  const maulPhase = state.phase.kind === "maul" ? state.phase : null;
  const isScrum = state.phase.kind === "scrum";

  const isPlayerRuckBound =
    ruckPhase !== null &&
    (ruckPhase.attackers.includes(player.id) ||
      ruckPhase.defenders.includes(player.id) ||
      player.id === ruckPhase.tackledPlayerId ||
      player.id === ruckPhase.tacklerId);

  const isPlayerScrumBound = isScrum && isForward(player);
  const isPlayerMaulBound =
    maulPhase !== null &&
    (maulPhase.attackers.includes(player.id) ||
      maulPhase.defenders.includes(player.id));

  for (const other of state.players) {
    if (other.id === player.id) continue;
    const gap = distance(player.position, other.position);
    if (gap === 0) continue;

    const isOtherRuckBound =
      ruckPhase !== null &&
      (ruckPhase.attackers.includes(other.id) ||
        ruckPhase.defenders.includes(other.id) ||
        other.id === ruckPhase.tackledPlayerId ||
        other.id === ruckPhase.tacklerId);

    const isOtherScrumBound = isScrum && isForward(other);
    const isOtherMaulBound =
      maulPhase !== null &&
      (maulPhase.attackers.includes(other.id) ||
        maulPhase.defenders.includes(other.id));

    if (
      (isPlayerRuckBound && isOtherRuckBound) ||
      (isPlayerScrumBound && isOtherScrumBound) ||
      (isPlayerMaulBound && isOtherMaulBound)
    ) {
      // Bound groups may overlap because their collective contest is resolved by phase logic.
      continue;
    }

    const bodyRadius = (player.weight + other.weight) / 200;
    if (gap < bodyRadius) {
      // Combined weight serves as body-radius proxy; penetration depth sets separation force.
      const push = (bodyRadius - gap) * 3.5;
      x += ((player.position.x - other.position.x) / gap) * push;
      z += ((player.position.z - other.position.z) / gap) * push;
      continue;
    }

    if (other.team === player.team && gap < 2.5) {
      const weight = isCarrier ? 0.6 : 1.8;
      // Carrier receives weaker separation so close support can track without steering ball path.
      x +=
        ((player.position.x - other.position.x) / gap) * (2.5 - gap) * weight;
      if (!isCarrier) {
        z +=
          ((player.position.z - other.position.z) / gap) * (2.5 - gap) * weight;
      }
    }
  }

  const refGap = distance(player.position, state.referee.position);
  // Referee uses fixed smaller clearance radius rather than player mass.
  if (refGap > 0 && refGap < 1.4) {
    x +=
      ((player.position.x - state.referee.position.x) / refGap) *
      (1.4 - refGap) *
      2.2;
    z +=
      ((player.position.z - state.referee.position.z) / refGap) *
      (1.4 - refGap) *
      2.2;
  }

  return { x, z };
};
