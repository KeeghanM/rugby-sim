import {
  attackDirection,
  type GameState,
  otherTeam,
  PITCH,
  type Player,
  type Position,
} from "../domain.ts";
import { isForward } from "../formations.ts";
import { TEAMS } from "../teams.ts";
import { launchBall, updateBall } from "./ball.ts";
import {
  clamp,
  desiredVelocity,
  distance,
  effectiveSkill,
  maxStamina,
} from "./math.ts";
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
export const advanceDefensiveLine = (
  state: GameState,
  deltaSeconds: number,
) => {
  if (state.half === "fullTime") return;
  // Anchor defending line directly at ruck hindmost offside line
  if (state.phase.kind === "ruck") {
    const direction = attackDirection(state.phase.attackingTeam);
    state.defensiveLineZ[otherTeam(state.phase.attackingTeam)] =
      state.phase.position.z + direction * 0.5;
    return;
  }
  // Leave line unchanged outside open play.
  if (state.phase.kind !== "openPlay") return;
  const carrier = state.players.find(
    (player) => player.id === state.ball.carrierId,
  );
  // Leave line unchanged without ball carrier reference.
  if (!carrier) return;
  const direction = attackDirection(carrier.team);
  const defendingTeam = otherTeam(carrier.team);
  const limit = carrier.position.z + direction * 0.5;
  const advanced =
    state.defensiveLineZ[defendingTeam] -
    direction * TEAMS[defendingTeam].lineSpeed * deltaSeconds;
  state.defensiveLineZ[defendingTeam] =
    direction === 1 ? Math.max(limit, advanced) : Math.min(limit, advanced);
};

// Adds teammate separation and physical collision pushing (disabled between bound ruck/scrum participants)
const separatedVelocity = (
  state: GameState,
  player: Player,
  velocity: Position,
): Position => {
  let x = velocity.x;
  let z = velocity.z;
  const isCarrier = player.id === state.ball.carrierId;

  const ruckPhase = state.phase.kind === "ruck" ? state.phase : null;
  const isScrum = state.phase.kind === "scrum";

  const isPlayerRuckBound =
    ruckPhase !== null &&
    (ruckPhase.attackers.includes(player.id) ||
      ruckPhase.defenders.includes(player.id) ||
      player.id === ruckPhase.tackledPlayerId ||
      player.id === ruckPhase.tacklerId);

  const isPlayerScrumBound = isScrum && isForward(player);

  for (const other of state.players) {
    if (other.id === player.id) continue;
    const gap = distance(player.position, other.position);
    if (gap === 0) continue;

    const isOtherRuckBound =
      ruckPhase !== null &&
      (ruckPhase.attackers.includes(other.id) ||
        ruckPhase.defenders.includes(other.id) ||
        other.id === ruckPhase.tackledPlayerId ||
        other.id === ruckPhase.tacklerId);

    const isOtherScrumBound = isScrum && isForward(other);

    // Bound players in a ruck or scrum pack together without elastic repulsion pushing them apart
    if (
      (isPlayerRuckBound && isOtherRuckBound) ||
      (isPlayerScrumBound && isOtherScrumBound)
    ) {
      continue;
    }

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
      x +=
        ((player.position.x - other.position.x) / gap) * (2.5 - gap) * weight;
      if (!isCarrier) {
        z +=
          ((player.position.z - other.position.z) / gap) * (2.5 - gap) * weight;
      }
    }
  }

  // Avoid referee collision
  const refGap = distance(player.position, state.referee.position);
  if (refGap > 0 && refGap < 1.4) {
    x +=
      ((player.position.x - state.referee.position.x) / refGap) *
      (1.4 - refGap) *
      2.2;
    z +=
      ((player.position.z - state.referee.position.z) / refGap) *
      (1.4 - refGap) *
      2.2;
  }

  return { x, z };
};

