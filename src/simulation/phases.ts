import { attackDirection, type GameState, otherTeam, PITCH, type Player, type Position, ROLES, type Team } from "../domain.ts";
import { getKickoffTarget, getLineoutTarget, isForward, LINEOUT_MEMBER_VARIANTS } from "../formations.ts";
import { TEAMS } from "../teams.ts";
import { carryBall, launchBall } from "./ball.ts";
import {
  clamp,
  distance,
  effectiveSkill,
  effectiveWeight,
  insideOwnTwentyTwo,
} from "./math.ts";
import type { Random } from "./types.ts";

// Selects nearest available players to contest or clear a ruck based on proximity and role.
const closestRuckJoiners = (
  state: GameState,
  team: Team,
  position: Position,
  targetCount: number,
  excludeId?: string,
) => {
  const candidates = state.players
    .filter((player) => player.team === team && player.id !== excludeId)
    .map((player) => {
      const dist = distance(player.position, position);
      // Forwards have slight preference, but proximity dominates (a back at 2m beats a forward at 10m)
      const forwardBonus = isForward(player) ? 0 : 3.5;
      return { player, score: dist + forwardBonus, dist };
    })
    // Only pull players who are reasonably nearby (within 18m)
    .filter(({ dist }) => dist <= 18)
    .sort((a, b) => a.score - b.score);

  return candidates.slice(0, targetCount).map(({ player }) => player.id);
};

// Chooses next ruck play from field position and team tendencies.
const chooseRuckPlay = (team: Team, position: Position, random: Random) => {
  // Force clearance play inside team's own twenty-two.
  if (insideOwnTwentyTwo(team, position.z)) return "clearance" as const;
  const tendencies = TEAMS[team].tendencies;
  const roll = random();
  // Select pick-and-go from carry-weighted first range.
  if (roll < tendencies.carry * 0.45) return "pickAndGo" as const;
  // Select box kick from following kick-weighted range.
  if (roll < tendencies.carry * 0.45 + tendencies.kick) return "boxKick" as const;
  return "pass" as const;
};

// Converts successful tackle into initialized ruck state.
const startRuck = (
  state: GameState,
  carrier: Player,
  tackler: Player,
  random: Random,
) => {
  carrier.pendingBallAction = null;
  const attackers = [
    carrier.id,
    ...closestRuckJoiners(state, carrier.team, carrier.position, 2, carrier.id),
  ];
  const defenders = [
    tackler.id,
    ...closestRuckJoiners(
      state,
      otherTeam(carrier.team),
      carrier.position,
      1,
      tackler.id,
    ),
  ];
  // Prevent carrier and committed cleaners from becoming immediate pass targets.
  for (const player of state.players) {
    if (
      player.id === carrier.id ||
      attackers.includes(player.id) ||
      defenders.includes(player.id)
    ) {
      player.ruckRecoverySeconds = 999;
    }
  }
  state.ball = {
    position: { ...carrier.position, y: 0.15 },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: carrier.team,
    kickOrigin: null,
    bouncesRemaining: 0,
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
    tackledPlayerId: carrier.id,
    tacklerId: tackler.id,
  };
  // Reverse phase direction only when contact reaches current touch-side limit.
  if (carrier.position.x <= -25) state.attackFlow[carrier.team] = 1;
  if (carrier.position.x >= 25) state.attackFlow[carrier.team] = -1;
};

// Attempts nearest eligible defender's tackle against carrier.
export const attemptTackle = (state: GameState, random: Random) => {
  const carrier = state.players.find((player) => player.id === state.ball.carrierId);
  // Abort when no current carrier exists.
  if (!carrier) return false;
  const tackler = state.players
    .filter(
      (player) =>
        player.team !== carrier.team &&
        player.tackleCooldown === 0 &&
        distance(player.position, carrier.position) <= 1.4,
    )
    .sort(
      (a, b) =>
        distance(a.position, carrier.position) -
        distance(b.position, carrier.position),
    )[0];
  // Abort when no defender is close and ready enough to tackle.
  if (!tackler) return false;
  tackler.tackleCooldown = 0.5;
  tackler.stamina = Math.max(0, tackler.stamina - 1.5);
  // Decisive tackle: contact in range immediately brings down carrier into a ruck
  startRuck(state, carrier, tackler, random);
  return true;
};

