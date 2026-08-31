import { attackDirection, type GameState, otherTeam, PITCH, type Player, type Position, ROLES, type Team } from "../domain.ts";
import { getKickoffTarget, getLineoutTarget, isForward } from "../formations.ts";
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

// Selects nearest forwards from one team for phase participation.
const closestForwards = (state: GameState, team: Team, position: Position, count: number) =>
  state.players
    .filter((player) => player.team === team && isForward(player))
    .sort((a, b) => distance(a.position, position) - distance(b.position, position))
    .slice(0, count)
    .map((player) => player.id);

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
    ...closestForwards(state, carrier.team, carrier.position, 3).filter(
      (id) => id !== carrier.id,
    ),
  ];
  const defenders = [
    tackler.id,
    ...closestForwards(
      state,
      otherTeam(carrier.team),
      carrier.position,
      2,
    ).filter((id) => id !== tackler.id),
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
    .filter((player) => player.team !== carrier.team && player.tackleCooldown === 0 && distance(player.position, carrier.position) <= 1.3)
    .sort((a, b) => distance(a.position, carrier.position) - distance(b.position, carrier.position))[0];
  // Abort when no defender is close and ready enough to tackle.
  if (!tackler) return false;
  tackler.tackleCooldown = 1;
  tackler.stamina = Math.max(0, tackler.stamina - 2);
  const chance = clamp(
    (0.62 + (effectiveWeight(tackler) - effectiveWeight(carrier)) / 180) *
      (0.55 + effectiveSkill(tackler, "tackling") * 0.45),
    0.25,
    0.92,
  );
  // Leave play open when tackle probability check fails.
  if (random() >= chance) return false;
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
  const nine = state.players.find((player) => player.team === team && player.role === ROLES.ScrumHalf);
  // Wait when winning team has no scrum-half.
  if (!nine) return;

  // Start short recovery clock for everyone who committed body weight to ruck.
  for (const player of state.players) {
    if (player.ruckRecoverySeconds > 0) player.ruckRecoverySeconds = 3;
  }
  // Give ball to nearest forward for pick-and-go.
  if (phase.play === "pickAndGo") {
    const runner = state.players
      .filter((player) => player.team === team && isForward(player))
      .sort((a, b) => distance(a.position, phase.position) - distance(b.position, phase.position))[0];
    // Establish possession when forward runner exists.
    if (runner) {
      runner.stamina = clamp(runner.stamina - 0.3, 0, 100);
      carryBall(state, runner);
    }
  // Launch box kick from scrum-half when selected.
  } else if (phase.play === "boxKick") {
    nine.stamina = clamp(nine.stamina - 0.8, 0, 100);
    launchBall(
      state,
      nine,
      { x: clamp(nine.position.x + (random() - 0.5) * 10, -30, 30), z: nine.position.z + attackDirection(team) * 25 },
      "kick",
      null,
      random,
    );
  // Pass to fly-half for normal or clearance release.
  } else {
    const receiver = state.players.find(
      (player) => player.team === team && player.role === (phase.play === "clearance" ? ROLES.FlyHalf : ROLES.FlyHalf),
    );
    // Pass when fly-half receiver exists.
    if (receiver) {
      nine.stamina = clamp(nine.stamina - 0.25, 0, 100);
      launchBall(state, nine, receiver.position, "pass", receiver.id, random);
      // Mark receiver to clear after clearance ruck play.
      if (phase.play === "clearance") state.pendingClearanceKickerId = receiver.id;
    // Keep ball with scrum-half when receiver is unavailable.
    } else {
      carryBall(state, nine);
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
    const attackWeight = groupWeight(state, phase.attackers);
    const defenceWeight = groupWeight(state, phase.defenders);
    phase.counterRuck = defenceWeight * (0.8 + random() * 0.4) > attackWeight * 0.7;
    phase.winningTeam = phase.counterRuck && defenceWeight * (0.85 + random() * 0.3) > attackWeight
      ? otherTeam(phase.attackingTeam)
      : phase.attackingTeam;
    // Rebuild ruck sides and play when defence wins turnover.
    if (phase.winningTeam !== phase.attackingTeam) {
      phase.attackingTeam = phase.winningTeam;
      phase.attackers = [
        phase.tacklerId,
        ...closestForwards(state, phase.attackingTeam, phase.position, 3).filter(
          (id) => id !== phase.tacklerId,
        ),
      ];
      phase.defenders = [
        phase.tackledPlayerId,
        ...closestForwards(
          state,
          otherTeam(phase.attackingTeam),
          phase.position,
          2,
        ).filter((id) => id !== phase.tackledPlayerId),
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

  // Wait for scrum-half, support, and tempo minimum during secure stage.
  if (phase.stage === "secure") {
    const nine = state.players.find((player) => player.team === phase.attackingTeam && player.role === ROLES.ScrumHalf);
    const nineReady = nine && distance(nine.position, phase.position) <= 4.5;
    const minimum = phase.tempo === "quick" ? 0.8 : 2.5;
    // Allow readiness wait to expire after hard timeout.
    if ((!nineReady || !attackersReady) && phase.elapsed < 5) return;
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
  // Wait for lineout formation or formation timeout.
  if (phase.stage === "forming") {
    const ready = state.players.every((player) =>
      distance(
        player.position,
        getLineoutTarget(
          player,
          phase.position,
          phase.throwingTeam,
          TEAMS[player.team].formations.lineoutMembers,
          TEAMS[player.team].formations.lineoutNonParticipants,
        ),
      ) <= 1.5,
    );
    // Continue forming before timeout while players remain out of place.
    if (!ready && phase.elapsed < 8) return;
    phase.stage = "ready";
    phase.elapsed = 0;
    return;
  }
  // Throw lineout after ready delay and required players exist.
  if (phase.stage === "ready") {
    // Preserve pre-throw pause.
    if (phase.elapsed < 0.75) return;
    const hooker = state.players.find((player) => player.team === phase.throwingTeam && player.role === ROLES.Hooker);
    const jumper = state.players.find((player) => player.team === phase.throwingTeam && player.role === ROLES.Lock);
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
