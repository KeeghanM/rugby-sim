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

export const startLineout = (
  state: GameState,
  throwingTeam: Team,
  z: number,
  x: number,
) => {
  // Successful touch-finding kick
  if (state.ball.kickerId) {
    const kicker =
      state.players.find((p) => p.id === state.ball.kickerId) ??
      state.substitutes.find((s) => s.id === state.ball.kickerId);
    if (kicker) kicker.stats.successfulKicks += 1;
  }

  const touchSide = Math.sign(x) || 1;

  // Let the old ball naturally fly/bounce out of bounds while the lineout is established
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

// Advances ball possession, flight, catches, drops, touch, and landing.
