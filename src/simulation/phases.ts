import { attackDirection, type GameState, otherTeam, PITCH, type Player, type Position, ROLES, type Team } from "../domain.ts";
import { getKickoffTarget, getLineoutTarget, getScrumTarget, isForward, LINEOUT_MEMBER_VARIANTS } from "../formations.ts";
import { rollTeamFormations, TEAMS } from "../teams.ts";
import { carryBall, launchBall, startGoalLineDropout } from "./ball.ts";
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
  // Roll dynamic tactical structures for next phase with team default preference
  state.formations[0] = rollTeamFormations(0, random);
  state.formations[1] = rollTeamFormations(1, random);
};

// Attempts nearest eligible defender's tackle against carrier, resolving tackle breaks and offloads
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

  const tacklerSkill = effectiveSkill(tackler, "tackling");
  const carrierSkill = effectiveSkill(carrier, "handling");
  const isAgileRunner =
    !isForward(carrier) ||
    carrier.role === ROLES.OpenSideFlanker ||
    carrier.role === ROLES.NumberEight;

  // 1. Offload in contact: if support runner is right behind, high handling skill allows offload before grounded
  const direction = attackDirection(carrier.team);
  const supportRunner = state.players.find(
    (p) =>
      p.team === carrier.team &&
      p.id !== carrier.id &&
      p.ruckRecoverySeconds === 0 &&
      distance(p.position, carrier.position) <= 3.5 &&
      (p.position.z - carrier.position.z) * direction <= 0.2,
  );
  if (supportRunner && random() < carrierSkill * 0.28) {
    carrier.stamina = Math.max(0, carrier.stamina - 0.5);
    tackler.tackleCooldown = 1.0;
    launchBall(
      state,
      carrier,
      supportRunner.position,
      "pass",
      supportRunner.id,
      random,
    );
    return false;
  }

  // 2. Tackle break / evasion: agile backs and loose forwards running with speed can break arm tackles
  const carrierSpeed = Math.hypot(carrier.velocity.x, carrier.velocity.z);
  const breakChance =
    (isAgileRunner ? 0.26 : 0.12) *
    Math.min(1.3, carrierSpeed / 4.2) *
    (1.15 - tacklerSkill * 0.35);

  if (random() < breakChance) {
    tackler.tackleCooldown = 1.2;
    carrier.stamina = Math.max(0, carrier.stamina - 0.8);
    return false;
  }

  // In-goal contact: never form a ruck in in-goal!
  const isAttackingInGoal =
    carrier.team === 0
      ? carrier.position.z >= PITCH.tryLines.north
      : carrier.position.z <= PITCH.tryLines.south;
  if (isAttackingInGoal) {
    scoreTry(state, carrier.team);
    return true;
  }
  const isDefendingInGoal =
    carrier.team === 0
      ? carrier.position.z <= PITCH.tryLines.south
      : carrier.position.z >= PITCH.tryLines.north;
  if (isDefendingInGoal) {
    startGoalLineDropout(state, carrier.position.z);
    return true;
  }

  // 3. Completed tackle: carrier brought down into a ruck
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

  // Place distributor right at the base of the ruck to collect ball from ground
  const teamDir = attackDirection(team);
  distributor.position.x = phase.position.x;
  distributor.position.z = clamp(
    phase.position.z - teamDir * 0.75,
    PITCH.deadBallLines.south + 1,
    PITCH.deadBallLines.north - 1,
  );

  // Start short recovery clock for everyone who committed body weight to ruck.
  for (const player of state.players) {
    if (player.ruckRecoverySeconds > 0) player.ruckRecoverySeconds = 3;
  }

  // Update attack phase count and move gainline to this ruck mark
  if (team === state.possessionTeam) {
    state.phaseCount += 1;
    state.gainLineZ = phase.position.z;
  } else {
    state.possessionTeam = team;
    state.phaseCount = 1;
    state.possessionOriginZ = phase.position.z;
    state.gainLineZ = phase.position.z;
    state.distanceGained = 0;
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
  // Launch contestable box kick downfield from distributor.
  } else if (phase.play === "boxKick") {
    distributor.stamina = clamp(distributor.stamina - 0.8, 0, 100);
    launchBall(
      state,
      distributor,
      {
        x: clamp(distributor.position.x + (random() - 0.5) * 12, -30, 30),
        z: distributor.position.z + attackDirection(team) * (28 + random() * 8),
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
  // Wait until key players reach kickoff formation or forming timeout expires
  if (phase.stage === "forming") {
    phase.readyForSeconds += deltaSeconds;
    const kicker = state.players.find(
      (player) =>
        player.team === phase.kickingTeam && player.role === ROLES.FlyHalf,
    );
    const kickerTarget = kicker
      ? getKickoffTarget(
          kicker,
          phase.kickingTeam,
          phase.reason,
          state.formations[phase.kickingTeam].kickoffAttack,
          state.formations[kicker.team].kickoffDefence,
        )
      : null;
    const kickerReady =
      kicker && kickerTarget && distance(kicker.position, kickerTarget) <= 2.2;

    const inPlaceCount = state.players.filter((player) => {
      const target = getKickoffTarget(
        player,
        phase.kickingTeam,
        phase.reason,
        state.formations[phase.kickingTeam].kickoffAttack,
        state.formations[player.team].kickoffDefence,
      );
      return distance(player.position, target) <= 2.5;
    }).length;

    // Transition to ready once kicker is set and team is largely formed, or after timeout
    if ((kickerReady && inPlaceCount >= 22) || phase.readyForSeconds >= 12) {
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
    LINEOUT_MEMBER_VARIANTS[state.formations[phase.throwingTeam].lineoutMembers];
  const defendingMembers =
    LINEOUT_MEMBER_VARIANTS[state.formations[otherTeam(phase.throwingTeam)].lineoutMembers];

  // Check if hooker and the forwards in the two rows are in position at the mark
  const hookerTarget = hooker
    ? getLineoutTarget(
        hooker,
        phase.position,
        phase.throwingTeam,
        state.formations[phase.throwingTeam].lineoutMembers,
        state.formations[phase.throwingTeam].lineoutNonParticipants,
      )
    : null;
  const hookerReady = hooker && hookerTarget && distance(hooker.position, hookerTarget) <= 2.0;

  const lineoutForwardsReady = state.players
    .filter((player) => {
      const members =
        player.team === phase.throwingTeam ? throwingMembers : defendingMembers;
      const slotNum = (player.slotIndex ?? 0) + 1;
      return members.includes(slotNum);
    })
    .every((player) => {
      const formation = state.formations[player.team];
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
        throwingMembers.includes((player.slotIndex ?? 0) + 1) &&
        player.role === ROLES.Lock,
    ) ?? state.players.find(
      (player) =>
        player.team === phase.throwingTeam &&
        throwingMembers.includes((player.slotIndex ?? 0) + 1),
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

// Awards try and transitions to visible conversion kick attempt.
export const scoreTry = (state: GameState, team: Team) => {
  state.scores[team] += 5;
  const carrier = state.players.find((p) => p.id === state.ball.carrierId);
  const teamDir = attackDirection(team);
  const tryX = clamp(carrier?.position.x ?? 0, -28, 28);
  const tryZ = team === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
  const teeSpot = { x: tryX, z: clamp(tryZ - teamDir * 22, -48, 48) };

  // Place ball on conversion kicking tee
  state.ball = {
    position: { x: teeSpot.x, y: 0.15, z: teeSpot.z },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: team,
    kickOrigin: null,
    bouncesRemaining: 0,
  };
  state.pendingClearanceKickerId = null;
  state.formations[0] = rollTeamFormations(0);
  state.formations[1] = rollTeamFormations(1);
  state.phase = {
    kind: "conversion",
    stage: "forming",
    position: teeSpot,
    kickingTeam: team,
    elapsed: 0,
    isSuccess: null,
  };
};

// Simulates conversion kick after try with visible lineup, shot, and flight
export const updateConversion = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  if (phase.kind !== "conversion") return;
  phase.elapsed += deltaSeconds;

  const kicker =
    state.players.find(
      (p) => p.team === phase.kickingTeam && p.role === ROLES.FlyHalf,
    ) ?? state.players.find((p) => p.team === phase.kickingTeam);

  // 1. Forming: kicker moves to tee, defenders behind try line, attackers in own half
  if (phase.stage === "forming") {
    const kickerInPlace =
      kicker && distance(kicker.position, phase.position) <= 2.2;
    if ((!kickerInPlace || phase.elapsed < 3.0) && phase.elapsed < 8.0) return;
    phase.stage = "ready";
    phase.elapsed = 0;
    return;
  }

  // 2. Ready: kicker pauses over tee before swinging through
  if (phase.stage === "ready") {
    if (phase.elapsed < 1.4) return;
    if (!kicker) return;
    const teamDir = attackDirection(phase.kickingTeam);
    const targetTryLine =
      phase.kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
    const anglePenalty = (Math.abs(phase.position.x) / 35) * 0.35;
    const kickSkill = effectiveSkill(kicker, "kicking");
    const successChance = clamp(
      0.9 - anglePenalty + kickSkill * 0.18,
      0.45,
      0.98,
    );
    const isSuccess = random() < successChance;

    phase.isSuccess = isSuccess;
    kicker.stamina = clamp(kicker.stamina - 0.4, 0, 100);
    launchBall(
      state,
      kicker,
      {
        x: isSuccess
          ? (random() - 0.5) * 3
          : (Math.sign(phase.position.x) || 1) * 7.5,
        z: targetTryLine + teamDir * 8,
      },
      "kick",
      null,
      random,
    );
    phase.stage = "inFlight";
    phase.elapsed = 0;
    return;
  }

  // 3. In Flight: ball soars over crossbar, points award upon passing posts
  if (phase.stage === "inFlight") {
    if (phase.isSuccess && phase.elapsed >= 1.1) {
      state.scores[phase.kickingTeam] += 2;
      phase.isSuccess = false; // Credit points once
    }
    // After kick flight completes, transition smoothly to kickoff restart
    if (state.ball.flight === null || phase.elapsed >= 2.6) {
      state.phase = {
        kind: "kickoff",
        stage: "forming",
        kickingTeam: otherTeam(phase.kickingTeam),
        readyForSeconds: 0,
        reason: "try",
      };
    }
  }
};

// Starts a penalty award for non-offending team
export const startPenalty = (
  state: GameState,
  awardedTeam: Team,
  position: Position,
) => {
  const targetTryLine =
    awardedTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
  const distToTryLine = Math.abs(targetTryLine - position.z);
  const choice =
    distToTryLine <= 38 && Math.abs(position.x) <= 22 ? "goal" : "touch";
  state.ball = {
    position: { x: position.x, y: 0.15, z: position.z },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: awardedTeam,
    kickOrigin: null,
    bouncesRemaining: 0,
  };
  state.pendingClearanceKickerId = null;
  state.possessionTeam = awardedTeam;
  state.phaseCount = 1;
  state.possessionOriginZ = position.z;
  state.gainLineZ = position.z;
  state.distanceGained = 0;
  state.phase = {
    kind: "penalty",
    stage: "decision",
    position: { ...position },
    awardedTeam,
    choice,
    elapsed: 0,
  };
};

// Executes penalty kick for touch or goal
export const updatePenalty = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  if (phase.kind !== "penalty") return;
  phase.elapsed += deltaSeconds;

  const kicker =
    state.players.find(
      (p) => p.team === phase.awardedTeam && p.role === ROLES.FlyHalf,
    ) ?? state.players.find((p) => p.team === phase.awardedTeam);

  if (phase.stage === "decision") {
    if (phase.elapsed < 1.8) return;
    phase.stage = "executing";
    phase.elapsed = 0;
    return;
  }

  if (phase.stage === "executing") {
    if (!kicker) return;
    const teamDir = attackDirection(phase.awardedTeam);
    if (phase.choice === "goal") {
      const targetTryLine =
        phase.awardedTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
      const kickSkill = effectiveSkill(kicker, "kicking");
      const anglePenalty = (Math.abs(phase.position.x) / 35) * 0.28;
      const isSuccess =
        random() < clamp(0.9 - anglePenalty + kickSkill * 0.15, 0.4, 0.96);
      if (isSuccess) {
        state.scores[phase.awardedTeam] += 3;
      }
      kicker.stamina = clamp(kicker.stamina - 0.5, 0, 100);
      launchBall(
        state,
        kicker,
        {
          x: isSuccess
            ? (random() - 0.5) * 2
            : (Math.sign(phase.position.x) || 1) * 8,
          z: targetTryLine + teamDir * 6,
        },
        "kick",
        null,
        random,
      );
      state.phase = {
        kind: "kickoff",
        stage: "forming",
        kickingTeam: otherTeam(phase.awardedTeam),
        readyForSeconds: 0,
        reason: "try",
      };
      return;
    }
    // Touch kick: find touch downfield for lineout restart
    const touchX = Math.sign(phase.position.x || 1) * PITCH.touchLines.right;
    const touchZ = clamp(
      phase.position.z + teamDir * (28 + random() * 12),
      PITCH.tryLines.south + 5,
      PITCH.tryLines.north - 5,
    );
    launchBall(
      state,
      kicker,
      { x: touchX * 1.05, z: touchZ },
      "kick",
      null,
      random,
    );
    state.phase = { kind: "openPlay" };
  }
};

// Starts a scrum restart at mark awarded to non-offending team
export const startScrum = (state: GameState, feedingTeam: Team, position: Position) => {
  // Clamp scrum mark safely inside touchlines and try lines
  const markX = clamp(position.x, -22, 22);
  const markZ = clamp(position.z, PITCH.tryLines.south + 8, PITCH.tryLines.north - 8);
  state.ball = {
    position: { x: markX, y: 0.15, z: markZ },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: otherTeam(feedingTeam),
    kickOrigin: null,
    bouncesRemaining: 0,
  };
  state.pendingClearanceKickerId = null;
  state.possessionTeam = feedingTeam;
  state.phaseCount = 1;
  state.possessionOriginZ = markZ;
  state.gainLineZ = markZ;
  state.distanceGained = 0;
  state.formations[0] = rollTeamFormations(0);
  state.formations[1] = rollTeamFormations(1);
  state.phase = {
    kind: "scrum",
    stage: "forming",
    position: { x: markX, z: markZ },
    feedingTeam,
    elapsed: 0,
    winningTeam: null,
  };
};

// Simulates scrum engagement, contest, and ball channeling to the base
export const updateScrum = (state: GameState, deltaSeconds: number, random: Random) => {
  const phase = state.phase;
  if (phase.kind !== "scrum") return;
  phase.elapsed += deltaSeconds;

  // Check if 8-man forward packs are set at the mark
  const forwardsReady = state.players
    .filter((p) => isForward(p))
    .every((p) => {
      const target = getScrumTarget(
        p,
        phase.position,
        phase.feedingTeam,
        state.formations[p.team].scrumAttack,
        state.formations[p.team].scrumDefence,
      );
      return distance(p.position, target) <= 2.0;
    });

  if (phase.stage === "forming") {
    if (!forwardsReady && phase.elapsed < 14) return;
    phase.stage = "set";
    phase.elapsed = 0;
    return;
  }

  // Packs engage! Scrum push contest determines clean heel or turnover against head
  if (phase.stage === "set") {
    if (phase.elapsed < 1.2) return;
    const feedingPackWeight = state.players
      .filter((p) => p.team === phase.feedingTeam && isForward(p))
      .reduce((sum, p) => sum + effectiveWeight(p), 0);
    const defendingPackWeight = state.players
      .filter((p) => p.team !== phase.feedingTeam && isForward(p))
      .reduce((sum, p) => sum + effectiveWeight(p), 0);

    // Feeding team has hooker feed advantage (~85% retention)
    const turnoverRoll = random();
    const turnoverThreshold = clamp(
      0.12 + (defendingPackWeight - feedingPackWeight) / 400,
      0.05,
      0.35,
    );
    phase.winningTeam =
      turnoverRoll < turnoverThreshold
        ? otherTeam(phase.feedingTeam)
        : phase.feedingTeam;
    phase.stage = "channeling";
    phase.elapsed = 0;
    return;
  }

  // Ball channels to #8 / #9 at the base, then cleanly releases into open play
  if (phase.stage === "channeling") {
    if (phase.elapsed < 1.0) return;
    const winningTeam = phase.winningTeam ?? phase.feedingTeam;
    const nine = state.players.find(
      (p) => p.team === winningTeam && p.role === ROLES.ScrumHalf,
    );
    const eight = state.players.find(
      (p) => p.team === winningTeam && p.role === ROLES.NumberEight,
    );

    // Unbind pack forwards cleanly
    for (const player of state.players) {
      if (isForward(player)) player.ruckRecoverySeconds = 1.0;
    }

    // 25% chance of #8 pick-and-go from the base, otherwise 9 passes out to first receiver (10)
    if (eight && random() < 0.25) {
      carryBall(state, eight);
    } else if (nine) {
      const ten = state.players.find(
        (p) => p.team === winningTeam && p.role === ROLES.FlyHalf,
      );
      if (ten) {
        nine.stamina = clamp(nine.stamina - 0.2, 0, 100);
        launchBall(state, nine, ten.position, "pass", ten.id, random);
      } else {
        carryBall(state, nine);
      }
    } else if (eight) {
      carryBall(state, eight);
    }
    for (const player of state.players) player.laneX = player.position.x;
    state.phase = { kind: "openPlay" };
  }
};
