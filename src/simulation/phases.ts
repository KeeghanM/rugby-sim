import {
  attackDirection,
  type GameState,
  otherTeam,
  PITCH,
  type Player,
  type Position,
  ROLES,
  type Team,
} from "../domain.ts";
import {
  getKickoffTarget,
  getLineoutTarget,
  getScrumTarget,
  isForward,
  LINEOUT_MEMBER_VARIANTS,
} from "../formations.ts";
import { rollTeamFormations } from "../teams.ts";
import { carryBall, launchBall, startGoalLineDropout } from "./ball.ts";
import {
  clamp,
  contactStrength,
  distance,
  effectiveSkill,
  GRAVITY,
  insideOwnTwentyTwo,
  overallSkill,
} from "./math.ts";
import type { Random } from "./types.ts";

const MATCH_CLOCK_RATE = 6;
const GOAL_KICK_TIMEOUT_SECONDS = 30;
const goalKickTime = (kicker: Player | undefined, random: Random) =>
  20 +
  Math.floor(random() * 10) +
  Math.max(0, 0.5 - (kicker ? effectiveSkill(kicker, "kicking") : 0)) * 10;

// Selects nearest players to target a ruck.
// If ruck has <= 2 players, ANY nearby player (backs or forwards) hits it.
// If 3+ players already in ruck, only forwards will join.
const selectRuckTargeters = (
  state: GameState,
  team: Team,
  position: Position,
  targetCount: number,
  excludeIds: Set<string>,
  joinedCount: number,
) => {
  const candidates = state.players
    .filter(
      (player) =>
        player.team === team &&
        !excludeIds.has(player.id) &&
        player.role !== ROLES.ScrumHalf,
    )
    .map((player) => {
      const dist = distance(player.position, position);
      const forwardBonus = joinedCount < 3 ? 0 : isForward(player) ? 0 : 15;
      return { player, score: dist + forwardBonus, dist };
    })
    .filter(({ dist, score }) => dist <= 16 && score < 25)
    .sort((a, b) => a.score - b.score);

  return candidates.slice(0, targetCount).map(({ player }) => player.id);
};

// Chooses next ruck play from field position and team tendencies.
const chooseRuckPlay = (
  state: GameState,
  team: Team,
  position: Position,
  random: Random,
) => {
  const tendencies = state.teams[team].tendencies;
  const inOwnTwentyTwo = insideOwnTwentyTwo(team, position.z);
  const nine = state.players.find(
    (player) => player.team === team && player.role === ROLES.ScrumHalf,
  );
  const ten = state.players.find(
    (player) => player.team === team && player.role === ROLES.FlyHalf,
  );
  const decision = Math.max(
    nine ? effectiveSkill(nine, "decision") : 0,
    ten ? effectiveSkill(ten, "decision") : 0,
  );
  const boxSkill = nine ? effectiveSkill(nine, "kicking") : 0;
  const clearanceSkill = Math.max(
    boxSkill,
    ten ? effectiveSkill(ten, "kicking") : 0,
  );
  const weights = {
    pickAndGo:
      tendencies.carry * (inOwnTwentyTwo ? 0.7 + (1 - decision) * 0.6 : 0.45),
    pass: tendencies.pass * (inOwnTwentyTwo ? 0.7 + decision * 0.4 : 1),
    boxKick: tendencies.kick * (inOwnTwentyTwo ? 0.45 + boxSkill * 0.55 : 1),
    clearance: inOwnTwentyTwo
      ? tendencies.kick * (0.25 + clearanceSkill * 0.9) * (0.4 + decision * 0.6)
      : 0,
  };
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  roll -= weights.pickAndGo;
  if (roll < 0) return "pickAndGo" as const;
  roll -= weights.pass;
  if (roll < 0) return "pass" as const;
  roll -= weights.boxKick;
  if (roll < 0) return "boxKick" as const;
  if (weights.clearance > 0) return "clearance" as const;
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
  carrier.lineBreakActive = false;

  const initialJoinedAttackers = [carrier.id];
  const initialJoinedDefenders = [tackler.id];
  const joinOrder = [carrier.id, tackler.id];

  const excludeSet = new Set([carrier.id, tackler.id]);
  const attackers = [
    carrier.id,
    ...selectRuckTargeters(
      state,
      carrier.team,
      carrier.position,
      2,
      excludeSet,
      2,
    ),
  ];
  const defenders = [
    tackler.id,
    ...selectRuckTargeters(
      state,
      otherTeam(carrier.team),
      carrier.position,
      1,
      excludeSet,
      2,
    ),
  ];

  // Only tackled carrier and tackler are frozen on ground initially
  carrier.ruckRecoverySeconds = 999;
  tackler.ruckRecoverySeconds = 999;

  state.ball = {
    position: { ...carrier.position, y: 0.15 },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: carrier.team,
    passerId: null,
    kickerId: null,
    kickOrigin: null,
    bouncesRemaining: 0,
  };

  state.phase = {
    kind: "ruck",
    stage: "arrivals",
    position: { ...carrier.position },
    attackingTeam: carrier.team,
    tempo:
      random() < 0.2 + effectiveSkill(carrier, "decision") * 0.6
        ? "quick"
        : "slow",
    play: chooseRuckPlay(state, carrier.team, carrier.position, random),
    counterRuck: false,
    winningTeam: null,
    elapsed: 0,
    attackers,
    defenders,
    joinedAttackers: initialJoinedAttackers,
    joinedDefenders: initialJoinedDefenders,
    tackledPlayerId: carrier.id,
    tacklerId: tackler.id,
    joinOrder,
  };

  // Reverse phase direction only when contact reaches current touch-side limit.
  if (carrier.position.x <= -25) state.attackFlow[carrier.team] = 1;
  if (carrier.position.x >= 25) state.attackFlow[carrier.team] = -1;
  // Roll dynamic tactical structures for next phase with team default preference
  state.formations[0] = rollTeamFormations(0, random, state.teams);
  state.formations[1] = rollTeamFormations(1, random, state.teams);
};

