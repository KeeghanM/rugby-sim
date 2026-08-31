import {
  attackDirection,
  type GameState,
  otherTeam,
  PITCH,
  type Player,
  type Position,
  ROLES,
  type Team,
} from "./domain.ts";
import {
  ATTACK_FORMATION,
  getKickoffTarget,
  getLineoutTarget,
  getOpenPlayTarget,
  getRuckTarget,
  isForward,
} from "./formations.ts";
import { getPlayerProfile, TEAMS } from "./teams.ts";

type BallAction =
  | { kind: "pass"; receiverId: string; clearance?: boolean }
  | { kind: "kick"; target: Position; flight?: "kick" | "kickoff" | "lineout" };
export type PlayerCommand = {
  playerId: string;
  target: Position;
  intentKind: string;
  immediate?: boolean;
  ballAction?: BallAction;
  startHardLine?: boolean;
  decisionForSeconds?: number;
};
type Random = () => number;

const GRAVITY = 9.81;
const distance = (a: Position, b: Position) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const effectiveSpeed = (player: Player) =>
  Math.max(0, player.speed * (player.stamina / 100) - player.injuryPenalty);
const effectiveWeight = (player: Player) => player.weight * (player.stamina / 100);
const insideOwnTwentyTwo = (team: Team, z: number) =>
  team === 0 ? z <= PITCH.twentyTwoMetreLines.south : z >= PITCH.twentyTwoMetreLines.north;

const command = (
  player: Player,
  target: Position,
  intentKind: string,
  immediate = false,
): PlayerCommand => ({ playerId: player.id, target, intentKind, immediate });

const nearestOpponentDistance = (players: Player[], player: Player) =>
  players.reduce(
    (nearest, other) =>
      other.team === player.team
        ? nearest
        : Math.min(nearest, distance(player.position, other.position)),
    Infinity,
  );

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
      depth: Math.abs(
        (player.position.z - carrier.position.z) * attackDirection(carrier.team),
      ),
    }))
    .sort((a, b) => a.depth - b.depth || b.space - a.space || a.gap - b.gap)[0]
    ?.player;

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

