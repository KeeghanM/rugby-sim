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
  getOpenPlayTarget,
  getRuckTarget,
  isForward,
} from "./formations.ts";

type BallAction =
  | { kind: "pass"; receiverId: string }
  | { kind: "kick"; target: Position };
type PlayerCommand = {
  playerId: string;
  velocity: Position;
  ballAction?: BallAction;
  startHardLine?: boolean;
};
type Random = () => number;

const GRAVITY = 9.81;
const distance = (a: Position, b: Position) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const velocityTowards = (
  from: Position,
  target: Position,
  speed: number,
): Position => {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const length = Math.hypot(dx, dz);
  return length === 0
    ? { x: 0, z: 0 }
    : { x: (dx / length) * speed, z: (dz / length) * speed };
};

const effectiveSpeed = (player: Player) =>
  Math.max(0, player.speed * (player.stamina / 100) - player.injuryPenalty);
const effectiveWeight = (player: Player) => player.weight * (player.stamina / 100);

const separationVelocity = (players: Player[], player: Player): Position => {
  const result = { x: 0, z: 0 };
  for (const other of players) {
    const gap = distance(player.position, other.position);
    if (
      other.id === player.id ||
      other.team !== player.team ||
      gap === 0 ||
      gap >= 3
    ) {
      continue;
    }
    result.x += ((player.position.x - other.position.x) / gap) * (3 - gap);
    result.z += ((player.position.z - other.position.z) / gap) * (3 - gap);
  }
  return result;
};

const movementCommand = (
  players: Player[],
  player: Player,
  target: Position,
): PlayerCommand => {
  const velocity = velocityTowards(player.position, target, effectiveSpeed(player));
  const separation = separationVelocity(players, player);
  return {
    playerId: player.id,
    velocity: {
      x: velocity.x + separation.x * 2.5,
      z: velocity.z + separation.z * 2.5,
    },
  };
};

const nearestOpponentDistance = (players: Player[], player: Player) =>
  players.reduce(
    (nearest, other) =>
      other.team === player.team
        ? nearest
        : Math.min(nearest, distance(player.position, other.position)),
    Infinity,
  );

const choosePassTarget = (players: Player[], carrier: Player) =>
  players
    .filter(
      (player) =>
        player.team === carrier.team &&
        player.id !== carrier.id &&
        (player.position.z - carrier.position.z) * attackDirection(carrier.team) <=
          0 &&
        distance(player.position, carrier.position) <= 15,
    )
    .map((player) => ({
      player,
      space: nearestOpponentDistance(players, player),
      distance: distance(player.position, carrier.position),
    }))
    .sort((a, b) => b.space - a.space || a.distance - b.distance)[0]?.player;

const chooseCarrierCommand = (
  players: Player[],
  carrier: Player,
  random: Random,
): PlayerCommand => {
  const direction = attackDirection(carrier.team);
  const defendersAhead = players
    .filter(
      (player) =>
        player.team !== carrier.team &&
        (player.position.z - carrier.position.z) * direction > 0 &&
        Math.abs(player.position.x - carrier.position.x) < 5 &&
        distance(player.position, carrier.position) < 9,
    )
    .sort(
      (a, b) =>
        distance(a.position, carrier.position) -
        distance(b.position, carrier.position),
    );

  if (defendersAhead.length === 0) {
    return {
      playerId: carrier.id,
      velocity: { x: 0, z: direction * effectiveSpeed(carrier) },
    };
  }

  const half = carrier.role === ROLES.ScrumHalf || carrier.role === ROLES.FlyHalf;
  const centre =
    carrier.role === ROLES.InsideCentre || carrier.role === ROLES.OutsideCentre;
  const weights = isForward(carrier)
    ? [0.78, 0.1, 0.1, 0.02]
    : half
      ? [0.25, 0.5, 0.15, 0.1]
      : centre
        ? [0.4, 0.35, 0.2, 0.05]
        : [0.38, 0.12, 0.4, 0.1];
  const roll = random();
  const passTarget = choosePassTarget(players, carrier);

  if (roll < weights[0] || (!passTarget && roll < weights[0] + weights[1])) {
    return {
      playerId: carrier.id,
      velocity: { x: 0, z: direction * effectiveSpeed(carrier) },
    };
  }
  if (roll < weights[0] + weights[1] && passTarget) {
    return {
      playerId: carrier.id,
      velocity: { x: 0, z: direction * effectiveSpeed(carrier) * 0.5 },
      ballAction: { kind: "pass", receiverId: passTarget.id },
    };
  }
  if (roll < weights[0] + weights[1] + weights[2]) {
    const defender = defendersAhead[0];
    const stepDirection = defender.position.x >= carrier.position.x ? -1 : 1;
    return {
      playerId: carrier.id,
      velocity: {
        x: stepDirection * effectiveSpeed(carrier) * 0.75,
        z: direction * effectiveSpeed(carrier) * 0.65,
      },
    };
  }

  return {
    playerId: carrier.id,
    velocity: { x: 0, z: direction * effectiveSpeed(carrier) * 0.25 },
    ballAction: {
      kind: "kick",
      target: {
        x: clamp(
          carrier.position.x + (random() - 0.5) * 20,
          PITCH.touchLines.left + 2,
          PITCH.touchLines.right - 2,
        ),
        z: clamp(
          carrier.position.z + direction * (25 + random() * 15),
          PITCH.deadBallLines.south + 2,
          PITCH.deadBallLines.north - 2,
        ),
      },
    },
  };
};

