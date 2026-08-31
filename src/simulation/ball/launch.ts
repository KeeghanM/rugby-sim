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

export const launchBall = (
  state: GameState,
  carrier: Player,
  target: Position,
  flight: "pass" | "kick" | "kickoff" | "lineout" | "grubber" | "dropGoal",
  intendedReceiverId: string | null,
  random: Random = Math.random,
) => {
  const isKicking =
    flight === "kick" ||
    flight === "kickoff" ||
    flight === "grubber" ||
    flight === "dropGoal";

  if (flight === "pass" || flight === "lineout") {
    carrier.stats.totalPasses += 1;
  } else if (isKicking) {
    carrier.stats.totalKicks += 1;
  }

  const skill = isKicking
    ? effectiveSkill(carrier, "kicking")
    : effectiveSkill(carrier, "passing");
  const error =
    (1 - skill) *
    (flight === "pass" || flight === "lineout"
      ? 5
      : flight === "grubber"
        ? 8
        : 18);
  const actualTarget = {
    x: target.x + (random() - 0.5) * error,
    z: target.z + (random() - 0.5) * error,
  };
  const horizontalDistance = distance(carrier.position, actualTarget);
  const isGrubber = flight === "grubber";
  const duration =
    flight === "pass" || flight === "lineout"
      ? Math.max(0.35, horizontalDistance / 14)
      : isGrubber
        ? Math.max(0.65, horizontalDistance / 16)
        : flight === "dropGoal"
          ? 1.8
          : 2.2;
  state.ball = {
    position: { ...carrier.position, y: isGrubber ? 0.35 : 1.25 },
    velocity: {
      x: (actualTarget.x - carrier.position.x) / duration,
      y: isGrubber ? 1.4 : (GRAVITY * duration) / 2,
      z: (actualTarget.z - carrier.position.z) / duration,
    },
    carrierId: null,
    flight,
    intendedReceiverId,
    lastTouchedTeam: carrier.team,
    passerId: flight === "pass" || flight === "lineout" ? carrier.id : null,
    kickerId: isKicking ? carrier.id : null,
    kickOrigin: isKicking ? { ...carrier.position } : null,
    bouncesRemaining: isGrubber ? 4 : isKicking ? 2 : 0,
  };
  // Mark teammates ahead of kicker offside for all kick flights.
  if (isKicking) {
    const direction = attackDirection(carrier.team);
    for (const player of state.players) {
      player.kickOffside =
        player.team === carrier.team &&
        player.id !== carrier.id &&
        (player.position.z - carrier.position.z) * direction > 0;
    }
  }
};

// Converts a ball crossing dead-ball line into defending goal-line dropout.
