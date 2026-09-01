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

export const startLineout = (
  state: GameState,
  throwingTeam: Team,
  z: number,
  x: number,
) => {
  if (state.ball.kickerId) {
    const kicker =
      state.players.find((p) => p.id === state.ball.kickerId) ??
      state.substitutes.find((s) => s.id === state.ball.kickerId);
    if (kicker) kicker.stats.successfulKicks += 1;
  }

  const touchSide = Math.sign(x) || 1;

  // Outgoing ball remains visible while lineout formation later supplies a replacement ball.
  state.ball.carrierId = null;
  state.pendingClearanceKickerId = null;
  state.pendingLineoutTeam = null;
  state.possessionTeam = throwingTeam;
  state.phaseCount = 1;
  state.possessionOriginZ = z;
  state.gainLineZ = z;
  state.distanceGained = 0;
  state.phase = {
    kind: "lineout",
    stage: "forming",
    position: { x: touchSide * PITCH.touchLines.right, z },
    throwingTeam,
    elapsed: 0,
  };
};
