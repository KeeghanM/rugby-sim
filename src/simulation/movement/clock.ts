import { attackDirection, type GameState } from "../../domain.ts";

export const updateMatchClock = (state: GameState, deltaSeconds: number) => {
  const currentBallZ = state.ball.carrierId
    ? (state.players.find((p) => p.id === state.ball.carrierId)?.position.z ??
      state.ball.position.z)
    : state.ball.position.z;
  state.distanceGained =
    (currentBallZ - state.possessionOriginZ) *
    attackDirection(state.possessionTeam);

  if (state.half === "fullTime") return;
  const isPreKickoff =
    state.phase.kind === "kickoff" &&
    state.phase.stage !== "inFlight" &&
    (state.phase.reason === "matchStart" || state.phase.reason === "halfTime");
  // Match time starts with kickoff rather than during pre-match or halftime formation.
  if (isPreKickoff) return;

  // Six simulated match seconds per rendered second keeps full matches practical to watch.
  state.matchClockSeconds += deltaSeconds * 6;

  const isDeadBall =
    state.phase.kind !== "openPlay" &&
    state.phase.kind !== "ruck" &&
    state.phase.kind !== "maul" &&
    state.phase.kind !== "conversion";

  // Laws 5 and 6 allow play beyond 40 or 80 minutes until ball next becomes dead.
  if (state.half === 1 && state.matchClockSeconds >= 2400 && isDeadBall) {
    state.half = 2;
    state.matchClockSeconds = 2400;
    state.ball.carrierId = null;
    state.ball.flight = null;
    state.phase = {
      kind: "kickoff",
      stage: "forming",
      kickingTeam: 0,
      readyForSeconds: 0,
      reason: "halfTime",
    };
    return;
  }

  if (state.half === 2 && state.matchClockSeconds >= 4800 && isDeadBall) {
    state.half = "fullTime";
    state.matchClockSeconds = 4800;
  }
};