// Attempts nearest eligible defender's tackle against carrier, resolving tackle breaks and offloads
export const attemptTackle = (state: GameState, random: Random) => {
  const carrier = state.players.find(
    (player) => player.id === state.ball.carrierId,
  );
  // Abort when no current carrier exists.
  if (!carrier) return false;
  if (carrier.breakawaySeconds > 0) return false;
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
  const carrierSkill =
    effectiveSkill(carrier, "handling") * 0.7 +
    effectiveSkill(carrier, "decision") * 0.3;

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
  if (
    supportRunner &&
    random() < carrierSkill * 0.26 * (1.15 - tacklerSkill * 0.45)
  ) {
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

  // Resolve tackle as an opposed technique, physicality, and momentum contest.
  const carrierSpeed = Math.hypot(carrier.velocity.x, carrier.velocity.z);
  const tackleChance = clamp(
    0.78 +
      (tacklerSkill - carrierSkill) * 0.65 +
      (tackler.weight - carrier.weight) * 0.0015 -
      Math.max(0, carrierSpeed - 4.5) * 0.025,
    0.2,
    0.97,
  );
  if (random() >= tackleChance) {
    tackler.tackleCooldown = 1.2;
    tackler.stats.tacklesMissed += 1;
    carrier.stamina = Math.max(0, carrier.stamina - 0.8);
    carrier.breakawaySeconds = 1.2;
    return false;
  }

  // Poor technique also increases dangerous-tackle penalties.
  if (random() < 0.002 + (1 - tacklerSkill) ** 2 * 0.045) {
    tackler.tackleCooldown = 1.0;
    startPenalty(state, carrier.team, carrier.position, tackler, random);
    return true;
  }

  // Tackle made!
  tackler.stats.tacklesMade += 1;

  // In-goal contact: never form a ruck in in-goal!
  const isAttackingInGoal =
    carrier.team === 0
      ? carrier.position.z >= PITCH.tryLines.north
      : carrier.position.z <= PITCH.tryLines.south;
  if (isAttackingInGoal) {
    scoreTry(state, carrier.team, random);
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

// Totals skill, physicality, fatigue, and technique of phase participants.
const groupStrength = (
  state: GameState,
  ids: string[],
  primary: keyof Player["skills"] = "tackling",
) =>
  ids.reduce((total, id) => {
    const player = state.players.find((candidate) => candidate.id === id);
    return total + (player ? contactStrength(player, primary) : 0);
  }, 0);

const teamDecision = (state: GameState, team: Team) => {
  const players = state.players.filter((player) => player.team === team);
  return (
    players.reduce(
      (total, player) => total + effectiveSkill(player, "decision"),
      0,
    ) / Math.max(1, players.length)
  );
};

// Releases won ruck ball through selected play.
const executeRuckPlay = (state: GameState, random: Random) => {
  const phase = state.phase;
  // Ignore execution after phase changed away from ruck.
  if (phase.kind !== "ruck") return;
  const team = phase.winningTeam ?? phase.attackingTeam;
  const isAvailable = (p: Player) =>
    !phase.joinedAttackers.includes(p.id) &&
    !phase.joinedDefenders.includes(p.id) &&
    p.id !== phase.tackledPlayerId &&
    p.id !== phase.tacklerId;

  // Find primary halfback (9), or fallback to nearest available back/player if 9 is in ruck
  const preferredHalf = state.players.find(
    (p) => p.team === team && p.role === ROLES.ScrumHalf && isAvailable(p),
  );
  const distributor =
    preferredHalf ??
    state.players
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
    phase.position.z - teamDir * 1.1,
    PITCH.deadBallLines.south + 1,
    PITCH.deadBallLines.north - 1,
  );
  distributor.velocity = { x: 0, z: 0 };

  // Staggered clean-up in game seconds ONLY for players who actually joined the ruck
  const reversedJoiners = [...phase.joinOrder].reverse();
  reversedJoiners.forEach((playerId, index) => {
    const player = state.players.find((p) => p.id === playerId);
    if (player) {
      player.ruckRecoverySeconds =
        (3 + index * 3.5) * (1.3 - overallSkill(player) * 0.55);
    }
  });

  // Free any player who targeted but never actually arrived
  for (const player of state.players) {
    if (
      !phase.joinOrder.includes(player.id) &&
      player.ruckRecoverySeconds > 100
    ) {
      player.ruckRecoverySeconds = 0;
    }
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
    if (runner) {
      runner.stamina = clamp(runner.stamina - 0.3, 0, 100);
      carryBall(state, runner);
    } else {
      carryBall(state, distributor);
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
      if (phase.play === "clearance")
        state.pendingClearanceKickerId = receiver.id;
    } else {
      carryBall(state, distributor);
    }
  }
  state.phase = { kind: "openPlay" };
};

// Advances ruck through arrivals, security, availability, and release.
export const updateRuck = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  if (phase.kind !== "ruck") return;
  phase.elapsed += deltaSeconds;

  const joinedCount =
    phase.joinedAttackers.length + phase.joinedDefenders.length;

  // 1. Process players reaching the ruck mark to join
  for (const player of state.players) {
    if (player.id === phase.tackledPlayerId || player.id === phase.tacklerId)
      continue;
    const distToRuck = distance(player.position, phase.position);

    const isAttacking = player.team === phase.attackingTeam;
    const isTargeting = isAttacking
      ? phase.attackers.includes(player.id)
      : phase.defenders.includes(player.id);
    const isAlreadyJoined = isAttacking
      ? phase.joinedAttackers.includes(player.id)
      : phase.joinedDefenders.includes(player.id);

    // Anyone close (<= 1.6m) hits the ruck if ruck has few players (< 3) or if they were targeting it
    const shouldJoin =
      !isAlreadyJoined && distToRuck <= 1.6 && (isTargeting || joinedCount < 3);

    if (shouldJoin) {
      if (isAttacking) {
        phase.joinedAttackers.push(player.id);
        if (!phase.attackers.includes(player.id))
          phase.attackers.push(player.id);
      } else {
        phase.joinedDefenders.push(player.id);
        if (!phase.defenders.includes(player.id))
          phase.defenders.push(player.id);
      }
      phase.joinOrder.push(player.id);
      player.ruckRecoverySeconds = 999;
    }
  }

  // 2. Stage arrivals: evaluate ruck contest & turnover
  if (phase.stage === "arrivals") {
    const attackersArrived = phase.joinedAttackers.filter(
      (id) => id !== phase.tackledPlayerId,
    ).length;
    const defendersArrived = phase.joinedDefenders.filter(
      (id) => id !== phase.tacklerId,
    ).length;
    const arrivalsTimeout =
      phase.elapsed >= (phase.tempo === "quick" ? 1.0 : 2.2);

    if (arrivalsTimeout || (attackersArrived >= 1 && defendersArrived >= 1)) {
      // Breakdown penalty check (holding on vs not releasing/hands in ruck)
      const attackError =
        0.01 + (1 - teamDecision(state, phase.attackingTeam)) * 0.045;
      const defenceError =
        0.01 +
        (1 - teamDecision(state, otherTeam(phase.attackingTeam))) * 0.045;
      if (random() < (attackError + defenceError) / 2) {
        const isAttackerInfraction =
          random() < attackError / (attackError + defenceError);
        if (isAttackerInfraction) {
          const carrier = state.players.find(
            (p) => p.id === phase.tackledPlayerId,
          );
          startPenalty(
            state,
            otherTeam(phase.attackingTeam),
            phase.position,
            carrier,
            random,
          );
        } else {
          const tackler = state.players.find((p) => p.id === phase.tacklerId);
          startPenalty(
            state,
            phase.attackingTeam,
            phase.position,
            tackler,
            random,
          );
        }
        return;
      }

      const jackleMultiplier =
        defendersArrived > 0 && attackersArrived === 0 ? 1.85 : 1.0;
      const originalAttackingTeam = phase.attackingTeam;
      const attackWeight = groupStrength(state, phase.joinedAttackers);
      const defenceWeight =
        groupStrength(state, phase.joinedDefenders) * jackleMultiplier;
      phase.counterRuck =
        defenceWeight * (0.8 + random() * 0.4) > attackWeight * 0.7;
      phase.winningTeam =
        phase.counterRuck &&
        defenceWeight * (0.85 + random() * 0.3) > attackWeight
          ? otherTeam(phase.attackingTeam)
          : phase.attackingTeam;

      state.teamStats[phase.winningTeam].rucksWon += 1;
      state.teamStats[otherTeam(phase.winningTeam)].rucksLost += 1;

      if (phase.winningTeam !== originalAttackingTeam) {
        phase.attackingTeam = phase.winningTeam;
        phase.play = chooseRuckPlay(
          state,
          phase.attackingTeam,
          phase.position,
          random,
        );
      }
      phase.stage = "secure";
      phase.elapsed = 0;
    }
    return;
  }

  // 3. Stage secure / available: attacking team digs ball out and executes play
  const winningTeam = phase.winningTeam ?? phase.attackingTeam;
  const isAvailable = (p: Player) =>
    !phase.joinedAttackers.includes(p.id) &&
    !phase.joinedDefenders.includes(p.id) &&
    p.id !== phase.tackledPlayerId &&
    p.id !== phase.tacklerId;

  const preferredHalf = state.players.find(
    (p) =>
      p.team === winningTeam && p.role === ROLES.ScrumHalf && isAvailable(p),
  );
  const distributor =
    preferredHalf ??
    state.players
      .filter((p) => p.team === winningTeam && isAvailable(p))
      .sort(
        (a, b) =>
          distance(a.position, phase.position) -
          distance(b.position, phase.position),
      )[0];

  if (!distributor) return;

  const teamDir = attackDirection(winningTeam);
  const ruckBasePos: Position = {
    x: clamp(phase.position.x, -32, 32),
    z: clamp(
      phase.position.z - teamDir * 1.1,
      PITCH.deadBallLines.south + 1,
      PITCH.deadBallLines.north - 1,
    ),
  };

  const distributorAtBase = distance(distributor.position, ruckBasePos) <= 1.4;

  // Extraction time calculation:
  // Base time: quick ball 0.6s, slow ball 1.6s
  // Plus extra time per player in ruck (harder to dig out with more bodies/weight)
  const totalInRuck =
    phase.joinedAttackers.length + phase.joinedDefenders.length;
  const bodyDelay = Math.max(0, totalInRuck - 2) * 0.3;
  const weightContest =
    groupStrength(state, phase.joinedDefenders) /
    Math.max(1, groupStrength(state, phase.joinedAttackers));
  const contestDelay = clamp(weightContest * 0.35, 0, 0.7);
  const skillBonus = effectiveSkill(distributor, "passing") * 0.35;
  const requiredExtractionTime = Math.max(
    0.35,
    (phase.tempo === "quick" ? 0.6 : 1.6) +
      bodyDelay +
      contestDelay -
      skillBonus,
  );

  if (phase.stage === "secure") {
    if (distributorAtBase && phase.elapsed >= requiredExtractionTime) {
      phase.stage = "available";
      phase.elapsed = 0;
    } else if (phase.elapsed >= 5.5) {
      phase.stage = "available";
      phase.elapsed = 0;
    }
    return;
  }

  if (phase.stage === "available") {
    executeRuckPlay(state, random);
  }
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
          state.teams[kicker.team].customFormations.kickoffAttack,
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
        state.teams[player.team].customFormations[
          player.team === phase.kickingTeam ? "kickoffAttack" : "kickoffDefence"
        ],
      );
      return distance(player.position, target) <= 2.5;
    }).length;

    const kickingTryLine =
      phase.kickingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north;
    const kickDir = attackDirection(phase.kickingTeam);
    const allKickingBehindTryLine = state.players
      .filter((player) => player.team === phase.kickingTeam)
      .every((player) => (player.position.z - kickingTryLine) * kickDir <= 0.2);

    const isGoalLine = phase.reason === "goalLineDropout";
    const isFormed = isGoalLine
      ? kickerReady &&
        allKickingBehindTryLine &&
        (inPlaceCount >= 22 || phase.readyForSeconds >= 8)
      : (kickerReady && inPlaceCount >= 22) || phase.readyForSeconds >= 12;

    // Transition to ready once kicker is set and team is largely formed, or after timeout
    if (isFormed || phase.readyForSeconds >= 20) {
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
    const kickingTryLine =
      phase.kickingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north;
    const kickDir = attackDirection(phase.kickingTeam);
    const allKickingBehindTryLine = state.players
      .filter((player) => player.team === phase.kickingTeam)
      .every((player) => (player.position.z - kickingTryLine) * kickDir <= 0.2);
    if (
      phase.reason === "goalLineDropout" &&
      !allKickingBehindTryLine &&
      phase.readyForSeconds < 12
    ) {
      return;
    }
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
    // Choose territory rather than person: normal kickoff lands in receiving 22.
    const targetPosition =
      phase.reason === "goalLineDropout"
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

const startMaul = (state: GameState, carrier: Player) => {
  const nearestForwards = (team: Team) =>
    state.players
      .filter(
        (player) =>
          player.team === team &&
          isForward(player) &&
          distance(player.position, carrier.position) <= 12,
      )
      .sort(
        (a, b) =>
          distance(a.position, carrier.position) -
          distance(b.position, carrier.position),
      )
      .slice(0, 5)
      .map((player) => player.id);

  const attackers = nearestForwards(carrier.team);
  if (!attackers.includes(carrier.id)) attackers.unshift(carrier.id);
  state.phase = {
    kind: "maul",
    stage: "forming",
    position: { ...carrier.position },
    attackingTeam: carrier.team,
    elapsed: 0,
    attackers,
    defenders: nearestForwards(otherTeam(carrier.team)),
    driveSpeed: 0,
    winningTeam: null,
  };
};

// Advances lineout formation, contest, throw, and maul/open-play transition.
export const updateLineout = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  // Ignore update outside lineout phase.
  if (phase.kind !== "lineout") return;
  phase.elapsed += deltaSeconds;

  const hooker = state.players.find(
    (player) =>
      player.team === phase.throwingTeam && player.role === ROLES.Hooker,
  );
  const throwingMembers =
    LINEOUT_MEMBER_VARIANTS[
      state.formations[phase.throwingTeam].lineoutMembers
    ];
  const defendingMembers =
    LINEOUT_MEMBER_VARIANTS[
      state.formations[otherTeam(phase.throwingTeam)].lineoutMembers
    ];

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
  const hookerReady =
    hooker && hookerTarget && distance(hooker.position, hookerTarget) <= 2.0;

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
    const jumper =
      state.players.find(
        (player) =>
          player.team === phase.throwingTeam &&
          throwingMembers.includes((player.slotIndex ?? 0) + 1) &&
          player.role === ROLES.Lock,
      ) ??
      state.players.find(
        (player) =>
          player.team === phase.throwingTeam &&
          throwingMembers.includes((player.slotIndex ?? 0) + 1),
      );
    const defendingJumper =
      state.players.find(
        (player) =>
          player.team !== phase.throwingTeam &&
          defendingMembers.includes((player.slotIndex ?? 0) + 1) &&
          player.role === ROLES.Lock,
      ) ??
      state.players.find(
        (player) =>
          player.team !== phase.throwingTeam &&
          defendingMembers.includes((player.slotIndex ?? 0) + 1),
      );
    // Wait when hooker or jumper is unavailable.
    if (!hooker || !jumper) return;
    const attackingScore =
      effectiveSkill(hooker, "passing") * 0.4 +
      effectiveSkill(jumper, "handling") * 0.6 +
      0.18 +
      random() * 0.3;
    const defendingScore = defendingJumper
      ? effectiveSkill(defendingJumper, "handling") * 0.55 +
        effectiveSkill(defendingJumper, "decision") * 0.45 +
        random() * 0.3
      : 0;
    const winner =
      defendingJumper && defendingScore > attackingScore
        ? defendingJumper
        : jumper;
    hooker.stamina = clamp(hooker.stamina - 0.25, 0, 100);
    launchBall(state, hooker, winner.position, "lineout", winner.id, random);
    phase.stage = "inFlight";
    return;
  }
  // Enter open play after throw is caught or lands.
  if (state.ball.carrierId || state.ball.flight === null) {
    const carrier = state.players.find(
      (player) => player.id === state.ball.carrierId,
    );
    if (carrier) {
      state.teamStats[carrier.team].lineoutsWon += 1;
      state.teamStats[otherTeam(carrier.team)].lineoutsLost += 1;
    }
    for (const player of state.players) player.laneX = player.position.x;
    if (
      carrier?.team === phase.throwingTeam &&
      random() < state.teams[phase.throwingTeam].tendencies.maul
    ) {
      startMaul(state, carrier);
      return;
    }
    state.phase = { kind: "openPlay" };
  }
};

