import { attackDirection, type GameState, PITCH, type Player, type Position, ROLES } from "../domain.ts";
import { getKickoffTarget, getLineoutTarget, getOpenPlayTarget, getRuckTarget, isForward } from "../formations.ts";
import { TEAMS } from "../teams.ts";
import {
  clamp,
  distance,
  effectiveSkill,
  GRAVITY,
  insideOwnTwentyTwo,
} from "./math.ts";
import type { Effort, PlayerCommand, Random } from "./types.ts";

// Creates a movement command with shared defaults.
const command = (
  player: Player,
  target: Position,
  intentKind: string,
  immediate = false,
  effort: Effort = "run",
): PlayerCommand => ({
  playerId: player.id,
  target,
  intentKind,
  immediate,
  effort,
});

// Finds nearest opposing-player distance for space evaluation.
const nearestOpponentDistance = (players: Player[], player: Player) =>
  players.reduce(
    (nearest, other) =>
      other.team === player.team
        ? nearest
        : Math.min(nearest, distance(player.position, other.position)),
    Infinity,
  );

// Reports whether carrier has passed every defender except sweeping fullback.
const hasBrokenLine = (players: Player[], carrier: Player) => {
  const direction = attackDirection(carrier.team);
  return !players.some(
    (player) =>
      player.team !== carrier.team &&
      player.role !== ROLES.FullBack &&
      (player.position.z - carrier.position.z) * direction > 0,
  );
};

