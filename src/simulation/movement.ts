import { attackDirection, type GameState, otherTeam, PITCH, type Player, type Position } from "../domain.ts";
import { TEAMS } from "../teams.ts";
import { updateBall, launchBall } from "./ball.ts";
import { clamp, desiredVelocity, distance, effectiveSkill } from "./math.ts";
import { attemptTackle, scoreTry, updateKickoff, updateLineout, updateRuck } from "./phases.ts";
import type { PlayerCommand, Random } from "./types.ts";

// Advances current defensive line from phase and carrier position.
export const advanceDefensiveLine = (state: GameState, deltaSeconds: number) => {
  // Anchor defending line at ruck offside distance during ruck phases.
  if (state.phase.kind === "ruck") {
    const direction = attackDirection(state.phase.attackingTeam);
    state.defensiveLineZ[otherTeam(state.phase.attackingTeam)] = state.phase.position.z + direction * 8;
    return;
  }
  // Leave line unchanged outside open play.
  if (state.phase.kind !== "openPlay") return;
  const carrier = state.players.find((player) => player.id === state.ball.carrierId);
  // Leave line unchanged without ball carrier reference.
  if (!carrier) return;
  const direction = attackDirection(carrier.team);
  const defendingTeam = otherTeam(carrier.team);
  const limit = carrier.position.z + direction * 1.5;
  const advanced = state.defensiveLineZ[defendingTeam] - direction * TEAMS[defendingTeam].lineSpeed * deltaSeconds;
  state.defensiveLineZ[defendingTeam] = direction === 1 ? Math.max(limit, advanced) : Math.min(limit, advanced);
};

// Adds short-range teammate separation to desired player velocity.
const separatedVelocity = (state: GameState, player: Player, velocity: Position): Position => {
  let x = velocity.x;
  let z = velocity.z;
  const isCarrier = player.id === state.ball.carrierId;
  for (const other of state.players) {
    const gap = distance(player.position, other.position);
    // Skip self, opponents, overlaps, and teammates outside separation radius.
    if (other.id === player.id || other.team !== player.team || gap === 0 || gap >= 2.5) continue;
    // Ball carrier gets mild lateral separation only, never longitudinal deceleration from teammates
    const weight = isCarrier ? 0.6 : 1.8;
    x += ((player.position.x - other.position.x) / gap) * (2.5 - gap) * weight;
    if (!isCarrier) {
      z += ((player.position.z - other.position.z) / gap) * (2.5 - gap) * weight;
    }
  }
  return { x, z };
};

// Applies effort cost or low-intensity recovery before movement is resolved.
const updateStamina = (
  player: Player,
  next: PlayerCommand,
  deltaSeconds: number,
) => {
  const atTarget = distance(player.position, next.target) < 0.35;
  const rate = atTarget || next.effort === "stand"
    ? 1.2
    : next.effort === "jog"
      ? 0.35
      : next.effort === "sprint"
        ? -2
        : -0.55;
  player.stamina = clamp(player.stamina + rate * deltaSeconds, 0, 100);
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
    updateStamina(player, next, deltaSeconds);
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
  updateRuck(state, deltaSeconds, random);
  updateKickoff(state, deltaSeconds, random);
  updateLineout(state, deltaSeconds);
};