export const updateMaul = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  if (phase.kind !== "maul") return;
  phase.elapsed += deltaSeconds;

  if (phase.stage === "forming") {
    if (phase.elapsed < 1) return;
    const attackStrength = groupStrength(state, phase.attackers, "handling");
    const defenceStrength = groupStrength(state, phase.defenders);
    const attackScore = attackStrength * (0.9 + random() * 0.2) * 1.08;
    const defenceScore = defenceStrength * (0.9 + random() * 0.2);
    phase.winningTeam =
      defenceScore > attackScore
        ? otherTeam(phase.attackingTeam)
        : phase.attackingTeam;
    phase.driveSpeed =
      phase.winningTeam === phase.attackingTeam
        ? clamp(
            0.35 + ((attackScore - defenceScore) / attackStrength) * 2.2,
            0.2,
            1.8,
          )
        : 0;
    state.teamStats[phase.winningTeam].maulsWon += 1;
    state.teamStats[otherTeam(phase.winningTeam)].maulsLost += 1;

    const losingTeam = otherTeam(phase.winningTeam);
    const collapseChance = 0.015 + (1 - teamDecision(state, losingTeam)) * 0.04;
    if (random() < collapseChance) {
      const offender = state.players.find(
        (player) =>
          player.team === losingTeam &&
          [...phase.attackers, ...phase.defenders].includes(player.id),
      );
      startPenalty(state, phase.winningTeam, phase.position, offender, random);
      return;
    }
    phase.stage = "driving";
    phase.elapsed = 0;
    return;
  }

  if (phase.stage === "driving") {
    if (phase.winningTeam === phase.attackingTeam) {
      phase.position.z = clamp(
        phase.position.z +
          attackDirection(phase.attackingTeam) *
            phase.driveSpeed *
            deltaSeconds,
        PITCH.deadBallLines.south,
        PITCH.deadBallLines.north,
      );
      const carrier = state.players.find(
        (player) => player.id === state.ball.carrierId,
      );
      if (carrier) {
        carrier.position = { ...phase.position };
        state.ball.position = { ...phase.position, y: 1.25 };
      }
      const scored =
        phase.attackingTeam === 0
          ? phase.position.z >= PITCH.tryLines.north
          : phase.position.z <= PITCH.tryLines.south;
      if (scored) {
        scoreTry(state, phase.attackingTeam, random);
        return;
      }
    }
    if (phase.elapsed < 3.5) return;
    phase.stage = "release";
    phase.elapsed = 0;
    return;
  }

  if (phase.elapsed < 0.6) return;
  const winningTeam = phase.winningTeam ?? phase.attackingTeam;
  const receiver =
    state.players.find(
      (player) =>
        player.team === winningTeam && player.role === ROLES.ScrumHalf,
    ) ??
    state.players
      .filter((player) => player.team === winningTeam)
      .sort(
        (a, b) =>
          distance(a.position, phase.position) -
          distance(b.position, phase.position),
      )[0];
  for (const id of [...phase.attackers, ...phase.defenders]) {
    const player = state.players.find((candidate) => candidate.id === id);
    if (player)
      player.ruckRecoverySeconds = 1.5 * (1.3 - overallSkill(player) * 0.55);
  }
  if (receiver) {
    receiver.position = {
      x: phase.position.x,
      z: phase.position.z - attackDirection(winningTeam) * 1.5,
    };
    carryBall(state, receiver);
  }
  state.phase = { kind: "openPlay" };
};

