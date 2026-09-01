import { attackDirection, type GameState, PITCH } from "../../domain.ts";
import { updateBall } from "../ball.ts";
import { clamp, desiredVelocity } from "../math.ts";
import {
  attemptTackle,
  scoreTry,
  updateConversion,
  updateKickoff,
  updateLineout,
  updateMaul,
  updatePenalty,
  updateRuck,
  updateScrum,
} from "../phases.ts";
import type { PlayerCommand, Random } from "../types.ts";
import { separatedVelocity } from "./collisions.ts";
import { updateStamina } from "./stamina.ts";
import { prepareBallAction, resolvePreparedAction } from "./ball-actions.ts";
import { updateReferee } from "./referee.ts";
import { updateMatchClock } from "./clock.ts";
import { updateSubstitutions } from "./substitutions.ts";

export { advanceDefensiveLine } from "./defensive-line.ts";

export const applyCommands = (
  state: GameState,
  commands: PlayerCommand[],
  deltaSeconds: number,
  random: Random = Math.random,
) => {
  if (state.half === "fullTime") {
    state.ball.velocity = { x: 0, y: 0, z: 0 };
    state.ball.flight = null;
    return;
  }
  const commandedPlayers = new Set<string>();
  const nextMotion = commands.map((next) => {
    if (commandedPlayers.has(next.playerId)) {
      throw new Error(`Duplicate command for player ${next.playerId}`);
    }
    commandedPlayers.add(next.playerId);
    const player = state.players.find(({ id }) => id === next.playerId);
    if (!player)
      throw new Error(`Command references unknown player ${next.playerId}`);
    if (next.lineBreakActive !== undefined) {
      if (next.lineBreakActive && !player.lineBreakActive) {
        player.stats.lineBreaks += 1;
      }
      player.lineBreakActive = next.lineBreakActive;
    }
    player.tackleCooldown = Math.max(0, player.tackleCooldown - deltaSeconds);
    player.breakawaySeconds = Math.max(
      0,
      player.breakawaySeconds - deltaSeconds,
    );
    player.hardLineForSeconds = next.startHardLine
      ? 1.5
      : Math.max(0, player.hardLineForSeconds - deltaSeconds);
    player.ruckRecoverySeconds = Math.max(
      0,
      player.ruckRecoverySeconds - deltaSeconds * 6,
    );
    player.decisionForSeconds =
      next.decisionForSeconds ??
      Math.max(0, player.decisionForSeconds - deltaSeconds);
    player.intentForSeconds = Math.max(
      0,
      player.intentForSeconds - deltaSeconds,
    );
    updateStamina(state, player, next, deltaSeconds);
    if (
      next.immediate ||
      player.intentKind !== next.intentKind ||
      player.intentForSeconds === 0
    ) {
      player.intentTarget = { ...next.target };
      player.intentKind = next.intentKind;
      player.intentForSeconds = 0.35 + (player.number % 4) * 0.07;
    }
    if (next.freeze) {
      return { player, velocity: { x: 0, z: 0 } };
    }
    const desired = separatedVelocity(
      state,
      player,
      desiredVelocity(player, player.intentTarget, next.effort),
    );
    const maxChange = 7 * deltaSeconds;
    const changeX = desired.x - player.velocity.x;
    const changeZ = desired.z - player.velocity.z;
    const changeLength = Math.hypot(changeX, changeZ);
    const scale =
      changeLength > maxChange && changeLength > 0
        ? maxChange / changeLength
        : 1;
    return {
      player,
      velocity: {
        x: player.velocity.x + changeX * scale,
        z: player.velocity.z + changeZ * scale,
      },
    };
  });

  for (const motion of nextMotion) {
    const distTraveled = Math.hypot(
      motion.velocity.x * deltaSeconds,
      motion.velocity.z * deltaSeconds,
    );
    motion.player.stats.distanceCovered += distTraveled;
    if (motion.player.id === state.ball.carrierId) {
      motion.player.stats.distanceCarried += distTraveled;
    }
    motion.player.velocity = motion.velocity;
    motion.player.position.x = clamp(
      motion.player.position.x + motion.velocity.x * deltaSeconds,
      PITCH.touchLines.left,
      PITCH.touchLines.right,
    );
    motion.player.position.z = clamp(
      motion.player.position.z + motion.velocity.z * deltaSeconds,
      PITCH.deadBallLines.south,
      PITCH.deadBallLines.north,
    );
  }

  const carrier = state.players.find(
    (player) => player.id === state.ball.carrierId,
  );
  if (state.phase.kind === "openPlay" && carrier) {
    const scored =
      carrier.team === 0
        ? carrier.position.z >= PITCH.tryLines.north
        : carrier.position.z <= PITCH.tryLines.south;
    if (scored) {
      scoreTry(state, carrier.team, random);
      return;
    }
  }

  const carrierCommand = commands.find((next) => next.playerId === carrier?.id);
  if (carrier && carrierCommand) {
    const wasPreparing = carrier.pendingBallAction !== null;
    prepareBallAction(carrier, carrierCommand);
    if (wasPreparing)
      resolvePreparedAction(state, carrier, deltaSeconds, random);
  }

  if (
    state.ball.flight !== null ||
    state.phase.kind === "openPlay" ||
    (state.phase.kind === "kickoff" && state.phase.stage === "inFlight") ||
    (state.phase.kind === "lineout" && state.phase.stage === "inFlight") ||
    (state.phase.kind === "conversion" && state.phase.stage === "inFlight") ||
    (state.phase.kind === "penalty" && state.phase.stage === "inFlight")
  ) {
    updateBall(state, deltaSeconds, random);
  }

  if (state.phase.kind === "openPlay") {
    const currentCarrier = state.players.find(
      (player) => player.id === state.ball.carrierId,
    );
    if (currentCarrier && attemptTackle(state, random)) return;
  }

  updateRuck(state, deltaSeconds, random);
  updateKickoff(state, deltaSeconds, random);
  updateLineout(state, deltaSeconds, random);
  updateMaul(state, deltaSeconds, random);
  updateScrum(state, deltaSeconds, random);
  updateConversion(state, deltaSeconds, random);
  updatePenalty(state, deltaSeconds, random);
  updateReferee(state, deltaSeconds);
  updateMatchClock(state, deltaSeconds);
  updateSubstitutions(state);
};