const chaseLooseBall = (players: Player[], player: Player, target: Position) => {
  const teammates = players.filter((other) => other.team === player.team);
  const nearest = teammates.reduce((best, other) =>
    distance(other.position, target) < distance(best.position, target) ? other : best,
  );
  return nearest.id === player.id || distance(player.position, target) < 14
    ? movementCommand(players, player, target)
    : movementCommand(players, player, getKickoffTarget(player));
};

export const computeCommands = (
  state: GameState,
  random: Random = Math.random,
): PlayerCommand[] => {
  const players = state.players.map((player) => ({
    ...player,
    position: { ...player.position },
  }));
  const phase = state.phase;

  if (phase.kind === "kickoff" && phase.stage !== "inFlight") {
    return players.map((player) =>
      phase.stage === "forming"
        ? movementCommand(players, player, getKickoffTarget(player))
        : { playerId: player.id, velocity: { x: 0, z: 0 } },
    );
  }

  if (phase.kind === "ruck") {
    const ruckParticipants = new Set(
      ([phase.attackingTeam, otherTeam(phase.attackingTeam)] as const).flatMap(
        (team) =>
          players
            .filter((player) => player.team === team && isForward(player))
            .sort(
              (a, b) =>
                distance(a.position, phase.position) -
                distance(b.position, phase.position),
            )
            .slice(0, team === phase.attackingTeam ? 3 : 2)
            .map((player) => player.id),
      ),
    );
    return players.map((player) =>
      phase.stage === "ready"
        ? { playerId: player.id, velocity: { x: 0, z: 0 } }
        : movementCommand(
            players,
            player,
            getRuckTarget(
              player,
              phase.position,
              phase.attackingTeam,
              ruckParticipants.has(player.id),
            ),
          ),
    );
  }

  const carrier = players.find((player) => player.id === state.ball.carrierId);
  if (!carrier) {
    const target = { x: state.ball.position.x, z: state.ball.position.z };
    return players.map((player) => chaseLooseBall(players, player, target));
  }

  const attackingResponders = new Set(
    players
      .filter((player) => player.team === carrier.team && player.id !== carrier.id)
      .sort(
        (a, b) =>
          distance(a.position, carrier.position) -
          distance(b.position, carrier.position),
      )
      .slice(0, 2)
      .map((player) => player.id),
  );
  const defendingResponders = new Set(
    players
      .filter((player) => player.team !== carrier.team)
      .sort(
        (a, b) =>
          distance(a.position, carrier.position) -
          distance(b.position, carrier.position),
      )
      .slice(0, 2)
      .map((player) => player.id),
  );

  return players.map((player) => {
    if (player.id === carrier.id) return chooseCarrierCommand(players, carrier, random);

    const formationTarget = getOpenPlayTarget(state, player, carrier);
    const direction = attackDirection(player.team);
    const isAttacking = player.team === carrier.team;
    const isOffside =
      isAttacking &&
      player.hardLineForSeconds === 0 &&
      (player.position.z - carrier.position.z) * direction >= 0;
    if (isOffside) {
      return movementCommand(players, player, {
        x: formationTarget.x,
        z: carrier.position.z - direction * 2,
      });
    }

    const ballDistance = distance(player.position, carrier.position);
    const radius = player.team === carrier.team ? 12 : 16;
    const reacts =
      player.team === carrier.team
        ? attackingResponders.has(player.id)
        : defendingResponders.has(player.id);
    const influence = reacts ? Math.max(0, 1 - ballDistance / radius) : 0;
    if (influence === 0) return movementCommand(players, player, formationTarget);

    const canRunHardLine =
      isAttacking &&
      player.hardLineForSeconds === 0 &&
      (player.role === ROLES.InsideCentre ||
        player.role === ROLES.OutsideCentre ||
        player.role === ROLES.Wing) &&
      ballDistance >= 4 &&
      ballDistance <= 10 &&
      random() < 0.01;
    if (canRunHardLine || player.hardLineForSeconds > 0) {
      const command = movementCommand(players, player, {
        x: carrier.position.x + (formationTarget.x - carrier.position.x) * 0.2,
        z: carrier.position.z + direction * 3,
      });
      command.startHardLine = canRunHardLine;
      return command;
    }

    const reactionTarget =
      player.team === carrier.team
        ? {
            x: carrier.position.x + (formationTarget.x - carrier.position.x) * 0.35,
            z:
              carrier.position.z -
              attackDirection(player.team) * (3 + Math.abs(formationTarget.x) * 0.05),
          }
        : carrier.position;
    return movementCommand(players, player, {
      x: formationTarget.x + (reactionTarget.x - formationTarget.x) * influence,
      z: formationTarget.z + (reactionTarget.z - formationTarget.z) * influence,
    });
  });
};

