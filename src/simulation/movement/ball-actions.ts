import { attackDirection, otherTeam, type Player } from "../../domain.ts";
import type { GameState } from "../../domain.ts";
import { clamp, distance, effectiveSkill } from "../math.ts";
import { launchBall } from "../ball.ts";
import { startScrum } from "../phases.ts";
import type { PlayerCommand, Random } from "../types.ts";

const actionDelay = (player: Player, kind: "pass" | "kick") => {
  const skill = effectiveSkill(player, kind === "pass" ? "passing" : "kicking");
  const baseSeconds = kind === "pass" ? 0.7 : 1.2;
  const fatigueMultiplier = 1 + (1 - player.stamina / 100) * 0.8;
  return baseSeconds * (1.4 - skill * 0.65) * fatigueMultiplier;
};

export const prepareBallAction = (player: Player, next: PlayerCommand) => {
  const action = next.ballAction;
  if (!action || player.pendingBallAction) return;
  if (action.kind === "pass") {
    player.pendingBallAction = {
      kind: "pass",
      receiverId: action.receiverId,
      clearance: action.clearance ?? false,
      remainingSeconds: actionDelay(player, "pass"),
    };
    return;
  }
  player.pendingBallAction = {
    kind: "kick",
    target: { ...action.target },
    flight: action.flight ?? "kick",
    remainingSeconds: actionDelay(player, "kick"),
  };
};

export const resolvePreparedAction = (
  state: GameState,
  carrier: Player,
  deltaSeconds: number,
  random: Random,
) => {
  const pending = carrier.pendingBallAction;
  if (!pending) return;
  pending.remainingSeconds -= deltaSeconds;
  if (pending.remainingSeconds > 0) return;
  carrier.pendingBallAction = null;
  if (pending.kind === "pass") {
    const receiver = state.players.find(
      (player) =>
        player.id === pending.receiverId &&
        player.team === carrier.team &&
        player.ruckRecoverySeconds === 0,
    );
    if (!receiver) return;
    const passDepth =
      (receiver.position.z - carrier.position.z) *
      attackDirection(carrier.team);
    if (passDepth > 1.4) {
      carrier.stats.forwardPasses += 1;
      startScrum(state, otherTeam(carrier.team), carrier.position, random);
      return;
    }
    carrier.stamina = clamp(carrier.stamina - 0.25, 0, 100);
    launchBall(state, carrier, receiver.position, "pass", receiver.id, random);
    if (pending.clearance) state.pendingClearanceKickerId = receiver.id;
    return;
  }
  const direction = attackDirection(carrier.team);
  const chargingDefender = state.players.find(
    (p) =>
      p.team !== carrier.team &&
      p.ruckRecoverySeconds === 0 &&
      distance(p.position, carrier.position) <= 2.2 &&
      (p.position.z - carrier.position.z) * direction > -0.3,
  );

  if (chargingDefender) {
    const dist = distance(chargingDefender.position, carrier.position);
    const isChargedDown =
      random() <
      (dist < 1.4 ? 0.42 : 0.2) *
        (1.25 - effectiveSkill(carrier, "kicking") * 0.75);
    if (isChargedDown) {
      carrier.stamina = clamp(carrier.stamina - 0.6, 0, 100);
      chargingDefender.stamina = clamp(chargingDefender.stamina - 0.4, 0, 100);
      state.ball = {
        position: { ...carrier.position, y: 0.8 },
        velocity: {
          x: (random() - 0.5) * 8,
          y: 1.4,
          z: -direction * (6 + random() * 8),
        },
        carrierId: null,
        flight: "rolling",
        intendedReceiverId: null,
        lastTouchedTeam: carrier.team,
        passerId: null,
        kickerId: carrier.id,
        kickOrigin: { ...carrier.position },
        bouncesRemaining: 3,
      };
      state.pendingClearanceKickerId = null;
      state.recentSubstitution = `CHARGED DOWN by #${chargingDefender.number} (${chargingDefender.role})!`;
      return;
    }
  }

  carrier.stamina = clamp(carrier.stamina - 0.8, 0, 100);
  launchBall(state, carrier, pending.target, pending.flight, null, random);
  state.pendingClearanceKickerId = null;
};
