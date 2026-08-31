import { attackDirection, type GameState, otherTeam, PITCH, type Player, type Position } from "../domain.ts";
import { TEAMS } from "../teams.ts";
import { updateBall, launchBall } from "./ball.ts";
import { clamp, desiredVelocity, distance, effectiveSkill, maxStamina } from "./math.ts";
import {
  attemptTackle,
  scoreTry,
  startScrum,
  updateConversion,
  updateKickoff,
  updateLineout,
  updatePenalty,
  updateRuck,
  updateScrum,
} from "./phases.ts";
import type { PlayerCommand, Random } from "./types.ts";

// Advances current defensive line from phase and carrier position.
export const advanceDefensiveLine = (state: GameState, deltaSeconds: number) => {
  // Anchor defending line directly at ruck hindmost offside line
  if (state.phase.kind === "ruck") {
    const direction = attackDirection(state.phase.attackingTeam);
    state.defensiveLineZ[otherTeam(state.phase.attackingTeam)] =
      state.phase.position.z + direction * 0.5;
    return;
  }
  // Leave line unchanged outside open play.
  if (state.phase.kind !== "openPlay") return;
  const carrier = state.players.find((player) => player.id === state.ball.carrierId);
  // Leave line unchanged without ball carrier reference.
  if (!carrier) return;
  const direction = attackDirection(carrier.team);
  const defendingTeam = otherTeam(carrier.team);
  const limit = carrier.position.z + direction * 0.5;
  const advanced = state.defensiveLineZ[defendingTeam] - direction * TEAMS[defendingTeam].lineSpeed * deltaSeconds;
  state.defensiveLineZ[defendingTeam] = direction === 1 ? Math.max(limit, advanced) : Math.min(limit, advanced);
};

// Adds teammate separation and physical collision anti-clipping pushing between players and referee.
const separatedVelocity = (state: GameState, player: Player, velocity: Position): Position => {
  let x = velocity.x;
  let z = velocity.z;
  const isCarrier = player.id === state.ball.carrierId;

  for (const other of state.players) {
    if (other.id === player.id) continue;
    const gap = distance(player.position, other.position);
    if (gap === 0) continue;

    // Physical body anti-clipping collision radius (~0.9m - 1.2m based on player weight)
    const bodyRadius = (player.weight + other.weight) / 200;
    if (gap < bodyRadius) {
      const push = (bodyRadius - gap) * 3.5;
      x += ((player.position.x - other.position.x) / gap) * push;
      z += ((player.position.z - other.position.z) / gap) * push;
      continue;
    }

    // Teammate lane spacing separation (up to 2.5m)
    if (other.team === player.team && gap < 2.5) {
      const weight = isCarrier ? 0.6 : 1.8;
      x += ((player.position.x - other.position.x) / gap) * (2.5 - gap) * weight;
      if (!isCarrier) {
        z += ((player.position.z - other.position.z) / gap) * (2.5 - gap) * weight;
      }
    }
  }

  // Avoid referee collision
  const refGap = distance(player.position, state.referee.position);
  if (refGap > 0 && refGap < 1.4) {
    x += ((player.position.x - state.referee.position.x) / refGap) * (1.4 - refGap) * 2.2;
    z += ((player.position.z - state.referee.position.z) / refGap) * (1.4 - refGap) * 2.2;
  }

  return { x, z };
};

// Applies effort cost or weight/skill-scaled low-intensity recovery capped by match time.
const updateStamina = (
  state: GameState,
  player: Player,
  next: PlayerCommand,
  deltaSeconds: number,
) => {
  const atTarget = distance(player.position, next.target) < 0.35;
  const weightFactor = Math.max(0.35, 1 - (player.weight - 70) / 110);
  const skillFactor = 0.65 + player.skills.decision * 0.35;
  const recoveryEfficiency = weightFactor * skillFactor;

  const baseRate =
    atTarget || next.effort === "stand"
      ? 0.32
      : next.effort === "jog"
        ? 0.08
        : next.effort === "sprint"
          ? -2.2
          : -0.55;

  const rate = baseRate > 0 ? baseRate * recoveryEfficiency : baseRate;
  const ceiling = maxStamina(player, state.matchClockSeconds);
  player.stamina = clamp(player.stamina + rate * deltaSeconds, 0, ceiling);
};

// Calculates visible preparation time from action complexity, skill, and fatigue.
const actionDelay = (player: Player, kind: "pass" | "kick") => {
  const skill = effectiveSkill(
    player,
    kind === "pass" ? "passing" : "kicking",
  );
  const baseSeconds = kind === "pass" ? 0.7 : 1.2;
  const fatigueMultiplier = 1 + (1 - player.stamina / 100) * 0.8;
  return baseSeconds * (1.4 - skill * 0.65) * fatigueMultiplier;
};