const launchBall = (
  state: GameState,
  carrier: Player,
  target: Position,
  flight: "pass" | "kick" | "kickoff",
  intendedReceiverId: string | null,
) => {
  const horizontalDistance = distance(carrier.position, target);
  const duration = flight === "pass" ? Math.max(0.35, horizontalDistance / 14) : 2;
  state.ball = {
    position: { ...carrier.position, y: 1.25 },
    velocity: {
      x: (target.x - carrier.position.x) / duration,
      y: (GRAVITY * duration) / 2,
      z: (target.z - carrier.position.z) / duration,
    },
    carrierId: null,
    flight,
    intendedReceiverId,
  };
};

const carryBall = (state: GameState, player: Player) => {
  state.ball.carrierId = player.id;
  state.ball.flight = null;
  state.ball.intendedReceiverId = null;
  state.ball.velocity = { x: 0, y: 0, z: 0 };
  state.ball.position = { ...player.position, y: 1.25 };
};

const updateBall = (state: GameState, deltaSeconds: number) => {
  const carrier = state.players.find((player) => player.id === state.ball.carrierId);
  if (carrier) {
    state.ball.position = { ...carrier.position, y: 1.25 };
    return;
  }

  if (state.ball.flight) {
    state.ball.position.x += state.ball.velocity.x * deltaSeconds;
    state.ball.position.y += state.ball.velocity.y * deltaSeconds;
    state.ball.position.z += state.ball.velocity.z * deltaSeconds;
    state.ball.velocity.y -= GRAVITY * deltaSeconds;

    if (state.ball.position.y <= 2.2) {
      const catchers = state.players
        .filter(
          (player) =>
            distance(player.position, state.ball.position) <= 1.5 &&
            (state.ball.flight !== "pass" ||
              player.id === state.ball.intendedReceiverId),
        )
        .sort(
          (a, b) =>
            distance(a.position, state.ball.position) -
            distance(b.position, state.ball.position),
        );
      if (catchers[0]) {
        carryBall(state, catchers[0]);
        return;
      }
    }

    if (state.ball.position.y <= 0.15) {
      state.ball.position.y = 0.15;
      state.ball.velocity = { x: 0, y: 0, z: 0 };
      state.ball.flight = null;
      state.ball.intendedReceiverId = null;
    }
    return;
  }

  const picker = state.players
    .filter((player) => distance(player.position, state.ball.position) <= 0.8)
    .sort(
      (a, b) =>
        distance(a.position, state.ball.position) -
        distance(b.position, state.ball.position),
    )[0];
  if (picker) carryBall(state, picker);
};

