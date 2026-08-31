import type { Position } from "../domain.ts";

export type BallAction =
  | { kind: "pass"; receiverId: string; clearance?: boolean }
  | { kind: "kick"; target: Position; flight?: "kick" | "kickoff" | "lineout" };

export type Effort = "stand" | "jog" | "run" | "sprint";

export type PlayerCommand = {
  playerId: string;
  target: Position;
  intentKind: string;
  immediate?: boolean;
  ballAction?: BallAction;
  startHardLine?: boolean;
  decisionForSeconds?: number;
  effort: Effort;
};

export type Random = () => number;