// Applies effort cost or weight/skill-scaled low-intensity recovery capped by match time.
// Applies calibrated position-based stamina burn rates (Tight 5 ~45-60m, Loose ~60-80m, Backs ~70-80m)
const updateStamina = (
  state: GameState,
  player: Player,
  next: PlayerCommand,
  deltaSeconds: number,
) => {
  const atTarget = distance(player.position, next.target) < 0.35;
  const isTightFive = player.number >= 1 && player.number <= 5;
  const isLooseForward = player.number >= 6 && player.number <= 8;

  // Match seconds elapsed (clock runs at 6x accelerated speed)
  const matchSeconds = deltaSeconds * 6;

  // Base burn per match second: Tight 5 (~0.024/s), Loose (~0.017/s), Backs (~0.013/s)
  const baseDrainRate = isTightFive ? 0.024 : isLooseForward ? 0.017 : 0.013;
  const effortMod =
    next.effort === "sprint"
      ? 2.1
      : next.effort === "run"
        ? 1.0
        : next.effort === "jog"
          ? 0.4
          : 0;

  // Recovery when standing / low effort
  const weightFactor = Math.max(0.4, 1 - (player.weight - 70) / 120);
  const skillFactor = 0.7 + player.skills.decision * 0.3;
  const recoveryRate = 0.014 * weightFactor * skillFactor;

  const netRate =
    atTarget || next.effort === "stand"
      ? recoveryRate
      : -baseDrainRate * effortMod;

  const ceiling = maxStamina(player, state.matchClockSeconds);
  player.stamina = clamp(player.stamina + netRate * matchSeconds, 0, ceiling);
};

// Evaluates tactical and fatigue-based substitutions during stoppages
const updateSubstitutions = (state: GameState) => {
  const matchSecs = state.matchClockSeconds;
  // Substitutions roll from 45 mins (2700s) onward during set pieces and breakdown stoppages
  if (matchSecs < 2700 || state.half === "fullTime") return;
  const isStoppage =
    state.phase.kind === "scrum" ||
    state.phase.kind === "lineout" ||
    state.phase.kind === "kickoff" ||
    (state.phase.kind === "ruck" && state.phase.stage === "arrivals");
  if (!isStoppage) return;

  for (const team of [0, 1] as const) {
    const teamPlayers = state.players.filter((p) => p.team === team);
    const availableSubs = state.substitutes.filter(
      (s) => s.team === team && !s.isUsed,
    );
    if (availableSubs.length === 0) continue;

    for (const player of teamPlayers) {
      const isTightFive = player.number >= 1 && player.number <= 5;
      const isLoose = player.number >= 6 && player.number <= 8;
      const isBack = player.number >= 9 && player.number <= 15;

      const needsSub =
        (isTightFive && matchSecs >= 2700 && player.stamina < 40) ||
        (isLoose && matchSecs >= 3400 && player.stamina < 35) ||
        (isBack && matchSecs >= 3900 && player.stamina < 30);

      if (!needsSub) continue;

      // Find matching bench substitute
      const matchingSub =
        availableSubs.find((s) => s.role === player.role) ??
        (isTightFive
          ? availableSubs.find((s) => s.number <= 19)
          : availableSubs[0]);

      if (!matchingSub) continue;

      // Bring substitute onto the pitch with 100% fresh stamina and updated attributes
      const oldNum = player.number;
      player.number = matchingSub.number;
      player.speed = matchingSub.speed;
      player.weight = matchingSub.weight;
      player.skills = { ...matchingSub.skills };
      player.stats = matchingSub.stats;
      player.stamina = 100;
      matchingSub.isUsed = true;

      const teamName = TEAMS[team].name;
      state.recentSubstitution = `${teamName} SUB: #${matchingSub.number} on for #${oldNum} (${player.role})`;
      break;
    }
  }
};