// Chooses two role-appropriate runners behind carrier to preserve live support.
const selectSupportRunners = (
  players: Player[],
  carrier: Player,
  lineBroken: boolean,
) => {
  const direction = attackDirection(carrier.team);
  const central = Math.abs(carrier.position.x) < 15;
  return players
    .filter(
      (player) =>
        player.team === carrier.team &&
        player.id !== carrier.id &&
        player.ruckRecoverySeconds === 0,
    )
    .map((player) => {
      const preferred = central
        ? isForward(player) ||
          player.role === ROLES.FlyHalf ||
          player.role === ROLES.InsideCentre
        : player.role === ROLES.Wing ||
          player.role === ROLES.InsideCentre ||
          player.role === ROLES.OutsideCentre ||
          player.role === ROLES.FlyHalf ||
          player.role === ROLES.OpenSideFlanker ||
          player.role === ROLES.NumberEight;
      return {
        player,
        priority:
          (preferred ? 0 : 20) +
          Math.max(
            0,
            (player.position.z - carrier.position.z) * direction,
          ) *
            1.5 +
          distance(player.position, carrier.position),
      };
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 2)
    .map(({ player }) => player.id);
};

// Selects best legal support runner for a pass.
const choosePassTarget = (
  players: Player[],
  carrier: Player,
  preferredRoles?: ReadonlySet<Player["role"]>,
) =>
  players
    .filter(
      (player) =>
        player.team === carrier.team &&
        player.id !== carrier.id &&
        player.ruckRecoverySeconds === 0 &&
        (!preferredRoles || preferredRoles.has(player.role)) &&
        (player.position.z - carrier.position.z) * attackDirection(carrier.team) <= 0.5 &&
        (player.position.z - carrier.position.z) * attackDirection(carrier.team) >=
          (preferredRoles ? -12 : -5) &&
        Math.abs(player.position.x - carrier.position.x) >= 2 &&
        distance(player.position, carrier.position) <= (preferredRoles ? 20 : 15),
    )
    .map((player) => ({
      player,
      space: nearestOpponentDistance(players, player),
      gap: distance(player.position, carrier.position),
      depth: Math.abs((player.position.z - carrier.position.z) * attackDirection(carrier.team)),
    }))
    .sort((a, b) => a.depth - b.depth || b.space - a.space || a.gap - b.gap)[0]
    ?.player;

// Chooses a touch-finding clearance target downfield.
const clearanceTarget = (player: Player, random: Random): Position => {
  const direction = attackDirection(player.team);
  const side = Math.abs(player.position.x) > 8
    ? Math.sign(player.position.x)
    : random() < 0.5
      ? -1
      : 1;
  return {
    x: side * (PITCH.touchLines.right + 4),
    z: clamp(
      player.position.z + direction * (28 + random() * 12),
      PITCH.tryLines.south + 2,
      PITCH.tryLines.north - 2,
    ),
  };
};

// Chooses carrier run, pass, evade, or kick behavior.
const chooseCarrierCommand = (
  state: GameState,
  players: Player[],
  carrier: Player,
  random: Random,
): PlayerCommand => {
  const direction = attackDirection(carrier.team);
  const lineBroken = hasBrokenLine(players, carrier);
  // Sprint directly toward goal when primary defensive line is broken.
  if (lineBroken) {
    const sprint = command(
      carrier,
      { x: carrier.position.x, z: carrier.team === 0 ? PITCH.tryLines.north : PITCH.tryLines.south },
      "line-break",
      true,
      "sprint",
    );
    sprint.decisionForSeconds = 1;
    return sprint;
  }
  // Retain current carrier intent while decision timer remains active.
  if (carrier.decisionForSeconds > 0) {
    return command(carrier, carrier.intentTarget, "carrier", false, "run");
  }

  const defendersAhead = players
    .filter(
      (player) =>
        player.team !== carrier.team &&
        (player.position.z - carrier.position.z) * direction > 0 &&
        Math.abs(player.position.x - carrier.position.x) < 6 &&
        distance(player.position, carrier.position) < 10,
    )
    .sort((a, b) => distance(a.position, carrier.position) - distance(b.position, carrier.position));
  const result = command(
    carrier,
    { x: carrier.position.x, z: carrier.position.z + direction * 20 },
    "carrier",
    false,
    "run",
  );
  result.decisionForSeconds = 0.45;

  const forcedClearance = state.pendingClearanceKickerId === carrier.id;
  const trapped = insideOwnTwentyTwo(carrier.team, carrier.position.z) && defendersAhead.length > 0;
  const recognisesClearance =
    random() >= (1 - effectiveSkill(carrier, "decision")) * 0.18;
  const canKick =
    carrier.role === ROLES.ScrumHalf ||
    carrier.role === ROLES.FlyHalf ||
    carrier.role === ROLES.FullBack ||
    carrier.role === ROLES.Wing;
  // Kick when designated or trapped, provided role and decision skill permit it.
  if ((forcedClearance || trapped) && canKick && recognisesClearance) {
    result.ballAction = { kind: "kick", target: clearanceTarget(carrier, random) };
    return result;
  }
  // Move ball to a kicker when trapped carrier lacks a kicking role.
  if (trapped && !canKick && recognisesClearance) {
    const kicker = choosePassTarget(players, carrier, new Set([ROLES.ScrumHalf, ROLES.FlyHalf, ROLES.FullBack]));
    // Pass to preferred kicker when one is available.
    if (kicker) {
      result.ballAction = { kind: "pass", receiverId: kicker.id, clearance: true };
      return result;
    }
    result.ballAction = { kind: "kick", target: clearanceTarget(carrier, random) };
    return result;
  }

  // Keep carrying when no nearby defender forces a choice.
  if (defendersAhead.length === 0) return result;
  const half = carrier.role === ROLES.ScrumHalf || carrier.role === ROLES.FlyHalf;
  const centre = carrier.role === ROLES.InsideCentre || carrier.role === ROLES.OutsideCentre;
  const weights = isForward(carrier)
    ? [0.78, 0.1, 0.1]
    : half
      ? [0.25, 0.5, 0.15]
      : centre
        ? [0.4, 0.35, 0.2]
        : [0.38, 0.12, 0.4];
  const tendencies = TEAMS[carrier.team].tendencies;
  const weighted = [
    weights[0] * tendencies.carry,
    weights[1] * tendencies.pass,
    weights[2] * tendencies.carry,
    Math.max(0.01, 1 - weights[0] - weights[1] - weights[2]) * tendencies.kick,
  ];
  const totalWeight = weighted.reduce((total, weight) => total + weight, 0);
  for (let index = 0; index < weighted.length; index += 1) weighted[index] /= totalWeight;
  const roll = random();
  const passTarget = choosePassTarget(players, carrier);
  // Carry straight when roll selects carry or no selected pass target exists.
  if (roll < weighted[0] || (!passTarget && roll < weighted[0] + weighted[1])) return result;
  // Pass when roll selects passing and a receiver exists.
  if (roll < weighted[0] + weighted[1] && passTarget) {
    result.ballAction = { kind: "pass", receiverId: passTarget.id };
    return result;
  }
  // Evade nearest defender when roll selects lateral carry.
  if (roll < weighted[0] + weighted[1] + weighted[2]) {
    const defender = defendersAhead[0];
    result.target = {
      x: carrier.position.x + (defender.position.x >= carrier.position.x ? -8 : 8),
      z: carrier.position.z + direction * 12,
    };
    return result;
  }
  result.ballAction = { kind: "kick", target: clearanceTarget(carrier, random) };
  return result;
};

// Predicts horizontal landing point from current ballistic state.
const predictedLanding = (state: GameState): Position => {
  const ball = state.ball;
  const time = Math.max(0, (ball.velocity.y + Math.sqrt(ball.velocity.y ** 2 + 2 * GRAVITY * ball.position.y)) / GRAVITY);
  return { x: ball.position.x + ball.velocity.x * time, z: ball.position.z + ball.velocity.z * time };
};

// Assigns chase, receive, cover, and offside recovery during ball flight.
const computeFlightCommands = (state: GameState, players: Player[]) => {
  const landing = predictedLanding(state);
  const kickingTeam = state.ball.lastTouchedTeam;
  const contestableKick =
    state.ball.flight === "kick" ||
    state.ball.flight === "kickoff" ||
    state.ball.flight === "rolling";
  const eligibleChasers = new Set(
    players
      .filter(
        (player) =>
          contestableKick &&
          player.team === kickingTeam &&
          !player.kickOffside,
      )
      .sort((a, b) => distance(a.position, landing) - distance(b.position, landing))
      .slice(0, 3)
      .map((player) => player.id),
  );
  const receivingCatchers = new Set(
    players
      .filter(
        (player) => contestableKick && player.team !== kickingTeam,
      )
      .sort((a, b) => distance(a.position, landing) - distance(b.position, landing))
      .slice(0, 3)
      .map((player) => player.id),
  );

  return players.map((player) => {
    // Recover behind kick origin when player began ahead of kicker.
    if (player.kickOffside && state.ball.kickOrigin) {
      return command(
        player,
        { x: player.position.x, z: state.ball.kickOrigin.z - attackDirection(player.team) * 2 },
        "kick-offside",
        true,
        "run",
      );
    }
    // Move intended pass or lineout receiver toward imperfect landing point.
    if (player.id === state.ball.intendedReceiverId) {
      return command(player, landing, "flight-receive", false, "sprint");
    }
    // Send nearest eligible kicking-team players toward landing point.
    if (eligibleChasers.has(player.id)) {
      return command(player, landing, "kick-chase", false, "sprint");
    }
    // Send nearest receiving-team players toward territorial kick landing point.
    if (receivingCatchers.has(player.id)) {
      return command(player, landing, "kick-receive", false, "sprint");
    }
    // Send defending fullback to receive kick.
    if (player.team !== kickingTeam && player.role === ROLES.FullBack) {
      return command(player, landing, "kick-receive", false, "sprint");
    }
    // Position defending wings around landing point for cover.
    if (player.team !== kickingTeam && player.role === ROLES.Wing) {
      return command(
        player,
        { x: clamp(landing.x + (player.number % 2 ? -10 : 10), -32, 32), z: landing.z },
        "kick-cover",
        false,
        "run",
      );
    }
    return command(player, player.intentTarget, "kick-hold", false, "jog");
  });
};

// Computes one immutable command snapshot for every player.
export const computeCommands = (state: GameState, random: Random = Math.random): PlayerCommand[] => {
  const players = state.players.map((player) => ({
    ...player,
    position: { ...player.position },
    velocity: { ...player.velocity },
    intentTarget: { ...player.intentTarget },
  }));
  const phase = state.phase;

  // Hold kickoff formation until ball enters flight.
  if (phase.kind === "kickoff" && phase.stage !== "inFlight") {
    return players.map((player) =>
      command(
        player,
        getKickoffTarget(player, phase.kickingTeam, phase.reason),
        `kickoff-${phase.stage}`,
        false,
        phase.stage === "ready" ? "stand" : "run",
      ),
    );
  }
  // Hold lineout formation until throw enters flight.
  if (phase.kind === "lineout" && phase.stage !== "inFlight") {
    return players.map((player) =>
      command(
        player,
        getLineoutTarget(player, phase.position, phase.throwingTeam),
        `lineout-${phase.stage}`,
        false,
        phase.stage === "ready" ? "stand" : "jog",
      ),
    );
  }
  // Position ruck participants and surrounding attacking shape.
  if (phase.kind === "ruck") {
    const attackers = new Set(phase.attackers);
    const defenders = new Set(phase.defenders);
    return players.map((player) => {
      const joinsRuck = attackers.has(player.id) || defenders.has(player.id);
      return command(
        player,
        getRuckTarget(player, phase.position, phase.attackingTeam, attackers, defenders),
        `ruck-${phase.stage}-${joinsRuck ? "join" : player.pod}`,
        false,
        joinsRuck ? "run" : "jog",
      );
    });
  }
  // Switch to flight-specific positioning while ball is airborne.
  if (state.ball.flight) return computeFlightCommands(state, players);

  const carrier = players.find((player) => player.id === state.ball.carrierId);
  // Chase loose grounded ball when nobody carries it.
  if (!carrier) {
    const target = { x: state.ball.position.x, z: state.ball.position.z };
    const chasers = new Set(([0, 1] as const).map((team) =>
      players
        .filter((player) => player.team === team)
        .sort((a, b) => distance(a.position, target) - distance(b.position, target))[0].id,
    ));
    return players.map((player) =>
      command(
        player,
        chasers.has(player.id) ? target : player.intentTarget,
        "loose-ball",
        false,
        chasers.has(player.id) ? "sprint" : "jog",
      ),
    );
  }

  const lineBroken = hasBrokenLine(players, carrier);
  const fullback = players.find(
    (player) => player.team !== carrier.team && player.role === ROLES.FullBack,
  );
  const lineTackler = players
    .filter((player) => player.team !== carrier.team && player.role !== ROLES.FullBack)
    .sort(
      (a, b) =>
        distance(a.position, carrier.position) - distance(b.position, carrier.position),
    )[0];
  const tacklerId = lineBroken ? fullback?.id ?? lineTackler?.id : lineTackler?.id;
  const supportRunnerIds = selectSupportRunners(players, carrier, lineBroken);

  return players.map((player) => {
    // Let carrier-specific decision logic own carrier command.
    if (player.id === carrier.id) return chooseCarrierCommand(state, players, carrier, random);
    const attacking = player.team === carrier.team;
    const target = getOpenPlayTarget(player, carrier, attacking ? undefined : state.defensiveLineZ[player.team]);
    const direction = attackDirection(player.team);
    const supportIndex = supportRunnerIds.indexOf(player.id);
    // Drive selected support runners onto close inside and outside shoulders.
    if (supportIndex >= 0) {
      const side = player.position.x < carrier.position.x
        ? -1
        : player.position.x > carrier.position.x
          ? 1
          : supportIndex === 0
            ? -1
            : 1;
      return command(
        player,
        {
          x: clamp(carrier.position.x + side * (3 + supportIndex * 2), -32, 32),
          z: carrier.position.z - direction * (2.5 + supportIndex * 1.5),
        },
        lineBroken ? "line-break-support" : "support",
        false,
        lineBroken ? "sprint" : "run",
      );
    }
    const offside = attacking && player.hardLineForSeconds === 0 && (player.position.z - carrier.position.z) * direction >= -0.5;
    // Jog players ahead of carrier back toward eligibility without freezing whole team.
    if (offside) {
      return command(
        player,
        { x: player.laneX, z: carrier.position.z - direction * 2.5 },
        "offside-recovery",
        false,
        "jog",
      );
    }
    // Commit nearest eligible defender to predictive tackle line.
    if (
      !attacking &&
      player.id === tacklerId &&
      distance(player.position, carrier.position) < (lineBroken ? 40 : 12)
    ) {
      return command(
        player,
        {
          x: carrier.position.x + carrier.velocity.x * 0.45,
          z: carrier.position.z + carrier.velocity.z * 0.45,
        },
        lineBroken ? "last-defender-tackle" : "tackle",
        true,
        "sprint",
      );
    }
    const canRunHardLine =
      attacking &&
      player.hardLineForSeconds === 0 &&
      (player.role === ROLES.InsideCentre || player.role === ROLES.OutsideCentre || player.role === ROLES.Wing) &&
      distance(player.position, carrier.position) >= 5 &&
      distance(player.position, carrier.position) <= 10 &&
      random() < 0.008;
    // Start or continue hard attacking line when eligible.
    if (canRunHardLine || player.hardLineForSeconds > 0) {
      const hardLine = command(
        player,
        { x: carrier.position.x, z: carrier.position.z + direction * 4 },
        "hard-line",
        false,
        "sprint",
      );
      hardLine.startHardLine = canRunHardLine;
      return hardLine;
    }
    return command(
      player,
      target,
      attacking ? `attack-${player.pod}` : "defence-line",
      false,
      attacking ? "jog" : "run",
    );
  });
};