const scoreTry = (state: GameState, team: Team) => {
  state.scores[team] += 5;
  state.ball.carrierId = null;
  state.ball.flight = null;
  state.phase = {
    kind: "kickoff",
    stage: "forming",
    kickingTeam: otherTeam(team),
    readyForSeconds: 0,
    reason: "try",
  };
};

const startRuck = (state: GameState, carrier: Player, random: Random) => {
  const nearbyForwards = state.players.filter(
    (player) =>
      player.team === carrier.team &&
      isForward(player) &&
      distance(player.position, carrier.position) <= 7,
  ).length;
  state.ball = {
    position: { ...carrier.position, y: 0.15 },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
  };
  const strategy = nearbyForwards >= 2 && random() < 0.45 ? "pickAndGo" : "slow";
  state.phase = {
    kind: "ruck",
    stage: "forming",
    position: { ...carrier.position },
    attackingTeam: carrier.team,
    strategy,
    counterRuck: false,
    winningTeam: null,
    elapsed: 0,
    releaseAfterSeconds:
      strategy === "slow" ? 20 + random() * 40 : 3 + random() * 7,
  };
};

const attemptTackle = (state: GameState, random: Random) => {
  const carrier = state.players.find((player) => player.id === state.ball.carrierId);
  if (!carrier) return false;
  const tackler = state.players
    .filter(
      (player) =>
        player.team !== carrier.team && distance(player.position, carrier.position) <= 1.1,
    )
    .sort(
      (a, b) =>
        distance(a.position, carrier.position) -
        distance(b.position, carrier.position),
    )[0];
  if (!tackler) return false;

  tackler.tackleCooldown = 1;
  tackler.stamina = Math.max(0, tackler.stamina - 1);

  const chance = clamp(
    0.5 + (effectiveWeight(tackler) - effectiveWeight(carrier)) / 180,
    0.18,
    0.88,
  );
  if (random() < chance) {
    startRuck(state, carrier, random);
    return true;
  }
  return false;
};

const ruckWeight = (state: GameState, team: Team, radius: number) => {
  const phase = state.phase;
  if (phase.kind !== "ruck") return 0;
  return state.players.reduce(
    (total, player) =>
      player.team === team && distance(player.position, phase.position) <= radius
        ? total + effectiveWeight(player)
        : total,
    0,
  );
};

const updateRuck = (state: GameState, deltaSeconds: number, random: Random) => {
  const phase = state.phase;
  if (phase.kind !== "ruck") return;
  phase.elapsed += deltaSeconds;

  if (phase.stage === "forming") {
    const attackers = ruckWeight(state, phase.attackingTeam, 4);
    const defenders = ruckWeight(state, otherTeam(phase.attackingTeam), 5);
    if (phase.elapsed < 2 && attackers < 180) return;
    phase.counterRuck = defenders * (0.8 + random() * 0.4) > attackers * 0.7;
    phase.stage = "contest";
    phase.elapsed = 0;
    return;
  }

  if (phase.stage === "contest") {
    if (phase.elapsed < phase.releaseAfterSeconds) return;
    const attackWeight = ruckWeight(state, phase.attackingTeam, 4) *
      (0.9 + random() * 0.2);
    const defenceWeight = phase.counterRuck
      ? ruckWeight(state, otherTeam(phase.attackingTeam), 4) *
        (0.85 + random() * 0.3)
      : 0;
    phase.winningTeam =
      defenceWeight > attackWeight ? otherTeam(phase.attackingTeam) : phase.attackingTeam;
    phase.stage = "ready";
    phase.elapsed = 0;
    return;
  }

  if (phase.elapsed < 0.6 || phase.winningTeam === null) return;
  const winningTeam = phase.winningTeam;
  const pickAndGo = winningTeam === phase.attackingTeam && phase.strategy === "pickAndGo";
  const candidates = state.players
    .filter(
      (player) =>
        player.team === winningTeam &&
        (pickAndGo ? isForward(player) : player.role === ROLES.ScrumHalf),
    )
    .sort(
      (a, b) => distance(a.position, phase.position) - distance(b.position, phase.position),
    );
  const receiver =
    candidates[0] ??
    state.players
      .filter((player) => player.team === winningTeam)
      .sort(
        (a, b) => distance(a.position, phase.position) - distance(b.position, phase.position),
      )[0];
  if (receiver) carryBall(state, receiver);
  state.phase = { kind: "openPlay" };
};