const chooseCarrierCommand = (
  state: GameState,
  players: Player[],
  carrier: Player,
  random: Random,
): PlayerCommand => {
  const direction = attackDirection(carrier.team);
  const lineBroken = !players.some(
    (player) =>
      player.team !== carrier.team &&
      player.role !== ROLES.FullBack &&
      (player.position.z - carrier.position.z) * direction > 0,
  );
  if (lineBroken) {
    const sprint = command(
      carrier,
      {
        x: carrier.position.x,
        z: carrier.team === 0 ? PITCH.tryLines.north : PITCH.tryLines.south,
      },
      "line-break",
      true,
    );
    sprint.decisionForSeconds = 1;
    return sprint;
  }
  if (carrier.decisionForSeconds > 0) {
    return command(carrier, carrier.intentTarget, "carrier");
  }

  const defendersAhead = players
    .filter(
      (player) =>
        player.team !== carrier.team &&
        (player.position.z - carrier.position.z) * direction > 0 &&
        Math.abs(player.position.x - carrier.position.x) < 6 &&
        distance(player.position, carrier.position) < 10,
    )
    .sort(
      (a, b) =>
        distance(a.position, carrier.position) - distance(b.position, carrier.position),
    );
  const runTarget = {
    x: carrier.position.x,
    z: carrier.position.z + direction * 20,
  };
  const result = command(carrier, runTarget, "carrier");
  result.decisionForSeconds = 0.45;

  const forcedClearance = state.pendingClearanceKickerId === carrier.id;
  const trapped = insideOwnTwentyTwo(carrier.team, carrier.position.z) &&
    defendersAhead.length > 0;
  const recognisesClearance = random() >= (1 - carrier.skills.decision) * 0.18;
  const canKick =
    carrier.role === ROLES.ScrumHalf ||
    carrier.role === ROLES.FlyHalf ||
    carrier.role === ROLES.FullBack ||
    carrier.role === ROLES.Wing;
  if ((forcedClearance || trapped) && canKick && recognisesClearance) {
    result.ballAction = { kind: "kick", target: clearanceTarget(carrier, random) };
    return result;
  }
  if (trapped && !canKick && recognisesClearance) {
    const kicker = choosePassTarget(
      players,
      carrier,
      new Set([ROLES.ScrumHalf, ROLES.FlyHalf, ROLES.FullBack]),
    );
    if (kicker) {
      result.ballAction = { kind: "pass", receiverId: kicker.id, clearance: true };
      return result;
    }
    result.ballAction = { kind: "kick", target: clearanceTarget(carrier, random) };
    return result;
  }

  if (defendersAhead.length === 0) return result;
  const half = carrier.role === ROLES.ScrumHalf || carrier.role === ROLES.FlyHalf;
  const centre =
    carrier.role === ROLES.InsideCentre || carrier.role === ROLES.OutsideCentre;
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
  for (let index = 0; index < weighted.length; index += 1) {
    weighted[index] /= totalWeight;
  }
  const roll = random();
  const passTarget = choosePassTarget(players, carrier);
  if (roll < weighted[0] || (!passTarget && roll < weighted[0] + weighted[1])) {
    return result;
  }
  if (roll < weighted[0] + weighted[1] && passTarget) {
    result.ballAction = { kind: "pass", receiverId: passTarget.id };
    return result;
  }
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

const predictedLanding = (state: GameState): Position => {
  const ball = state.ball;
  const time = Math.max(
    0,
    (ball.velocity.y + Math.sqrt(ball.velocity.y ** 2 + 2 * GRAVITY * ball.position.y)) /
      GRAVITY,
  );
  return {
    x: ball.position.x + ball.velocity.x * time,
    z: ball.position.z + ball.velocity.z * time,
  };
};

const computeFlightCommands = (state: GameState, players: Player[]) => {
  const landing = predictedLanding(state);
  const kickingTeam = state.ball.lastTouchedTeam;
  const eligibleChasers = new Set(
    players
      .filter((player) => player.team === kickingTeam && !player.kickOffside)
      .sort((a, b) => distance(a.position, landing) - distance(b.position, landing))
      .slice(0, 3)
      .map((player) => player.id),
  );

  return players.map((player) => {
    if (player.kickOffside && state.ball.kickOrigin) {
      return command(
        player,
        {
          x: player.position.x,
          z:
            state.ball.kickOrigin.z -
            attackDirection(player.team) * 2,
        },
        "kick-offside",
        true,
      );
    }
    if (eligibleChasers.has(player.id)) return command(player, landing, "kick-chase");
    if (player.team !== kickingTeam && player.role === ROLES.FullBack) {
      return command(player, landing, "kick-receive");
    }
    if (player.team !== kickingTeam && player.role === ROLES.Wing) {
      return command(
        player,
        { x: clamp(landing.x + (player.number % 2 ? -10 : 10), -32, 32), z: landing.z },
        "kick-cover",
      );
    }
    return command(player, player.intentTarget, "kick-hold");
  });
};

export const computeCommands = (
  state: GameState,
  random: Random = Math.random,
): PlayerCommand[] => {
  const players = state.players.map((player) => ({
    ...player,
    position: { ...player.position },
    velocity: { ...player.velocity },
    intentTarget: { ...player.intentTarget },
  }));
  const phase = state.phase;

  if (phase.kind === "kickoff" && phase.stage !== "inFlight") {
    return players.map((player) =>
      command(
        player,
        getKickoffTarget(player, phase.kickingTeam),
        `kickoff-${phase.stage}`,
      ),
    );
  }
  if (phase.kind === "lineout" && phase.stage !== "inFlight") {
    return players.map((player) =>
      command(
        player,
        getLineoutTarget(player, phase.position, phase.throwingTeam),
        `lineout-${phase.stage}`,
      ),
    );
  }
  if (phase.kind === "ruck") {
    const attackers = new Set(phase.attackers);
    const defenders = new Set(phase.defenders);
    return players.map((player) =>
      command(
        player,
        getRuckTarget(
          player,
          phase.position,
          phase.attackingTeam,
          attackers,
          defenders,
        ),
        `ruck-${phase.stage}-${attackers.has(player.id) || defenders.has(player.id) ? "join" : player.pod}`,
      ),
    );
  }
  if (state.ball.flight) return computeFlightCommands(state, players);

  const carrier = players.find((player) => player.id === state.ball.carrierId);
  if (!carrier) {
    const target = { x: state.ball.position.x, z: state.ball.position.z };
    const chasers = new Set(
      ([0, 1] as const).map(
        (team) =>
          players
            .filter((player) => player.team === team)
            .sort((a, b) => distance(a.position, target) - distance(b.position, target))[0]
            .id,
      ),
    );
    return players.map((player) =>
      command(player, chasers.has(player.id) ? target : player.intentTarget, "loose-ball"),
    );
  }

  const tacklerId = players
    .filter(
      (player) =>
        player.team !== carrier.team &&
        (player.role !== ROLES.FullBack || distance(player.position, carrier.position) < 18),
    )
    .sort(
      (a, b) =>
        distance(a.position, carrier.position) - distance(b.position, carrier.position),
    )[0]?.id;

  return players.map((player) => {
    if (player.id === carrier.id) return chooseCarrierCommand(state, players, carrier, random);
    const attacking = player.team === carrier.team;
    const markedOpponent = players.find(
      (candidate) => candidate.team === carrier.team && candidate.number === player.number,
    );
    const target = getOpenPlayTarget(
      player,
      carrier,
      attacking ? undefined : state.defensiveLineZ[player.team],
      attacking ? undefined : markedOpponent,
    );
    const direction = attackDirection(player.team);
    const offside =
      attacking &&
      player.hardLineForSeconds === 0 &&
      (player.position.z - carrier.position.z) * direction >= -0.5;
    if (offside) {
      return command(
        player,
        { x: target.x, z: carrier.position.z - direction * 2.5 },
        "offside-recovery",
        true,
      );
    }

    if (!attacking && player.id === tacklerId && distance(player.position, carrier.position) < 12) {
      return command(
        player,
        {
          x: carrier.position.x + carrier.velocity.x * 0.45,
          z: carrier.position.z + carrier.velocity.z * 0.45,
        },
        "tackle",
        true,
      );
    }

    const canRunHardLine =
      attacking &&
      player.hardLineForSeconds === 0 &&
      (player.role === ROLES.InsideCentre ||
        player.role === ROLES.OutsideCentre ||
        player.role === ROLES.Wing) &&
      distance(player.position, carrier.position) >= 5 &&
      distance(player.position, carrier.position) <= 10 &&
      random() < 0.008;
    if (canRunHardLine || player.hardLineForSeconds > 0) {
      const hardLine = command(
        player,
        { x: carrier.position.x, z: carrier.position.z + direction * 4 },
        "hard-line",
      );
      hardLine.startHardLine = canRunHardLine;
      return hardLine;
    }
    return command(player, target, attacking ? `attack-${player.pod}` : "defence-line");
  });
};

const launchBall = (
  state: GameState,
  carrier: Player,
  target: Position,
  flight: "pass" | "kick" | "kickoff" | "lineout",
  intendedReceiverId: string | null,
  random: Random = Math.random,
) => {
  const skill =
    flight === "kick" || flight === "kickoff"
      ? carrier.skills.kicking
      : carrier.skills.passing;
  const error = (1 - skill) * (flight === "pass" || flight === "lineout" ? 5 : 18);
  const actualTarget = {
    x: target.x + (random() - 0.5) * error,
    z: target.z + (random() - 0.5) * error,
  };
  const horizontalDistance = distance(carrier.position, actualTarget);
  const duration = flight === "pass" || flight === "lineout"
    ? Math.max(0.35, horizontalDistance / 14)
    : 2.2;
  state.ball = {
    position: { ...carrier.position, y: 1.25 },
    velocity: {
      x: (actualTarget.x - carrier.position.x) / duration,
      y: (GRAVITY * duration) / 2,
      z: (actualTarget.z - carrier.position.z) / duration,
    },
    carrierId: null,
    flight,
    intendedReceiverId,
    lastTouchedTeam: carrier.team,
    kickOrigin: flight === "kick" || flight === "kickoff" ? { ...carrier.position } : null,
  };
  if (flight === "kick" || flight === "kickoff") {
    const direction = attackDirection(carrier.team);
    for (const player of state.players) {
      player.kickOffside =
        player.team === carrier.team &&
        player.id !== carrier.id &&
        (player.position.z - carrier.position.z) * direction > 0;
    }
  }
};

const carryBall = (state: GameState, player: Player) => {
  state.ball.carrierId = player.id;
  state.ball.flight = null;
  state.ball.intendedReceiverId = null;
  state.ball.velocity = { x: 0, y: 0, z: 0 };
  state.ball.position = { ...player.position, y: 1.25 };
  state.ball.lastTouchedTeam = player.team;
  state.ball.kickOrigin = null;
  for (const teammate of state.players) teammate.kickOffside = false;
};

const startLineout = (state: GameState, kickingTeam: Team, z: number, x: number) => {
  state.ball = {
    position: { x: Math.sign(x) * PITCH.touchLines.right, y: 0.15, z },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: kickingTeam,
    kickOrigin: null,
  };
  state.pendingClearanceKickerId = null;
  state.phase = {
    kind: "lineout",
    stage: "forming",
    position: { x: Math.sign(x) * PITCH.touchLines.right, z },
    throwingTeam: otherTeam(kickingTeam),
    elapsed: 0,
  };
};

const updateBall = (state: GameState, deltaSeconds: number, random: Random) => {
  const carrier = state.players.find((player) => player.id === state.ball.carrierId);
  if (carrier) {
    state.ball.position = { ...carrier.position, y: 1.25 };
    return;
  }
  if (!state.ball.flight) {
    const picker = state.players
      .filter((player) => distance(player.position, state.ball.position) <= 0.8)
      .sort(
        (a, b) =>
          distance(a.position, state.ball.position) -
          distance(b.position, state.ball.position),
      )[0];
    if (picker) carryBall(state, picker);
    return;
  }

  state.ball.position.x += state.ball.velocity.x * deltaSeconds;
  state.ball.position.y += state.ball.velocity.y * deltaSeconds;
  state.ball.position.z += state.ball.velocity.z * deltaSeconds;
  state.ball.velocity.y -= GRAVITY * deltaSeconds;

  if (
    state.ball.flight === "kick" &&
    Math.abs(state.ball.position.x) >= PITCH.touchLines.right
  ) {
    startLineout(
      state,
      state.ball.lastTouchedTeam ?? 0,
      clamp(state.ball.position.z, PITCH.tryLines.south, PITCH.tryLines.north),
      state.ball.position.x,
    );
    return;
  }

  if (state.ball.position.y <= 2.2) {
    const catcher = state.players
      .filter(
        (player) =>
          distance(player.position, state.ball.position) <= 1.5 &&
          (state.ball.flight !== "pass" && state.ball.flight !== "lineout" ||
            player.id === state.ball.intendedReceiverId),
      )
      .sort(
        (a, b) =>
          distance(a.position, state.ball.position) -
          distance(b.position, state.ball.position),
      )[0];
    if (catcher) {
      if (random() < (1 - catcher.skills.handling) * 0.25) {
        state.ball.position.x = clamp(
          state.ball.position.x + (random() - 0.5) * 3,
          PITCH.touchLines.left,
          PITCH.touchLines.right,
        );
        state.ball.position.y = 0.15;
        state.ball.velocity = { x: 0, y: 0, z: 0 };
        state.ball.flight = null;
        state.ball.intendedReceiverId = null;
        return;
      }
      carryBall(state, catcher);
      return;
    }
  }
  if (state.ball.position.y <= 0.15) {
    state.ball.position.y = 0.15;
    state.ball.velocity = { x: 0, y: 0, z: 0 };
    state.ball.flight = null;
    state.ball.intendedReceiverId = null;
  }
};

const closestForwards = (
  state: GameState,
  team: Team,
  position: Position,
  count: number,
) =>
  state.players
    .filter((player) => player.team === team && isForward(player))
    .sort((a, b) => distance(a.position, position) - distance(b.position, position))
    .slice(0, count)
    .map((player) => player.id);

const chooseRuckPlay = (team: Team, position: Position, random: Random) => {
  if (insideOwnTwentyTwo(team, position.z)) return "clearance" as const;
  const tendencies = TEAMS[team].tendencies;
  const roll = random();
  if (roll < tendencies.carry * 0.45) return "pickAndGo" as const;
  if (roll < tendencies.carry * 0.45 + tendencies.kick) return "boxKick" as const;
  return "pass" as const;
};

const startRuck = (state: GameState, carrier: Player, random: Random) => {
  const attackers = closestForwards(state, carrier.team, carrier.position, 3);
  const defenders = closestForwards(state, otherTeam(carrier.team), carrier.position, 2);
  state.ball = {
    position: { ...carrier.position, y: 0.15 },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: carrier.team,
    kickOrigin: null,
  };
  state.phase = {
    kind: "ruck",
    stage: "arrivals",
    position: { ...carrier.position },
    attackingTeam: carrier.team,
    tempo: random() < 0.45 ? "quick" : "slow",
    play: chooseRuckPlay(carrier.team, carrier.position, random),
    counterRuck: false,
    winningTeam: null,
    elapsed: 0,
    attackers,
    defenders,
  };
};

const attemptTackle = (state: GameState, random: Random) => {
  const carrier = state.players.find((player) => player.id === state.ball.carrierId);
  if (!carrier) return false;
  const tackler = state.players
    .filter(
      (player) =>
        player.team !== carrier.team &&
        player.tackleCooldown === 0 &&
        distance(player.position, carrier.position) <= 1.3,
    )
    .sort(
      (a, b) =>
        distance(a.position, carrier.position) - distance(b.position, carrier.position),
    )[0];
  if (!tackler) return false;
  tackler.tackleCooldown = 1;
  tackler.stamina = Math.max(0, tackler.stamina - 1);
  const chance = clamp(
    (0.62 + (effectiveWeight(tackler) - effectiveWeight(carrier)) / 180) *
      (0.55 + tackler.skills.tackling * 0.45),
    0.25,
    0.92,
  );
  if (random() >= chance) return false;
  startRuck(state, carrier, random);
  return true;
};

const groupWeight = (state: GameState, ids: string[]) =>
  ids.reduce((total, id) => {
    const player = state.players.find((candidate) => candidate.id === id);
    return total + (player ? effectiveWeight(player) : 0);
  }, 0);

const executeRuckPlay = (state: GameState, random: Random) => {
  const phase = state.phase;
  if (phase.kind !== "ruck") return;
  const team = phase.winningTeam ?? phase.attackingTeam;
  const nine = state.players.find(
    (player) => player.team === team && player.role === ROLES.ScrumHalf,
  );
  if (!nine) return;

  if (phase.play === "pickAndGo") {
    const runner = state.players
      .filter((player) => player.team === team && isForward(player))
      .sort(
        (a, b) => distance(a.position, phase.position) - distance(b.position, phase.position),
      )[0];
    if (runner) carryBall(state, runner);
  } else if (phase.play === "boxKick") {
    launchBall(
      state,
      nine,
      {
        x: clamp(nine.position.x + (random() - 0.5) * 10, -30, 30),
        z: nine.position.z + attackDirection(team) * 25,
      },
      "kick",
      null,
      random,
    );
  } else {
    const receiver = state.players.find(
      (player) =>
        player.team === team &&
        player.role === (phase.play === "clearance" ? ROLES.FlyHalf : ROLES.FlyHalf),
    );
    if (receiver) {
      launchBall(state, nine, receiver.position, "pass", receiver.id, random);
      if (phase.play === "clearance") state.pendingClearanceKickerId = receiver.id;
    } else {
      carryBall(state, nine);
    }
  }
  state.phase = { kind: "openPlay" };
};

const updateRuck = (state: GameState, deltaSeconds: number, random: Random) => {
  const phase = state.phase;
  if (phase.kind !== "ruck") return;
  phase.elapsed += deltaSeconds;
  const attackersReady = phase.attackers.every((id) => {
    const player = state.players.find((candidate) => candidate.id === id);
    return player && distance(player.position, phase.position) <= 4;
  });

  if (phase.stage === "arrivals") {
    if (!attackersReady && phase.elapsed < 3) return;
    const attackWeight = groupWeight(state, phase.attackers);
    const defenceWeight = groupWeight(state, phase.defenders);
    phase.counterRuck = defenceWeight * (0.8 + random() * 0.4) > attackWeight * 0.7;
    phase.winningTeam =
      phase.counterRuck && defenceWeight * (0.85 + random() * 0.3) > attackWeight
        ? otherTeam(phase.attackingTeam)
        : phase.attackingTeam;
    if (phase.winningTeam !== phase.attackingTeam) {
      phase.attackingTeam = phase.winningTeam;
      phase.attackers = closestForwards(state, phase.attackingTeam, phase.position, 3);
      phase.defenders = closestForwards(
        state,
        otherTeam(phase.attackingTeam),
        phase.position,
        2,
      );
      phase.play = chooseRuckPlay(phase.attackingTeam, phase.position, random);
    }
    phase.stage = "secure";
    phase.elapsed = 0;
    return;
  }

  if (phase.stage === "secure") {
    const nine = state.players.find(
      (player) =>
        player.team === phase.attackingTeam && player.role === ROLES.ScrumHalf,
    );
    const nineReady = nine && distance(nine.position, phase.position) <= 4.5;
    const minimum = phase.tempo === "quick" ? 0.8 : 2.5;
    if ((!nineReady || !attackersReady) && phase.elapsed < 5) return;
    if (phase.elapsed < minimum) return;
    phase.stage = "available";
    phase.elapsed = 0;
    return;
  }

  const shapeReady = state.players
    .filter(
      (player) =>
        player.team === phase.attackingTeam &&
        !phase.attackers.includes(player.id) &&
        player.role !== ROLES.FullBack,
    )
    .filter((player) => distance(player.position, player.intentTarget) <= 3).length;
  if (phase.elapsed < 0.5 || (shapeReady < 6 && phase.elapsed < 4)) return;
  executeRuckPlay(state, random);
};

const updateKickoff = (state: GameState, deltaSeconds: number) => {
  const phase = state.phase;
  if (phase.kind !== "kickoff") return;
  if (phase.stage === "forming") {
    if (
      state.players.every(
        (player) =>
          distance(player.position, getKickoffTarget(player, phase.kickingTeam)) <= 1,
      )
    ) {
      phase.stage = "ready";
      phase.readyForSeconds = 0;
    }
    return;
  }
  if (phase.stage === "ready") {
    phase.readyForSeconds += deltaSeconds;
    if (phase.readyForSeconds < 0.75) return;
    const kicker = state.players.find(
      (player) => player.team === phase.kickingTeam && player.role === ROLES.FlyHalf,
    );
    const receiver = state.players.find(
      (player) => player.team !== phase.kickingTeam && player.role === ROLES.FullBack,
    );
    if (!kicker || !receiver) return;
    launchBall(state, kicker, receiver.position, "kickoff", receiver.id);
    phase.stage = "inFlight";
    return;
  }
  if (state.ball.carrierId || state.ball.flight === null) state.phase = { kind: "openPlay" };
};

const updateLineout = (state: GameState, deltaSeconds: number) => {
  const phase = state.phase;
  if (phase.kind !== "lineout") return;
  phase.elapsed += deltaSeconds;
  if (phase.stage === "forming") {
    const ready = state.players.every(
      (player) =>
        distance(
          player.position,
          getLineoutTarget(player, phase.position, phase.throwingTeam),
        ) <= 1.5,
    );
    if (!ready && phase.elapsed < 8) return;
    phase.stage = "ready";
    phase.elapsed = 0;
    return;
  }
  if (phase.stage === "ready") {
    if (phase.elapsed < 0.75) return;
    const hooker = state.players.find(
      (player) => player.team === phase.throwingTeam && player.role === ROLES.Hooker,
    );
    const jumper = state.players.find(
      (player) => player.team === phase.throwingTeam && player.role === ROLES.Lock,
    );
    if (!hooker || !jumper) return;
    launchBall(state, hooker, jumper.position, "lineout", jumper.id);
    phase.stage = "inFlight";
    return;
  }
  if (state.ball.carrierId || state.ball.flight === null) state.phase = { kind: "openPlay" };
};

const scoreTry = (state: GameState, team: Team) => {
  state.scores[team] += 5;
  state.ball.carrierId = null;
  state.ball.flight = null;
  state.pendingClearanceKickerId = null;
  state.phase = {
    kind: "kickoff",
    stage: "forming",
    kickingTeam: otherTeam(team),
    readyForSeconds: 0,
    reason: "try",
  };
};

const desiredVelocity = (player: Player, target: Position): Position => {
  const dx = target.x - player.position.x;
  const dz = target.z - player.position.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.35) return { x: 0, z: 0 };
  const speed = effectiveSpeed(player);
  return { x: (dx / length) * speed, z: (dz / length) * speed };
};