// Starts a committed pass or kick without releasing ball in decision frame.
const prepareBallAction = (player: Player, next: PlayerCommand) => {
  const action = next.ballAction;
  // Keep current preparation when command contains no new ball action.
  if (!action || player.pendingBallAction) return;
  // Store receiver and clearance intent for delayed pass execution.
  if (action.kind === "pass") {
    player.pendingBallAction = {
      kind: "pass",
      receiverId: action.receiverId,
      clearance: action.clearance ?? false,
      remainingSeconds: actionDelay(player, "pass"),
    };
    return;
  }
  // Store target and kick type for delayed kick execution.
  player.pendingBallAction = {
    kind: "kick",
    target: { ...action.target },
    flight: action.flight ?? "kick",
    remainingSeconds: actionDelay(player, "kick"),
  };
};

// Resolves prepared action once countdown completes and possession remains valid.
const resolvePreparedAction = (
  state: GameState,
  carrier: Player,
  deltaSeconds: number,
  random: Random,
) => {
  const pending = carrier.pendingBallAction;
  // Leave carrier unchanged while no preparation exists.
  if (!pending) return;
  pending.remainingSeconds -= deltaSeconds;
  // Keep holding ball until skill/stamina-derived preparation finishes.
  if (pending.remainingSeconds > 0) return;
  carrier.pendingBallAction = null;
  // Release delayed pass only to eligible teammate outside ruck recovery.
  if (pending.kind === "pass") {
    const receiver = state.players.find(
      (player) =>
        player.id === pending.receiverId &&
        player.team === carrier.team &&
        player.ruckRecoverySeconds === 0,
    );
    // Cancel pass when receiver became unavailable during preparation.
    if (!receiver) return;
    // Whistle for forward pass if pass vector travels forward relative to team attack direction
    const passDepth =
      (receiver.position.z - carrier.position.z) * attackDirection(carrier.team);
    if (passDepth > 1.4) {
      startScrum(state, otherTeam(carrier.team), carrier.position);
      return;
    }
    carrier.stamina = clamp(carrier.stamina - 0.25, 0, 100);
    launchBall(state, carrier, receiver.position, "pass", receiver.id, random);
    // Preserve planned clearance after delayed transfer reaches kicker.
    if (pending.clearance) state.pendingClearanceKickerId = receiver.id;
    return;
  }
  carrier.stamina = clamp(carrier.stamina - 0.8, 0, 100);
  launchBall(state, carrier, pending.target, pending.flight, null, random);
  state.pendingClearanceKickerId = null;
};