const updateKickoff = (state: GameState, deltaSeconds: number) => {
  const phase = state.phase;
  if (phase.kind !== "kickoff") return;

  if (phase.stage === "forming") {
    const ready = state.players.every(
      (player) => distance(player.position, getKickoffTarget(player)) <= 0.5,
    );
    if (ready) {
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

export const applyCommands = (
  state: GameState,
  commands: PlayerCommand[],
  deltaSeconds: number,
  random: Random = Math.random,
) => {
  for (const command of commands) {
    const player = state.players.find(({ id }) => id === command.playerId);
    if (!player) continue;
    player.tackleCooldown = Math.max(0, player.tackleCooldown - deltaSeconds);
    player.hardLineForSeconds = command.startHardLine
      ? 1.5
      : Math.max(0, player.hardLineForSeconds - deltaSeconds);
    player.position.x = clamp(
      player.position.x + command.velocity.x * deltaSeconds,
      PITCH.touchLines.left,
      PITCH.touchLines.right,
    );
    player.position.z = clamp(
      player.position.z + command.velocity.z * deltaSeconds,
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
  const action = commands.find((command) => command.playerId === carrier?.id)?.ballAction;
  if (carrier && action?.kind === "pass") {
    const receiver = state.players.find((player) => player.id === action.receiverId);
    if (receiver?.team === carrier.team) {
      launchBall(state, carrier, receiver.position, "pass", receiver.id);
    }
  } else if (carrier && action?.kind === "kick") {
    launchBall(state, carrier, action.target, "kick", null);
  }

  if (
    state.phase.kind === "openPlay" ||
    (state.phase.kind === "kickoff" && state.phase.stage === "inFlight")
  ) {
    updateBall(state, deltaSeconds);
  }

  if (state.phase.kind === "openPlay") {
    const currentCarrier = state.players.find(
      (player) => player.id === state.ball.carrierId,
    );
    if (currentCarrier) {
      if (attemptTackle(state, random)) return;
    }
  }

  updateRuck(state, deltaSeconds, random);
  updateKickoff(state, deltaSeconds);
};

export const updateGame = (
  state: GameState,
  deltaSeconds: number,
  random: Random = Math.random,
) => applyCommands(state, computeCommands(state, random), deltaSeconds, random);

const weightForRole = (role: Player["role"]) => {
  if (isForward({ role })) return 108;
  if (role === ROLES.ScrumHalf || role === ROLES.FlyHalf) return 82;
  return 92;
};

export const createGame = (): GameState => ({
  players: ([0, 1] as const).flatMap((team) =>
    ATTACK_FORMATION.map((slot, index) => ({
      id: `team-${team}-player-${index + 1}`,
      team,
      number: index + 1,
      role: slot.role,
      pod: slot.pod,
      position: { x: slot.x, z: slot.z * attackDirection(team) },
      speed: 5,
      weight: weightForRole(slot.role),
      stamina: 100,
      injuryPenalty: 0,
      tackleCooldown: 0,
      hardLineForSeconds: 0,
    })),
  ),
  ball: {
    position: { x: 0, y: 0.15, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
  },
  scores: [0, 0],
  phase: {
    kind: "kickoff",
    stage: "forming",
    kickingTeam: 1,
    readyForSeconds: 0,
    reason: "matchStart",
  },
});
