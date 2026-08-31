import {
  attackDirection,
  type GameState,
  otherTeam,
  PITCH,
  type Player,
  type Position,
  ROLES,
  type Team,
} from "../../domain.ts";
import {
  getKickoffTarget,
  getLineoutTarget,
  getScrumTarget,
  isForward,
  LINEOUT_MEMBER_VARIANTS,
} from "../../formations/index.ts";
import { getActiveShapePositions, rollTeamFormations } from "../../teams/index.ts";
import { carryBall, launchBall, startGoalLineDropout } from "../ball.ts";
import { scoreTry } from "./conversion.ts";
import { startPenalty } from "./penalty.ts";
import { groupStrength, teamDecision } from "./utils.ts";
import {
  clamp,
  contactStrength,
  distance,
  effectiveSkill,
  GRAVITY,
  insideOwnTwentyTwo,
  overallSkill,
} from "../math.ts";
import type { Random } from "../types.ts";


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