// Applies commands, movement, ball actions, tackles, and phase updates for one tick.
export const applyCommands = (
  state: GameState,
  commands: PlayerCommand[],
  deltaSeconds: number,
  random: Random = Math.random,
) => {
  const nextMotion = commands.map((next) => {
    const player = state.players.find(({ id }) => id === next.playerId)!;
    player.tackleCooldown = Math.max(0, player.tackleCooldown - deltaSeconds);
    player.hardLineForSeconds = next.startHardLine ? 1.5 : Math.max(0, player.hardLineForSeconds - deltaSeconds);
    player.ruckRecoverySeconds = Math.max(
      0,
      player.ruckRecoverySeconds - deltaSeconds,
    );
    player.decisionForSeconds = next.decisionForSeconds ?? Math.max(0, player.decisionForSeconds - deltaSeconds);
    player.intentForSeconds = Math.max(0, player.intentForSeconds - deltaSeconds);
    updateStamina(state, player, next, deltaSeconds);
    // Refresh intent when command is immediate, changes kind, or previous intent expires.
    if (next.immediate || player.intentKind !== next.intentKind || player.intentForSeconds === 0) {
      player.intentTarget = { ...next.target };
      player.intentKind = next.intentKind;
      player.intentForSeconds = 0.35 + (player.number % 4) * 0.07;
    }
    // Remove all velocity and steering for contact-frozen tackled players.
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
    const scale = changeLength > maxChange && changeLength > 0 ? maxChange / changeLength : 1;
    return {
      player,
      velocity: { x: player.velocity.x + changeX * scale, z: player.velocity.z + changeZ * scale },
    };
  });

  for (const motion of nextMotion) {
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

  const carrier = state.players.find((player) => player.id === state.ball.carrierId);
  // Check try scoring only while open play has a carrier.
  if (state.phase.kind === "openPlay" && carrier) {
    const scored = carrier.team === 0
      ? carrier.position.z >= PITCH.tryLines.north
      : carrier.position.z <= PITCH.tryLines.south;
    // End tick after scoring resets game phase.
    if (scored) {
      scoreTry(state, carrier.team);
      return;
    }
  }

  const carrierCommand = commands.find((next) => next.playerId === carrier?.id);
  // Advance existing preparation or start newly selected action while carrier remains.
  if (carrier && carrierCommand) {
    const wasPreparing = carrier.pendingBallAction !== null;
    prepareBallAction(carrier, carrierCommand);
    // Avoid consuming delay during frame preparation starts.
    if (wasPreparing) resolvePreparedAction(state, carrier, deltaSeconds, random);
  }

  // Advance ball during open play and in-flight set-piece stages.
  if (
    state.phase.kind === "openPlay" ||
    (state.phase.kind === "kickoff" && state.phase.stage === "inFlight") ||
    (state.phase.kind === "lineout" && state.phase.stage === "inFlight")
  ) {
    updateBall(state, deltaSeconds, random);
  }

  // Attempt tackle only after ball update leaves open play active.
  if (state.phase.kind === "openPlay") {
    const currentCarrier = state.players.find((player) => player.id === state.ball.carrierId);
    // End tick when current carrier is successfully tackled into ruck.
    if (currentCarrier && attemptTackle(state, random)) return;
  }
// Positions referee on attacking side of breakdown, following play closely while avoiding obstruction
const updateReferee = (state: GameState, deltaSeconds: number) => {
  const ballPos = state.ball.carrierId
    ? state.players.find((p) => p.id === state.ball.carrierId)?.position ?? state.ball.position
    : state.ball.position;
  const attackDir = attackDirection(state.possessionTeam);

  // Referee stands 5m laterally on open side and 2.5m behind on the attacking side of the offside line
  const refSide = ballPos.x >= 0 ? -5.5 : 5.5;
  const targetZ = clamp(
    ballPos.z - attackDir * 2.8,
    PITCH.tryLines.south + 3,
    PITCH.tryLines.north - 3,
  );
  let targetX = clamp(ballPos.x + refSide, -28, 28);

  // Clear out laterally if carrier is charging directly at referee
  const carrier = state.players.find((p) => p.id === state.ball.carrierId);
  if (carrier && distance(carrier.position, state.referee.position) < 4.0) {
    targetX += carrier.position.x >= state.referee.position.x ? -4.5 : 4.5;
  }

  const dx = targetX - state.referee.position.x;
  const dz = targetZ - state.referee.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.4) {
    const speed = dist > 12 ? 7.2 : dist > 5 ? 5.2 : 3.0;
    state.referee.velocity = { x: (dx / dist) * speed, z: (dz / dist) * speed };
    state.referee.position.x += state.referee.velocity.x * deltaSeconds;
    state.referee.position.z += state.referee.velocity.z * deltaSeconds;
  } else {
    state.referee.velocity = { x: 0, z: 0 };
  }
};

// Advances match clock (80 minutes total, 40 minute halves) and computes distance gained
const updateMatchClock = (state: GameState, deltaSeconds: number) => {
  const currentBallZ = state.ball.carrierId
    ? state.players.find((p) => p.id === state.ball.carrierId)?.position.z ?? state.ball.position.z
    : state.ball.position.z;
  state.distanceGained =
    (currentBallZ - state.possessionOriginZ) * attackDirection(state.possessionTeam);

  if (state.half === "fullTime") return;
  // Match clock only starts once the kickoff is kicked into flight
  const isPreKickoff =
    state.phase.kind === "kickoff" &&
    state.phase.stage !== "inFlight" &&
    (state.phase.reason === "matchStart" || state.phase.reason === "halfTime");
  if (isPreKickoff) return;

  // 6x speed so full 80 min match plays out in ~13 mins at normal simulation speed
  state.matchClockSeconds += deltaSeconds * 6;

  // 40:00 Half-time whistle
  if (state.half === 1 && state.matchClockSeconds >= 2400) {
    state.half = 2;
    state.matchClockSeconds = 2400;
    state.ball.carrierId = null;
    state.ball.flight = null;
    state.phase = {
      kind: "kickoff",
      stage: "forming",
      kickingTeam: 0,
      readyForSeconds: 0,
      reason: "halfTime",
    };
    return;
  }

  // 80:00 Full-time whistle
  if (state.half === 2 && state.matchClockSeconds >= 4800) {
    state.half = "fullTime";
    state.matchClockSeconds = 4800;
  }
};

  updateRuck(state, deltaSeconds, random);
  updateKickoff(state, deltaSeconds, random);
  updateLineout(state, deltaSeconds);
  updateScrum(state, deltaSeconds, random);
  updateConversion(state, deltaSeconds, random);
  updatePenalty(state, deltaSeconds, random);
  updateReferee(state, deltaSeconds);
  updateMatchClock(state, deltaSeconds);
};
