import { attackDirection, type GameState, otherTeam } from "../../domain.ts";
import { effectiveSkill } from "../math.ts";

export const advanceDefensiveLine = (
  state: GameState,
  deltaSeconds: number,
) => {
  if (state.half === "fullTime") return;
  if (state.phase.kind === "ruck") {
    const direction = attackDirection(state.phase.attackingTeam);
    state.defensiveLineZ[otherTeam(state.phase.attackingTeam)] =
      state.phase.position.z + direction * 0.5;
    return;
  }
  if (state.phase.kind !== "openPlay") return;
  const carrier = state.players.find(
    (player) => player.id === state.ball.carrierId,
  );
  if (!carrier) return;
  const direction = attackDirection(carrier.team);
  const defendingTeam = otherTeam(carrier.team);
  const currentLine = state.defensiveLineZ[defendingTeam];
  if ((carrier.position.z - currentLine) * direction > 0.5) return;
  const limit = carrier.position.z + direction * 0.5;
  const defenders = state.players.filter(
    (player) => player.team === defendingTeam,
  );
  const defensiveSkill =
    defenders.reduce(
      (total, player) =>
        total +
        effectiveSkill(player, "tackling") * 0.6 +
        effectiveSkill(player, "decision") * 0.4,
      0,
    ) / Math.max(1, defenders.length);
  const advanced =
    currentLine -
    direction *
      state.teams[defendingTeam].lineSpeed *
      (0.65 + defensiveSkill * 0.5) *
      deltaSeconds;
  state.defensiveLineZ[defendingTeam] =
    direction === 1 ? Math.max(limit, advanced) : Math.min(limit, advanced);
};