// Totals effective weight of phase participant IDs.
const groupWeight = (state: GameState, ids: string[]) =>
  ids.reduce((total, id) => {
    const player = state.players.find((candidate) => candidate.id === id);
    return total + (player ? effectiveWeight(player) : 0);
  }, 0);

// Releases won ruck ball through selected play.
const executeRuckPlay = (state: GameState, random: Random) => {
  const phase = state.phase;
  // Ignore execution after phase changed away from ruck.
  if (phase.kind !== "ruck") return;
  const team = phase.winningTeam ?? phase.attackingTeam;
  const isAvailable = (p: Player) =>
    !phase.attackers.includes(p.id) && !phase.defenders.includes(p.id);
  // Find primary halfback (9), or fallback to nearest available back/player if 9 is in ruck
  const preferredHalf = state.players.find(
    (p) => p.team === team && p.role === ROLES.ScrumHalf && isAvailable(p),
  );
  const distributor = preferredHalf ?? state.players
    .filter((p) => p.team === team && isAvailable(p))
    .sort(
      (a, b) =>
        distance(a.position, phase.position) -
        distance(b.position, phase.position),
    )[0];
  // Wait when winning team has no available distributor.
  if (!distributor) return;

  // Start short recovery clock for everyone who committed body weight to ruck.
  for (const player of state.players) {
    if (player.ruckRecoverySeconds > 0) player.ruckRecoverySeconds = 3;
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
    // Establish possession when runner exists.
    if (runner) {
      runner.stamina = clamp(runner.stamina - 0.3, 0, 100);
      carryBall(state, runner);
    }
  // Launch box kick from distributor when selected.
  } else if (phase.play === "boxKick") {
    distributor.stamina = clamp(distributor.stamina - 0.8, 0, 100);
    launchBall(
      state,
      distributor,
      {
        x: clamp(distributor.position.x + (random() - 0.5) * 10, -30, 30),
        z: distributor.position.z + attackDirection(team) * 25,
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
    // Pass when receiver exists.
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
      // Mark receiver to clear after clearance ruck play.
      if (phase.play === "clearance") state.pendingClearanceKickerId = receiver.id;
    // Keep ball with distributor when receiver is unavailable.
    } else {
      carryBall(state, distributor);
    }
  }
  state.phase = { kind: "openPlay" };
};

// Advances ruck through arrivals, security, availability, and release.
export const updateRuck = (state: GameState, deltaSeconds: number, random: Random) => {
  const phase = state.phase;
  // Ignore update outside ruck phase.
  if (phase.kind !== "ruck") return;
  phase.elapsed += deltaSeconds;
  const attackersReady = phase.attackers.every((id) => {
    const player = state.players.find((candidate) => candidate.id === id);
    return player && distance(player.position, phase.position) <= 4;
  });

  // Resolve contest after arrivals or timeout.
  if (phase.stage === "arrivals") {
    // Wait for attackers unless arrival timeout expires.
    if (!attackersReady && phase.elapsed < 3) return;
    const attackersArrived = phase.attackers.filter(
      (id) =>
        id !== phase.tackledPlayerId &&
        distance(
          state.players.find((p) => p.id === id)?.position ?? phase.position,
          phase.position,
        ) <= 4,
    ).length;
    const defendersArrived = phase.defenders.filter(
      (id) =>
        distance(
          state.players.find((p) => p.id === id)?.position ?? phase.position,
          phase.position,
        ) <= 4,
    ).length;
    // When carrier is tackled isolated with no close support, defending jackler gets massive turnover advantage
    const jackleMultiplier =
      defendersArrived > 0 && attackersArrived === 0 ? 1.85 : 1.0;
    const attackWeight = groupWeight(state, phase.attackers);
    const defenceWeight =
      groupWeight(state, phase.defenders) * jackleMultiplier;
    phase.counterRuck =
      defenceWeight * (0.8 + random() * 0.4) > attackWeight * 0.7;
    phase.winningTeam =
      phase.counterRuck &&
      defenceWeight * (0.85 + random() * 0.3) > attackWeight
        ? otherTeam(phase.attackingTeam)
        : phase.attackingTeam;
    // Rebuild ruck sides and play when defence wins turnover.
    if (phase.winningTeam !== phase.attackingTeam) {
      phase.attackingTeam = phase.winningTeam;
      phase.attackers = [
        phase.tacklerId,
        ...closestRuckJoiners(
          state,
          phase.attackingTeam,
          phase.position,
          2,
          phase.tacklerId,
        ),
      ];
      phase.defenders = [
        phase.tackledPlayerId,
        ...closestRuckJoiners(
          state,
          otherTeam(phase.attackingTeam),
          phase.position,
          1,
          phase.tackledPlayerId,
        ),
      ];
      // Mark newly committed turnover participants unavailable for immediate passes.
      for (const player of state.players) {
        if (phase.attackers.includes(player.id) || phase.defenders.includes(player.id)) {
          player.ruckRecoverySeconds = 999;
        }
      }
      phase.play = chooseRuckPlay(phase.attackingTeam, phase.position, random);
    }
    phase.stage = "secure";
    phase.elapsed = 0;
    return;
  }

  // Wait for distributor, support, and tempo minimum during secure stage.
  if (phase.stage === "secure") {
    const isAvailable = (p: Player) =>
      !phase.attackers.includes(p.id) && !phase.defenders.includes(p.id);
    const distributor =
      state.players.find(
        (p) =>
          p.team === phase.attackingTeam &&
          p.role === ROLES.ScrumHalf &&
          isAvailable(p),
      ) ??
      state.players
        .filter((p) => p.team === phase.attackingTeam && isAvailable(p))
        .sort(
          (a, b) =>
            distance(a.position, phase.position) -
            distance(b.position, phase.position),
        )[0];
    const distributorReady = distributor && distance(distributor.position, phase.position) <= 4.5;
    const minimum = phase.tempo === "quick" ? 0.8 : 2.5;
    // Allow readiness wait to expire after hard timeout.
    if ((!distributorReady || !attackersReady) && phase.elapsed < 5) return;
    // Preserve quick or slow minimum ruck duration.
    if (phase.elapsed < minimum) return;
    phase.stage = "available";
    phase.elapsed = 0;
    return;
  }

  const shapeReady = state.players
    .filter((player) => player.team === phase.attackingTeam && !phase.attackers.includes(player.id) && player.role !== ROLES.FullBack)
    .filter((player) => distance(player.position, player.intentTarget) <= 3).length;
  // Delay release for minimum availability and attacking shape timeout.
  if (phase.elapsed < 0.5 || (shapeReady < 6 && phase.elapsed < 4)) return;
  executeRuckPlay(state, random);
};

// Advances kickoff formation, pause, flight, and open-play transition.
export const updateKickoff = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  // Ignore update outside kickoff phase.
  if (phase.kind !== "kickoff") return;
  // Wait until all players reach kickoff formation.
  if (phase.stage === "forming") {
    // Enter ready stage once every player reaches target.
    if (
      state.players.every(
        (player) =>
          distance(
            player.position,
            getKickoffTarget(
              player,
              phase.kickingTeam,
              phase.reason,
              TEAMS[phase.kickingTeam].formations.kickoffAttack,
              TEAMS[player.team].formations.kickoffDefence,
            ),
          ) <= 1,
      )
    ) {
      phase.stage = "ready";
      phase.readyForSeconds = 0;
    }
    return;
  }
  // Launch kickoff after ready delay and required players exist.
  if (phase.stage === "ready") {
    phase.readyForSeconds += deltaSeconds;
    // Preserve pre-kick pause.
    if (phase.readyForSeconds < 0.75) return;
    const kicker = state.players.find(
      (player) =>
        player.team === phase.kickingTeam && player.role === ROLES.FlyHalf,
    );
    // Wait when required kicker unavailable.
    if (!kicker) return;
    const receivingTeam = otherTeam(phase.kickingTeam);
    const receivingDirection = attackDirection(receivingTeam);
    const receivingTryLine =
      receivingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north;
    const kickingTryLine =
      phase.kickingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north;
    // Choose territory rather than person: normal kickoff lands in receiving 22.
    const targetPosition = phase.reason === "goalLineDropout"
      ? {
          x: (random() - 0.5) * 36,
          z:
            kickingTryLine +
            attackDirection(phase.kickingTeam) * (22 + random() * 10),
        }
      : {
          x: (random() - 0.5) * 44,
          z: receivingTryLine + receivingDirection * (10 + random() * 10),
        };
    kicker.stamina = clamp(kicker.stamina - 0.8, 0, 100);
    launchBall(state, kicker, targetPosition, "kickoff", null, random);
    phase.stage = "inFlight";
    return;
  }
  // Enter open play after kickoff is caught or lands.
  if (state.ball.carrierId || state.ball.flight === null) {
    for (const player of state.players) player.laneX = player.position.x;
    state.phase = { kind: "openPlay" };
  }
};

