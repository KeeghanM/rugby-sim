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
import { resetContactPlayers } from "../contact.ts";

export const startGoalLineDropout = (state: GameState, z: number) => {
  resetContactPlayers(state);
  const defendingTeam: Team = z < 0 ? 0 : 1;
  // Goal-line dropout is assigned to defending side; formation flow supplies replacement ball later.
  state.ball.carrierId = null;
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
