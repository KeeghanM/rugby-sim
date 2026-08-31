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

export const startGoalLineDropout = (state: GameState, z: number) => {
  const defendingTeam: Team = z < 0 ? 0 : 1;
  state.ball = {
    position: {
      x: 0,
      y: 0.15,
      z: defendingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north,
    },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: defendingTeam,
    passerId: null,
    kickerId: null,
    kickOrigin: null,
    bouncesRemaining: 0,
  };
  state.pendingClearanceKickerId = null;
  state.pendingLineoutTeam = null;
  state.phase = {
    kind: "kickoff",
    stage: "forming",
    kickingTeam: defendingTeam,
    readyForSeconds: 0,
    reason: "goalLineDropout",
  };
};

// Transfers grounded or caught ball into player possession.