const advanceDefensiveLine = (state: GameState, deltaSeconds: number) => {
  if (state.phase.kind === "ruck") {
    const direction = attackDirection(state.phase.attackingTeam);
    state.defensiveLineZ[otherTeam(state.phase.attackingTeam)] =
      state.phase.position.z + direction * 8;
    return;
  }
  if (state.phase.kind !== "openPlay") return;
  const carrier = state.players.find((player) => player.id === state.ball.carrierId);
  if (!carrier) return;
  const direction = attackDirection(carrier.team);
  const defendingTeam = otherTeam(carrier.team);
  const limit = carrier.position.z + direction * 1.5;
  const advanced =
    state.defensiveLineZ[defendingTeam] -
    direction * TEAMS[defendingTeam].lineSpeed * deltaSeconds;
  state.defensiveLineZ[defendingTeam] =
    direction === 1 ? Math.max(limit, advanced) : Math.min(limit, advanced);
};

const separatedVelocity = (
  state: GameState,
  player: Player,
  velocity: Position,
): Position => {
  let x = velocity.x;
  let z = velocity.z;
  for (const other of state.players) {
    const gap = distance(player.position, other.position);
    if (other.id === player.id || other.team !== player.team || gap === 0 || gap >= 2.5) {
      continue;
    }
    x += ((player.position.x - other.position.x) / gap) * (2.5 - gap) * 1.8;
    z += ((player.position.z - other.position.z) / gap) * (2.5 - gap) * 1.8;
  }
  return { x, z };
};