// Awards try and transitions to visible conversion kick attempt.
export const scoreTry = (
  state: GameState,
  team: Team,
  random: Random = Math.random,
) => {
  state.scores[team] += 5;
  const carrier = state.players.find((p) => p.id === state.ball.carrierId);
  if (carrier) {
    carrier.stats.triesScored += 1;
    carrier.lineBreakActive = false;
  }
  const teamDir = attackDirection(team);
  const tryX = clamp(carrier?.position.x ?? 0, -28, 28);
  const tryZ = team === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
  const teeSpot = { x: tryX, z: clamp(tryZ - teamDir * 22, -48, 48) };

  const kicker =
    state.players.find((p) => p.team === team && p.role === ROLES.FlyHalf) ??
    state.players.find((p) => p.team === team);

  // Ball stays with try scorer to carry back to the tee spot
  const ballCarrier = carrier ?? kicker ?? null;
  state.ball = {
    position: ballCarrier
      ? { x: ballCarrier.position.x, y: 1.25, z: ballCarrier.position.z }
      : { x: teeSpot.x, y: 0.15, z: teeSpot.z },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: ballCarrier?.id ?? null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: team,
    passerId: null,
    kickerId: kicker?.id ?? null,
    kickOrigin: null,
    bouncesRemaining: 0,
  };
  state.pendingClearanceKickerId = null;
  state.formations[0] = rollTeamFormations(0, random, state.teams);
  state.formations[1] = rollTeamFormations(1, random, state.teams);
  state.phase = {
    kind: "conversion",
    stage: "forming",
    position: teeSpot,
    kickingTeam: team,
    elapsed: 0,
    kickAtSeconds: goalKickTime(kicker, random),
    isSuccess: null,
    kickerId: kicker?.id ?? "",
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
    state.players.find((p) => p.id === phase.kickerId) ??
    state.players.find(
      (p) => p.team === phase.kickingTeam && p.role === ROLES.FlyHalf,
    ) ??
    state.players.find((p) => p.team === phase.kickingTeam);

  // While ball is being carried to tee, place on ground when carrier reaches tee spot
  if (state.ball.carrierId) {
    const carrier = state.players.find((p) => p.id === state.ball.carrierId);
    if (carrier && distance(carrier.position, phase.position) <= 1.5) {
      state.ball.carrierId = null;
      state.ball.position = {
        x: phase.position.x,
        y: 0.15,
        z: phase.position.z,
      };
    }
  }

  // 1. Forming: kicker moves to tee, defenders behind try line, attackers in own half
  if (phase.stage === "forming") {
    const kickerInPlace =
      kicker && distance(kicker.position, phase.position) <= 2.2;
    const teamDir = attackDirection(phase.kickingTeam);
    const defendingTryLine =
      phase.kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
    const defendersBehindGoalLine = state.players
      .filter((p) => p.team !== phase.kickingTeam)
      .every((p) => (p.position.z - defendingTryLine) * teamDir >= -0.2);
    const attackersInPlace = state.players
      .filter((p) => p.team === phase.kickingTeam && p.id !== kicker?.id)
      .every(
        (p) =>
          p.position.z * teamDir <= 6.0 ||
          distance(p.position, p.intentTarget) <= 4.0,
      );

    const ballAtTee = state.ball.carrierId === null;
    const isFormed =
      ballAtTee &&
      kickerInPlace &&
      defendersBehindGoalLine &&
      (attackersInPlace || phase.elapsed >= 6.0);

    if (!isFormed && phase.elapsed < 20.0) return;
    if (state.ball.carrierId) {
      state.ball.carrierId = null;
      state.ball.position = {
        x: phase.position.x,
        y: 0.15,
        z: phase.position.z,
      };
    }
    phase.stage = "ready";
    phase.elapsed = 0;
    return;
  }

  // 2. Ready: kicker pauses over tee before swinging through
  if (phase.stage === "ready") {
    const shotClockSeconds = phase.elapsed * MATCH_CLOCK_RATE;
    const timedOut = shotClockSeconds >= GOAL_KICK_TIMEOUT_SECONDS;
    if (
      shotClockSeconds <
      Math.min(phase.kickAtSeconds, GOAL_KICK_TIMEOUT_SECONDS)
    )
      return;
    if (!kicker) return;
    const teamDir = attackDirection(phase.kickingTeam);
    const targetTryLine =
      phase.kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
    const anglePenalty = (Math.abs(phase.position.x) / 35) * 0.35;
    const kickSkill = effectiveSkill(kicker, "kicking");
    const successChance = clamp(
      0.3 + kickSkill * 0.68 - anglePenalty,
      0.15,
      0.96,
    );
    const isSuccess = !timedOut && random() < successChance;

    phase.isSuccess = isSuccess;
    kicker.stamina = clamp(kicker.stamina - 0.4, 0, 100);
    kicker.stats.totalKicks += 1;

    const distToPosts = Math.abs(targetTryLine - phase.position.z);
    const duration = Math.max(1.4, distToPosts / 18);
    const targetX = isSuccess
      ? (random() - 0.5) * 2.6
      : (Math.sign(phase.position.x) || 1) * (5.5 + random() * 4);
    const targetZ = targetTryLine + teamDir * 8;
    const peakHeight = isSuccess ? 6.5 + random() * 2 : 2.2 + random() * 2;

    state.ball = {
      position: { x: phase.position.x, y: 0.2, z: phase.position.z },
      velocity: {
        x: (targetX - phase.position.x) / duration,
        y: (GRAVITY * duration) / 2 + peakHeight / duration,
        z: (targetZ - phase.position.z) / duration,
      },
      carrierId: null,
      flight: "kick",
      intendedReceiverId: null,
      lastTouchedTeam: phase.kickingTeam,
      passerId: null,
      kickerId: kicker.id,
      kickOrigin: { ...phase.position },
      bouncesRemaining: 1,
    };

    phase.stage = "inFlight";
    phase.elapsed = 0;
    return;
  }

  // 3. In Flight: ball soars over crossbar, points award upon passing posts
  if (phase.stage === "inFlight") {
    const teamDir = attackDirection(phase.kickingTeam);
    const targetTryLine =
      phase.kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
    const hasReachedPosts =
      (state.ball.position.z - targetTryLine) * teamDir >= 0;

    if (phase.isSuccess && hasReachedPosts) {
      state.scores[phase.kickingTeam] += 2;
      if (kicker) kicker.stats.successfulKicks += 1;
      phase.isSuccess = false; // Credit points once
    }

    // After kick flight completes, transition smoothly to kickoff restart
    if (
      (state.ball.flight === null && phase.elapsed >= 1.5) ||
      phase.elapsed >= 3.2
    ) {
      state.ball.flight = null;
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
  offender?: Player,
  random: Random = Math.random,
) => {
  if (offender) {
    offender.stats.penaltiesConceded += 1;
  }
  const kicker =
    state.players.find(
      (p) => p.team === awardedTeam && p.role === ROLES.FlyHalf,
    ) ?? state.players.find((p) => p.team === awardedTeam);
  const targetTryLine =
    awardedTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
  const distToTryLine = Math.abs(targetTryLine - position.z);
  const kicking = kicker ? effectiveSkill(kicker, "kicking") : 0;
  const decision = kicker ? effectiveSkill(kicker, "decision") : 0;
  const goalRange = 18 + kicking * 22 + decision * 5;
  const choice =
    distToTryLine <= goalRange && Math.abs(position.x) <= 12 + kicking * 14
      ? "goal"
      : "touch";

  state.ball = {
    position: { x: position.x, y: 0.15, z: position.z },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: awardedTeam,
    passerId: null,
    kickerId: kicker?.id ?? null,
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
    kickAtSeconds: goalKickTime(kicker, random),
    kickerId: kicker?.id,
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
    state.players.find((p) => p.id === phase.kickerId) ??
    state.players.find(
      (p) => p.team === phase.awardedTeam && p.role === ROLES.FlyHalf,
    ) ??
    state.players.find((p) => p.team === phase.awardedTeam);

  if (phase.stage === "decision") {
    if (phase.elapsed < 1.5) return;
    phase.stage = "executing";
    return;
  }

  if (phase.stage === "executing") {
    if (!kicker) return;
    const teamDir = attackDirection(phase.awardedTeam);
    if (phase.choice === "goal") {
      const shotClockSeconds = phase.elapsed * MATCH_CLOCK_RATE;
      const timedOut = shotClockSeconds >= GOAL_KICK_TIMEOUT_SECONDS;
      if (
        shotClockSeconds <
        Math.min(phase.kickAtSeconds, GOAL_KICK_TIMEOUT_SECONDS)
      )
        return;
      const targetTryLine =
        phase.awardedTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
      const kickSkill = effectiveSkill(kicker, "kicking");
      const anglePenalty = (Math.abs(phase.position.x) / 35) * 0.28;
      const distToPosts = Math.abs(targetTryLine - phase.position.z);
      const distancePenalty = Math.max(0, distToPosts - 22) * 0.008;
      const isSuccess =
        !timedOut &&
        random() <
          clamp(
            0.18 + kickSkill * 0.78 - anglePenalty - distancePenalty,
            0.08,
            0.94,
          );

      phase.isSuccess = isSuccess;
      kicker.stamina = clamp(kicker.stamina - 0.5, 0, 100);
      kicker.stats.totalKicks += 1;

      const duration = Math.max(1.4, distToPosts / 18);
      const targetX = isSuccess
        ? (random() - 0.5) * 2.5
        : (Math.sign(phase.position.x) || 1) * (6 + random() * 4);
      const targetZ = targetTryLine + teamDir * 8;
      const peakHeight = isSuccess ? 6.0 + random() * 2 : 2.0;

      state.ball = {
        position: { x: phase.position.x, y: 0.2, z: phase.position.z },
        velocity: {
          x: (targetX - phase.position.x) / duration,
          y: (GRAVITY * duration) / 2 + peakHeight / duration,
          z: (targetZ - phase.position.z) / duration,
        },
        carrierId: null,
        flight: "kick",
        intendedReceiverId: null,
        lastTouchedTeam: phase.awardedTeam,
        passerId: null,
        kickerId: kicker.id,
        kickOrigin: { ...phase.position },
        bouncesRemaining: 1,
      };

      phase.stage = "inFlight";
      phase.elapsed = 0;
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
    state.pendingLineoutTeam = phase.awardedTeam;
    state.phase = { kind: "openPlay" };
    return;
  }

  if (phase.stage === "inFlight") {
    const teamDir = attackDirection(phase.awardedTeam);
    const targetTryLine =
      phase.awardedTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
    const hasReachedPosts =
      (state.ball.position.z - targetTryLine) * teamDir >= 0;

    if (phase.isSuccess && hasReachedPosts) {
      state.scores[phase.awardedTeam] += 3;
      if (kicker) kicker.stats.successfulKicks += 1;
      phase.isSuccess = false;
    }

    if (
      (state.ball.flight === null && phase.elapsed >= 1.5) ||
      phase.elapsed >= 3.2
    ) {
      state.ball.flight = null;
      state.phase = {
        kind: "kickoff",
        stage: "forming",
        kickingTeam: otherTeam(phase.awardedTeam),
        readyForSeconds: 0,
        reason: "try",
      };
    }
  }
};

// Starts a scrum restart at mark awarded to non-offending team
export const startScrum = (
  state: GameState,
  feedingTeam: Team,
  position: Position,
  random: Random = Math.random,
) => {
  // Clamp scrum mark safely inside touchlines and try lines
  const markX = clamp(position.x, -22, 22);
  const markZ = clamp(
    position.z,
    PITCH.tryLines.south + 8,
    PITCH.tryLines.north - 8,
  );
  state.ball = {
    position: { x: markX, y: 0.15, z: markZ },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: otherTeam(feedingTeam),
    passerId: null,
    kickerId: null,
    kickOrigin: null,
    bouncesRemaining: 0,
  };
  state.pendingClearanceKickerId = null;
  state.possessionTeam = feedingTeam;
  state.phaseCount = 1;
  state.possessionOriginZ = markZ;
  state.gainLineZ = markZ;
  state.distanceGained = 0;
  state.formations[0] = rollTeamFormations(0, random, state.teams);
  state.formations[1] = rollTeamFormations(1, random, state.teams);
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
export const updateScrum = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
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
        state.teams[p.team].customFormations[
          p.team === phase.feedingTeam ? "scrumAttack" : "scrumDefence"
        ],
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
    const feedingPackStrength = state.players
      .filter((p) => p.team === phase.feedingTeam && isForward(p))
      .reduce((sum, p) => sum + contactStrength(p), 0);
    const defendingPackStrength = state.players
      .filter((p) => p.team !== phase.feedingTeam && isForward(p))
      .reduce((sum, p) => sum + contactStrength(p), 0);

    const averageStrength = (feedingPackStrength + defendingPackStrength) / 2;
    const strengthDifference =
      (defendingPackStrength - feedingPackStrength) /
      Math.max(1, averageStrength);
    // Feed remains an advantage, but pack technique and fatigue can overcome mass.
    const turnoverRoll = random();
    const turnoverThreshold = clamp(
      0.12 + strengthDifference * 0.48,
      0.03,
      0.45,
    );
    phase.winningTeam =
      turnoverRoll < turnoverThreshold
        ? otherTeam(phase.feedingTeam)
        : phase.feedingTeam;
    state.teamStats[phase.winningTeam].scrumsWon += 1;
    state.teamStats[otherTeam(phase.winningTeam)].scrumsLost += 1;
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
      if (isForward(player)) {
        player.ruckRecoverySeconds = 1.2 * (1.3 - overallSkill(player) * 0.55);
      }
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