// Calculates visible preparation time from action complexity, skill, and fatigue.
const actionDelay = (player: Player, kind: "pass" | "kick") => {
  const skill = effectiveSkill(player, kind === "pass" ? "passing" : "kicking");
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
      (receiver.position.z - carrier.position.z) *
      attackDirection(carrier.team);
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
  // Check for chargedowns when kicker is rushed by a charging defender
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
      (dist < 1.4 ? 0.38 : 0.18) * (1.15 - carrier.skills.kicking * 0.25);
    if (isChargedDown) {
      // CHARGED DOWN! Ball ricochets erratically off the defender's body
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

// Applies commands, movement, ball actions, tackles, and phase updates for one tick.
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
  const nextMotion = commands.map((next) => {
    const player = state.players.find(({ id }) => id === next.playerId)!;
    player.tackleCooldown = Math.max(0, player.tackleCooldown - deltaSeconds);
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
    // Refresh intent when command is immediate, changes kind, or previous intent expires.
    if (
      next.immediate ||
      player.intentKind !== next.intentKind ||
      player.intentForSeconds === 0
    ) {
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
  // Check try scoring only while open play has a carrier.
  if (state.phase.kind === "openPlay" && carrier) {
    const scored =
      carrier.team === 0
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
    if (wasPreparing)
      resolvePreparedAction(state, carrier, deltaSeconds, random);
  }

  // Advance ball during flight, open play, and in-flight set-piece stages.
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

  // Attempt tackle only after ball update leaves open play active.
  if (state.phase.kind === "openPlay") {
    const currentCarrier = state.players.find(
      (player) => player.id === state.ball.carrierId,
    );
    // End tick when current carrier is successfully tackled into ruck.
    if (currentCarrier && attemptTackle(state, random)) return;
  }
  // Positions referee on attacking side of breakdown, following play closely while avoiding obstruction
  const updateReferee = (state: GameState, deltaSeconds: number) => {
    const ballPos = state.ball.carrierId
      ? (state.players.find((p) => p.id === state.ball.carrierId)?.position ??
        state.ball.position)
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
      state.referee.velocity = {
        x: (dx / dist) * speed,
        z: (dz / dist) * speed,
      };
      state.referee.position.x += state.referee.velocity.x * deltaSeconds;
      state.referee.position.z += state.referee.velocity.z * deltaSeconds;
    } else {
      state.referee.velocity = { x: 0, z: 0 };
    }
  };

  // Advances match clock (80 minutes total, 40 minute halves) and computes distance gained
  const updateMatchClock = (state: GameState, deltaSeconds: number) => {
    const currentBallZ = state.ball.carrierId
      ? (state.players.find((p) => p.id === state.ball.carrierId)?.position.z ??
        state.ball.position.z)
      : state.ball.position.z;
    state.distanceGained =
      (currentBallZ - state.possessionOriginZ) *
      attackDirection(state.possessionTeam);

    if (state.half === "fullTime") return;
    // Match clock only starts once the kickoff is kicked into flight
    const isPreKickoff =
      state.phase.kind === "kickoff" &&
      state.phase.stage !== "inFlight" &&
      (state.phase.reason === "matchStart" ||
        state.phase.reason === "halfTime");
    if (isPreKickoff) return;

    // 6x speed so full 80 min match plays out in ~13 mins at normal simulation speed
    state.matchClockSeconds += deltaSeconds * 6;

    // In rugby, half time and full time only trigger once the ball goes dead after 40:00 / 80:00
    const isDeadBall =
      state.phase.kind !== "openPlay" && state.phase.kind !== "conversion";

    // 40:00+ Half-time whistle once ball is dead
    if (state.half === 1 && state.matchClockSeconds >= 2400 && isDeadBall) {
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

    // 80:00+ Full-time whistle once ball is dead
    if (state.half === 2 && state.matchClockSeconds >= 4800 && isDeadBall) {
      state.half = "fullTime";
      state.matchClockSeconds = 4800;
      // End the game
      // ...
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
  updateSubstitutions(state);
};
