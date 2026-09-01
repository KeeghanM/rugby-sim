import {
  attackDirection,
  type GameState,
  otherTeam,
  PITCH,
  type Player,
  type Position,
  ROLES,
  type Team,
} from "../../../domain.ts";
import {
  getKickoffTarget,
  getLineoutTarget,
  getScrumTarget,
  isForward,
  LINEOUT_MEMBER_VARIANTS,
} from "../../../formations/index.ts";
import { carryBall, launchBall, startGoalLineDropout } from "../../ball.ts";
import { scoreTry } from "../conversion.ts";
import { startPenalty } from "../penalty.ts";
import { groupStrength, teamDecision } from "../utils.ts";
import {
  clamp,
  contactStrength,
  distance,
  effectiveSkill,
  GRAVITY,
  insideOwnTwentyTwo,
  overallSkill,
} from "../../math.ts";
import type { Random } from "../../types.ts";

export const executeRuckPlay = (state: GameState, random: Random) => {
  const phase = state.phase;
  // Ignore execution after phase changed away from ruck.
  if (phase.kind !== "ruck") return;
  const team = phase.winningTeam ?? phase.attackingTeam;
  const isAvailable = (p: Player) =>
    !phase.joinedAttackers.includes(p.id) &&
    !phase.joinedDefenders.includes(p.id) &&
    p.id !== phase.tackledPlayerId &&
    p.id !== phase.tacklerId;

  // Find primary halfback (9), or fallback to nearest available back/player if 9 is in ruck
  const preferredHalf = state.players.find(
    (p) => p.team === team && p.role === ROLES.ScrumHalf && isAvailable(p),
  );
  const distributor =
    preferredHalf ??
    state.players
      .filter((p) => p.team === team && isAvailable(p))
      .sort(
        (a, b) =>
          distance(a.position, phase.position) -
          distance(b.position, phase.position),
      )[0];
  // Wait when winning team has no available distributor.
  if (!distributor) return;

  // Place distributor right at the base of the ruck to collect ball from ground
  const teamDir = attackDirection(team);
  distributor.position.x = phase.position.x;
  distributor.position.z = clamp(
    phase.position.z - teamDir * 1.1,
    PITCH.deadBallLines.south + 1,
    PITCH.deadBallLines.north - 1,
  );
  distributor.velocity = { x: 0, z: 0 };

  // Staggered stand-up in reverse order of joining the ruck:
  // Last joiner peels off first, earlier cleaners follow, tackled player stands up last.
  const reversedJoiners = [...phase.joinOrder].reverse();
  reversedJoiners.forEach((playerId, index) => {
    const player = state.players.find((p) => p.id === playerId);
    if (player && playerId !== phase.tackledPlayerId) {
      player.ruckRecoverySeconds =
        (0.6 + index * 0.6) * (1.2 - overallSkill(player) * 0.4);
    }
  });

  const tackledPlayer = state.players.find(
    (p) => p.id === phase.tackledPlayerId,
  );
  if (tackledPlayer) {
    tackledPlayer.ruckRecoverySeconds = 1.8 + reversedJoiners.length * 0.4;
  }

  // Free any player who was targeting but never actually joined
  for (const player of state.players) {
    if (
      !phase.joinOrder.includes(player.id) &&
      player.id !== phase.tackledPlayerId &&
      player.id !== phase.tacklerId &&
      player.ruckRecoverySeconds > 50
    ) {
      player.ruckRecoverySeconds = 0;
    }
  }

  // Update attack phase count and move gainline to this ruck mark
  if (team === state.possessionTeam) {
    state.phaseCount += 1;
    state.gainLineZ = phase.position.z;
  } else {
    state.possessionTeam = team;
    state.phaseCount = 1;
    state.possessionOriginZ = phase.position.z;
    state.gainLineZ = phase.position.z;
    state.distanceGained = 0;
  }

  // Give ball to nearest runner for pick-and-go.
  if (phase.play === "pickAndGo") {
    const runner = state.players
      .filter((player) => player.team === team && isAvailable(player))
      .sort(
        (a, b) =>
          distance(a.position, phase.position) -
          distance(b.position, phase.position),
      )[0];
    if (runner) {
      runner.stamina = clamp(runner.stamina - 0.3, 0, 100);
      carryBall(state, runner);
    } else {
      carryBall(state, distributor);
    }
    // Launch contestable box kick downfield from distributor.
  } else if (phase.play === "boxKick") {
    distributor.stamina = clamp(distributor.stamina - 0.8, 0, 100);
    launchBall(
      state,
      distributor,
      {
        x: clamp(distributor.position.x + (random() - 0.5) * 12, -30, 30),
        z: distributor.position.z + attackDirection(team) * (28 + random() * 8),
      },
      "kick",
      null,
      random,
    );
    // Pass to fly-half or nearest first receiver.
  } else {
    const receiver = state.players
      .filter(
        (player) =>
          player.team === team &&
          player.id !== distributor.id &&
          isAvailable(player),
      )
      .sort((a, b) => {
        const aFly = a.role === ROLES.FlyHalf ? 0 : 1;
        const bFly = b.role === ROLES.FlyHalf ? 0 : 1;
        return (
          aFly - bFly ||
          distance(a.position, phase.position) -
            distance(b.position, phase.position)
        );
      })[0];
    if (receiver) {
      distributor.stamina = clamp(distributor.stamina - 0.25, 0, 100);
      launchBall(
        state,
        distributor,
        receiver.position,
        "pass",
        receiver.id,
        random,
      );
      if (phase.play === "clearance")
        state.pendingClearanceKickerId = receiver.id;
    } else {
      carryBall(state, distributor);
    }
  }
  state.phase = { kind: "openPlay" };
};

// Advances ruck through arrivals, security, availability, and release.