// Advances lineout formation, pause, throw, and open-play transition.
export const updateLineout = (state: GameState, deltaSeconds: number) => {
  const phase = state.phase;
  // Ignore update outside lineout phase.
  if (phase.kind !== "lineout") return;
  phase.elapsed += deltaSeconds;

  const hooker = state.players.find(
    (player) => player.team === phase.throwingTeam && player.role === ROLES.Hooker,
  );
  const throwingMembers =
    LINEOUT_MEMBER_VARIANTS[TEAMS[phase.throwingTeam].formations.lineoutMembers];
  const defendingMembers =
    LINEOUT_MEMBER_VARIANTS[TEAMS[otherTeam(phase.throwingTeam)].formations.lineoutMembers];

  // Check if hooker and the forwards in the two rows are in position at the mark
  const hookerTarget = hooker
    ? getLineoutTarget(
        hooker,
        phase.position,
        phase.throwingTeam,
        TEAMS[phase.throwingTeam].formations.lineoutMembers,
        TEAMS[phase.throwingTeam].formations.lineoutNonParticipants,
      )
    : null;
  const hookerReady = hooker && hookerTarget && distance(hooker.position, hookerTarget) <= 2.0;

  const lineoutForwardsReady = state.players
    .filter((player) => {
      const members =
        player.team === phase.throwingTeam ? throwingMembers : defendingMembers;
      return members.includes(player.number);
    })
    .every((player) => {
      const formation = TEAMS[player.team].formations;
      const target = getLineoutTarget(
        player,
        phase.position,
        phase.throwingTeam,
        formation.lineoutMembers,
        formation.lineoutNonParticipants,
      );
      return distance(player.position, target) <= 2.5;
    });

  // Wait for hooker and both lineout rows to form cleanly
  if (phase.stage === "forming") {
    if ((!hookerReady || !lineoutForwardsReady) && phase.elapsed < 14) return;
    phase.stage = "ready";
    phase.elapsed = 0;
    return;
  }
  // Throw lineout after brief pause once formed
  if (phase.stage === "ready") {
    // Preserve pre-throw pause so formation is clearly visible
    if (phase.elapsed < 1.0) return;
    const jumper = state.players.find(
      (player) =>
        player.team === phase.throwingTeam &&
        throwingMembers.includes(player.number) &&
        player.role === ROLES.Lock,
    ) ?? state.players.find(
      (player) =>
        player.team === phase.throwingTeam &&
        throwingMembers.includes(player.number),
    );
    // Wait when hooker or jumper is unavailable.
    if (!hooker || !jumper) return;
    hooker.stamina = clamp(hooker.stamina - 0.25, 0, 100);
    launchBall(state, hooker, jumper.position, "lineout", jumper.id);
    phase.stage = "inFlight";
    return;
  }
  // Enter open play after throw is caught or lands.
  if (state.ball.carrierId || state.ball.flight === null) {
    for (const player of state.players) player.laneX = player.position.x;
    state.phase = { kind: "openPlay" };
  }
};

// Awards try and resets phase for opposition kickoff.
export const scoreTry = (state: GameState, team: Team) => {
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
