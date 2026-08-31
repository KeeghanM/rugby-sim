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

export const carryBall = (state: GameState, player: Player) => {
  // Check pass completion
  if (state.ball.passerId) {
    if (player.team === state.ball.lastTouchedTeam) {
      const passer =
        state.players.find((p) => p.id === state.ball.passerId) ??
        state.substitutes.find((s) => s.id === state.ball.passerId);
      if (passer) passer.stats.successfulPasses += 1;
    }
  }
  // Check kick regather
  if (state.ball.kickerId) {
    if (
      player.team === state.ball.lastTouchedTeam &&
      player.id !== state.ball.kickerId
    ) {
      const kicker =
        state.players.find((p) => p.id === state.ball.kickerId) ??
        state.substitutes.find((s) => s.id === state.ball.kickerId);
      if (kicker) kicker.stats.successfulKicks += 1;
    }
  }

  // Cancel stale preparations whenever possession changes hands.
  for (const candidate of state.players) candidate.pendingBallAction = null;
  state.ball.carrierId = player.id;
  state.ball.flight = null;
  state.ball.intendedReceiverId = null;
  state.ball.passerId = null;
  state.ball.kickerId = null;
  state.ball.velocity = { x: 0, y: 0, z: 0 };
  state.ball.position = { ...player.position, y: 1.25 };
  state.ball.lastTouchedTeam = player.team;
  state.ball.kickOrigin = null;
  state.ball.bouncesRemaining = 0;
  state.pendingLineoutTeam = null;
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