export const applyCommands = (
  state: GameState,
  commands: PlayerCommand[],
  deltaSeconds: number,
  random: Random = Math.random,
) => {
  const nextMotion = commands.map((next) => {
    const player = state.players.find(({ id }) => id === next.playerId)!;
    player.tackleCooldown = Math.max(0, player.tackleCooldown - deltaSeconds);
    player.hardLineForSeconds = next.startHardLine
      ? 1.5
      : Math.max(0, player.hardLineForSeconds - deltaSeconds);
    player.decisionForSeconds = next.decisionForSeconds ??
      Math.max(0, player.decisionForSeconds - deltaSeconds);
    player.intentForSeconds = Math.max(0, player.intentForSeconds - deltaSeconds);
    if (
      next.immediate ||
      player.intentKind !== next.intentKind ||
      player.intentForSeconds === 0
    ) {
      player.intentTarget = { ...next.target };
      player.intentKind = next.intentKind;
      player.intentForSeconds = 0.35 + (player.number % 4) * 0.07;
    }
    const desired = separatedVelocity(
      state,
      player,
      desiredVelocity(player, player.intentTarget),
    );
    const maxChange = 7 * deltaSeconds;
    const changeX = desired.x - player.velocity.x;
    const changeZ = desired.z - player.velocity.z;
    const changeLength = Math.hypot(changeX, changeZ);
    const scale = changeLength > maxChange && changeLength > 0 ? maxChange / changeLength : 1;
    return {
      player,
      velocity: {
        x: player.velocity.x + changeX * scale,
        z: player.velocity.z + changeZ * scale,
      },
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
  if (state.phase.kind === "openPlay" && carrier) {
    const scored =
      carrier.team === 0
        ? carrier.position.z >= PITCH.tryLines.north
        : carrier.position.z <= PITCH.tryLines.south;
    if (scored) {
      scoreTry(state, carrier.team);
      return;
    }
  }

  const action = commands.find((next) => next.playerId === carrier?.id)?.ballAction;
  if (carrier && action?.kind === "pass") {
    const receiver = state.players.find((player) => player.id === action.receiverId);
    if (receiver?.team === carrier.team) {
      launchBall(state, carrier, receiver.position, "pass", receiver.id, random);
      if (action.clearance) state.pendingClearanceKickerId = receiver.id;
    }
  } else if (carrier && action?.kind === "kick") {
    launchBall(state, carrier, action.target, action.flight ?? "kick", null, random);
    state.pendingClearanceKickerId = null;
  }

  if (
    state.phase.kind === "openPlay" ||
    (state.phase.kind === "kickoff" && state.phase.stage === "inFlight") ||
    (state.phase.kind === "lineout" && state.phase.stage === "inFlight")
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
  updateKickoff(state, deltaSeconds);
  updateLineout(state, deltaSeconds);
};

export const updateGame = (
  state: GameState,
  deltaSeconds: number,
  random: Random = Math.random,
) => {
  advanceDefensiveLine(state, deltaSeconds);
  applyCommands(state, computeCommands(state, random), deltaSeconds, random);
};

export const createGame = (): GameState => ({
  players: ([0, 1] as const).flatMap((team) =>
    ATTACK_FORMATION.map((slot, index) => {
      const position = { x: slot.x, z: slot.z * attackDirection(team) };
      const profile = getPlayerProfile(team, index + 1, slot.role);
      return {
        id: `team-${team}-player-${index + 1}`,
        team,
        number: index + 1,
        role: slot.role,
        pod: slot.pod,
        position,
        velocity: { x: 0, z: 0 },
        intentTarget: { ...position },
        intentKind: "kickoff-forming",
        intentForSeconds: 0,
        decisionForSeconds: 0,
        speed: profile.speed,
        weight: profile.weight,
        stamina: 100,
        injuryPenalty: 0,
        tackleCooldown: 0,
        hardLineForSeconds: 0,
        kickOffside: false,
        skills: profile.skills,
      };
    }),
  ),
  ball: {
    position: { x: 0, y: 0.15, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: null,
    kickOrigin: null,
  },
  scores: [0, 0],
  phase: {
    kind: "kickoff",
    stage: "forming",
    kickingTeam: 1,
    readyForSeconds: 0,
    reason: "matchStart",
  },
  pendingClearanceKickerId: null,
  defensiveLineZ: [-3, 3],
});
