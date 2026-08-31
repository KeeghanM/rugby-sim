import { attackDirection, type GameState, PITCH, type Player, type Position, ROLES } from "../domain.ts";
import {
  getKickoffTarget,
  getLineoutTarget,
  getOpenPlayTarget,
  getRuckTarget,
  getScrumTarget,
  isForward,
} from "../formations.ts";
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

// Reports whether carrier has passed every defender in their running corridor.
const hasBrokenLine = (players: Player[], carrier: Player) => {
  const direction = attackDirection(carrier.team);
  return !players.some(
    (player) =>
      player.team !== carrier.team &&
      player.role !== ROLES.FullBack &&
      Math.abs(player.position.x - carrier.position.x) < 14 &&
      (player.position.z - carrier.position.z) * direction > 0 &&
      distance(player.position, carrier.position) < 35,
  );
};

// Chooses three role-appropriate runners behind carrier to preserve live support.
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
        player.ruckRecoverySeconds === 0 &&
        (lineBroken || player.role !== ROLES.FullBack), // Fullback holds sweeping depth unless open line break
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
          (lineBroken ? -player.speed * 4 : preferred ? 0 : 20) +
          Math.max(
            0,
            (player.position.z - carrier.position.z) * direction,
          ) *
            1.5 +
          distance(player.position, carrier.position),
      };
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map(({ player }) => player.id);
};

// Selects best legal support runner for a pass.
const choosePassTarget = (
  players: Player[],
  carrier: Player,
  preferredRoles?: ReadonlySet<Player["role"]>,
  flowDirection?: -1 | 1,
) =>
  players
    .filter(
      (player) =>
        player.team === carrier.team &&
        player.id !== carrier.id &&
        player.ruckRecoverySeconds === 0 &&
        (!preferredRoles || preferredRoles.has(player.role)) &&
        (!flowDirection ||
          (player.position.x - carrier.position.x) * flowDirection >= 2) &&
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
      lateralGap: Math.abs(player.position.x - carrier.position.x),
      depth: Math.abs((player.position.z - carrier.position.z) * attackDirection(carrier.team)),
    }))
    .sort(
      (a, b) =>
        a.depth - b.depth ||
        a.lateralGap - b.lateralGap ||
        b.space - a.space ||
        a.gap - b.gap,
    )[0]
    ?.player;

// Chooses a touch-finding clearance target downfield ensuring touchline is crossed safely before dead-ball line.
const clearanceTarget = (player: Player, random: Random): Position => {
  const direction = attackDirection(player.team);
  const isBackThreeOrTen =
    player.role === ROLES.FullBack ||
    player.role === ROLES.FlyHalf ||
    player.role === ROLES.Wing;
  const kickSkill = effectiveSkill(player, "kicking");

  // In rugby, clearance kicks aim to cross the touchline safely within the field of play (well before dead-ball line)
  const targetTryLine =
    direction === 1 ? PITCH.tryLines.north : PITCH.tryLines.south;
  const maxSafeDistance = Math.max(
    14,
    Math.abs(targetTryLine - player.position.z) - 8,
  );

  const desiredDistance = isBackThreeOrTen
    ? Math.min(maxSafeDistance, 36 + kickSkill * 18 + (random() - 0.5) * 8)
    : Math.min(maxSafeDistance, 24 + kickSkill * 10 + (random() - 0.5) * 6);

  // Rare severe overcooked miskick only possible on low kicking skill
  const isMiskickOvercooked = random() < (1 - kickSkill) * 0.04;
  const finalDistance = isMiskickOvercooked
    ? desiredDistance + 24
    : desiredDistance;

  const side =
    Math.abs(player.position.x) > 6
      ? Math.sign(player.position.x)
      : random() < 0.5
        ? -1
        : 1;
  return {
    x: side * (PITCH.touchLines.right + 6),
    z: clamp(
      player.position.z + direction * finalDistance,
      PITCH.tryLines.south - 5,
      PITCH.tryLines.north + 5,
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
  // Advance carrier smoothly while committed pass or kick preparation completes.
  if (carrier.pendingBallAction) {
    const isKick = carrier.pendingBallAction.kind === "kick";
    return command(
      carrier,
      isKick
        ? carrier.position
        : { x: carrier.position.x, z: carrier.position.z + direction * 4 },
      `prepare-${carrier.pendingBallAction.kind}`,
      false,
      isKick ? "stand" : "jog",
    );
  }
  const lineBroken = hasBrokenLine(players, carrier);
  const flowDirection = carrier.position.x <= -25
    ? 1
    : carrier.position.x >= 25
      ? -1
      : state.attackFlow[carrier.team];
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
  const isFullbackReturn = carrier.role === ROLES.FullBack && insideOwnTwentyTwo(carrier.team, carrier.position.z);
  const nearbyTeammates = players.filter(
    (p) =>
      p.team === carrier.team &&
      p.id !== carrier.id &&
      distance(p.position, carrier.position) <= 15,
  );
  const isStranded = nearbyTeammates.length === 0 && defendersAhead.length > 0;
  const recognisesClearance =
    random() >= (1 - effectiveSkill(carrier, "decision")) * 0.18;
  const canKick =
    carrier.role === ROLES.ScrumHalf ||
    carrier.role === ROLES.FlyHalf ||
    carrier.role === ROLES.FullBack ||
    carrier.role === ROLES.Wing;
  // Stranded players or kick returns under chase execute clearance kicks immediately
  if ((forcedClearance || trapped || isFullbackReturn || isStranded) && canKick && recognisesClearance) {
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
  }

  // Keep carrying when no nearby defender forces a choice.
  if (defendersAhead.length === 0) return result;
  const isTightFive =
    carrier.role === ROLES.LooseHead ||
    carrier.role === ROLES.Hooker ||
    carrier.role === ROLES.TightHead ||
    carrier.role === ROLES.Lock;
  const isBackRow =
    carrier.role === ROLES.BlindSideFlanker ||
    carrier.role === ROLES.OpenSideFlanker ||
    carrier.role === ROLES.NumberEight;
  const isHalf = carrier.role === ROLES.ScrumHalf || carrier.role === ROLES.FlyHalf;
  const isCentre = carrier.role === ROLES.InsideCentre || carrier.role === ROLES.OutsideCentre;

  // Forwards (1-5) almost never kick (0%), back-row (6-8) rarely (0% open play)
  const weights = isTightFive
    ? [0.86, 0.08, 0.06]
    : isBackRow
      ? [0.76, 0.12, 0.12]
      : isHalf
        ? [0.22, 0.54, 0.14]
        : isCentre
          ? [0.44, 0.38, 0.16]
          : [0.36, 0.18, 0.38];
  const kickWeight = isTightFive || isBackRow ? 0 : isHalf ? 0.1 : isCentre ? 0.02 : 0.08;
  const tendencies = TEAMS[carrier.team].tendencies;
  const weighted = [
    weights[0] * tendencies.carry,
    weights[1] * tendencies.pass,
    weights[2] * tendencies.carry,
    kickWeight * tendencies.kick,
  ];
  const totalWeight = weighted.reduce((total, weight) => total + weight, 0);
  for (let index = 0; index < weighted.length; index += 1) weighted[index] /= totalWeight;
  const decisionSkill = effectiveSkill(carrier, "decision");
  const isErratic = random() < (1 - decisionSkill) * 0.22;
  const roll = random();
  const passTarget = choosePassTarget(
    players,
    carrier,
    undefined,
    isErratic ? undefined : flowDirection,
  );
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
  if (canKick) {
    // If inside own 22 or deep fielding, kick for touch clearance
    if (
      insideOwnTwentyTwo(carrier.team, carrier.position.z) ||
      carrier.role === ROLES.FullBack
    ) {
      result.ballAction = {
        kind: "kick",
        target: clearanceTarget(carrier, random),
        flight: "kick",
      };
    } else {
      // In midfield / attacking territory: 55% Grubber along turf, 45% Chip into space
      const isGrubber = random() < 0.55;
      const kickDistance = isGrubber ? 14 + random() * 8 : 18 + random() * 8;
      const targetZ = clamp(
        carrier.position.z + direction * kickDistance,
        PITCH.tryLines.south + 2,
        PITCH.tryLines.north - 2,
      );
      const targetX = clamp(
        carrier.position.x + (random() - 0.5) * 4,
        -30,
        30,
      );
      result.ballAction = {
        kind: "kick",
        target: { x: targetX, z: targetZ },
        flight: isGrubber ? "grubber" : "kick",
      };
    }
  } else {
    result.target = {
      x:
        carrier.position.x +
        (defendersAhead[0]?.position.x >= carrier.position.x ? -6 : 6),
      z: carrier.position.z + direction * 10,
    };
  }
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
  const isKickoff = state.ball.flight === "kickoff";
  const contestableKick =
    state.ball.flight === "kick" ||
    state.ball.flight === "kickoff" ||
    state.ball.flight === "rolling";

  // On kickoff, entire kicking team (except fullback and one covering centre) charges in line
  const eligibleChasers = new Set(
    players
      .filter((player) => {
        if (!contestableKick || player.team !== kickingTeam || player.kickOffside) return false;
        if (isKickoff) {
          return (
            player.role !== ROLES.FullBack &&
            player.role !== ROLES.InsideCentre
          );
        }
        return true;
      })
      .sort((a, b) => distance(a.position, landing) - distance(b.position, landing))
      .slice(0, isKickoff ? 13 : 4)
      .map((player) => player.id),
  );

  const receivingCatchers = new Set(
    players
      .filter(
        (player) => contestableKick && player.team !== kickingTeam,
      )
      .map((player) => {
        const dist = distance(player.position, landing);
        // Forwards and centres are primary kickoff catchers; fullbacks prefer deep coverage unless closest
        const priorityRole =
          isForward(player) ||
          player.role === ROLES.InsideCentre ||
          player.role === ROLES.OutsideCentre;
        const roleScore = isKickoff && !priorityRole ? 8 : 0;
        return { player, score: dist + roleScore };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(({ player }) => player.id),
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
    // Send kicking-team chase line across width toward landing zone.
    if (eligibleChasers.has(player.id)) {
      const chaseTarget = isKickoff
        ? { x: player.laneX, z: landing.z }
        : landing;
      return command(player, chaseTarget, "kick-chase", false, "sprint");
    }
    // Send nearest receiving-team players toward territorial kick landing point.
    if (receivingCatchers.has(player.id)) {
      return command(player, landing, "kick-receive", false, "sprint");
    }
    // Defending/receiving fullback sweeps deep behind landing zone.
    if (player.team !== kickingTeam && player.role === ROLES.FullBack) {
      const receiveDir = attackDirection(player.team);
      const sweepTarget = {
        x: clamp(landing.x * 0.6, -25, 25),
        z: clamp(landing.z - receiveDir * 8, PITCH.tryLines.south, PITCH.tryLines.north),
      };
      return command(player, sweepTarget, "kick-sweep", false, "run");
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

  // Full-time: whistle blown, match ended, all players stand
  if (state.half === "fullTime") {
    return players.map((player) =>
      command(player, player.position, "full-time", true, "stand"),
    );
  }

  const phase = state.phase;

  // Hold kickoff formation until ball enters flight.
  if (phase.kind === "kickoff" && phase.stage !== "inFlight") {
    return players.map((player) =>
      command(
        player,
        getKickoffTarget(
          player,
          phase.kickingTeam,
          phase.reason,
          state.formations[phase.kickingTeam].kickoffAttack,
          state.formations[player.team].kickoffDefence,
        ),
        `kickoff-${phase.stage}`,
        false,
        phase.stage === "ready" ? "stand" : "run",
      ),
    );
  }
  // Hold lineout formation until throw enters flight.
  if (phase.kind === "lineout" && phase.stage !== "inFlight") {
    return players.map((player) => {
      const formation = state.formations[player.team];
      const target = getLineoutTarget(
        player,
        phase.position,
        phase.throwingTeam,
        formation.lineoutMembers,
        formation.lineoutNonParticipants,
      );
      const gap = distance(player.position, target);
      return command(
        player,
        target,
        `lineout-${phase.stage}`,
        false,
        gap > 8 ? "sprint" : gap > 1.5 ? "run" : "stand",
      );
    });
  }
  // Hold scrum 3-4-1 pack and backline shapes during scrum phase
  if (phase.kind === "scrum") {
    return players.map((player) => {
      const formation = state.formations[player.team];
      const target = getScrumTarget(
        player,
        phase.position,
        phase.feedingTeam,
        formation.scrumAttack,
        formation.scrumDefence,
      );
      const gap = distance(player.position, target);
      const isPackForward = isForward(player);
      const effort =
        phase.stage === "set" || phase.stage === "channeling"
          ? isPackForward
            ? "stand"
            : "stand"
          : gap > 8
            ? "sprint"
            : gap > 1.5
              ? "run"
              : "stand";
      return command(player, target, `scrum-${phase.stage}`, false, effort);
    });
  }
  // Conversion kick setup: kicker at tee spot, attackers in own half, defenders behind try line in-goal
  if (phase.kind === "conversion") {
    const teamDir = attackDirection(phase.kickingTeam);
    const defendingTryLine =
      phase.kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
    return players.map((player) => {
      const isKicker =
        player.team === phase.kickingTeam && player.role === ROLES.FlyHalf;
      // Kicker lines up at the kicking tee spot
      if (isKicker) {
        const gap = distance(player.position, phase.position);
        return command(
          player,
          phase.position,
          "conversion-kicker",
          false,
          gap > 1.5 ? "run" : "stand",
        );
      }
      const slotIdx = player.slotIndex ?? 7;
      const slotOffset = slotIdx - 7;
      // Scoring teammates jog back to their own half behind halfway
      if (player.team === phase.kickingTeam) {
        const ownHalfZ = -teamDir * (8 + (slotIdx % 3) * 2.5);
        const target = {
          x: slotOffset * 3.5,
          z: clamp(ownHalfZ, -55, 55),
        };
        const gap = distance(player.position, target);
        return command(
          player,
          target,
          "conversion-support",
          false,
          gap > 2 ? "run" : "stand",
        );
      }
      // Defending team stands in-goal behind their own try line
      const target = {
        x: slotOffset * 4,
        z: clamp(defendingTryLine + teamDir * 2.5, -58, 58),
      };
      const gap = distance(player.position, target);
      return command(
        player,
        target,
        "conversion-defence",
        false,
        gap > 2 ? "run" : "stand",
      );
    });
  }
  // Penalty kick setup: awarded team lines up, defending team retreats 10m
  if (phase.kind === "penalty") {
    const teamDir = attackDirection(phase.awardedTeam);
    return players.map((player) => {
      const isKicker =
        player.team === phase.awardedTeam && player.role === ROLES.FlyHalf;
      if (isKicker) {
        return command(player, phase.position, "penalty-kicker", false, "run");
      }
      const slotOffset = (player.slotIndex ?? 7) - 7;
      if (player.team === phase.awardedTeam) {
        return command(
          player,
          {
            x: slotOffset * 4,
            z: clamp(phase.position.z - teamDir * 5, -55, 55),
          },
          "penalty-attack",
          false,
          "run",
        );
      }
      return command(
        player,
        {
          x: slotOffset * 4.5,
          z: clamp(phase.position.z + teamDir * 10, -55, 55),
        },
        "penalty-retreat",
        true,
        "sprint",
      );
    });
  }
  // Position ruck participants and surrounding attacking shape.
  if (phase.kind === "ruck") {
    const attackers = new Set(phase.attackers);
    const defenders = new Set(phase.defenders);
    return players.map((player) => {
      // Freeze tackled carrier and tackler exactly where contact ended.
      if (
        player.id === phase.tackledPlayerId ||
        player.id === phase.tacklerId
      ) {
        const frozen = command(
          player,
          player.position,
          "ruck-contact-frozen",
          true,
          "stand",
        );
        frozen.freeze = true;
        return frozen;
      }
      const joinsRuck = attackers.has(player.id) || defenders.has(player.id);
      const target = getRuckTarget(
        player,
        phase.position,
        phase.attackingTeam,
        attackers,
        defenders,
      );
      const direction = attackDirection(player.team);
      const offsideZ =
        player.team === phase.attackingTeam
          ? phase.position.z - direction * 0.5
          : phase.position.z + direction * 0.5;
      const isAheadOfRuckOffside = (player.position.z - offsideZ) * direction > 0.3;

      // At a ruck, non-participants ahead of the offside line MUST sprint back immediately
      const effort = joinsRuck
        ? "run"
        : isAheadOfRuckOffside
          ? "sprint"
          : distance(player.position, target) > 3
            ? "run"
            : "stand";

      return command(
        player,
        target,
        `ruck-${phase.stage}-${joinsRuck ? "join" : player.pod}`,
        isAheadOfRuckOffside,
        effort,
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
    const target = getOpenPlayTarget(
      player,
      carrier,
      attacking ? undefined : state.defensiveLineZ[player.team],
      state.formations[player.team].openAttack,
      state.formations[player.team].openDefence,
    );
    const direction = attackDirection(player.team);
    // Keep former ruck participants bound to contact area until recovery expires.
    if (player.ruckRecoverySeconds > 0) {
      return command(
        player,
        player.position,
        "ruck-recovery",
        true,
        "stand",
      );
    }
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
        lineBroken || distance(player.position, carrier.position) > 8
          ? "sprint"
          : "run",
      );
    }
    const aheadDistance = (player.position.z - carrier.position.z) * direction;
    const isAheadOfBall = attacking && player.hardLineForSeconds === 0 && aheadDistance >= 0;
    if (isAheadOfBall) {
      const lateralDist = Math.abs(player.position.x - carrier.position.x);
      const isCarrierRunningForward = carrier.velocity.z * direction > 0.8;

      // Zero speed ONLY if carrier is actively running forward to catch up; otherwise slow jog back
      if (aheadDistance <= 3.5 && isCarrierRunningForward) {
        return command(
          player,
          { x: player.laneX, z: player.position.z },
          "await-carrier",
          false,
          "stand",
        );
      }
      // If farther ahead or carrier is stopped/delayed, actively retreat back toward onside line
      const clearX =
        lateralDist < 8
          ? clamp(
              player.position.x +
                (player.position.x >= carrier.position.x ? 6 : -6),
              -32,
              32,
            )
          : player.laneX;
      const targetZ = carrier.position.z - direction * 2.0;

      // Speed graduated with distance and width (at least a slow jog):
      const effort =
        lateralDist > 16
          ? aheadDistance > 18
            ? "run"
            : "jog"
          : aheadDistance > 14
            ? "sprint"
            : aheadDistance > 6
              ? "run"
              : "jog";

      return command(
        player,
        { x: clearX, z: targetZ },
        "offside-recovery",
        false,
        effort,
      );
    }
    // Any defender in range (or the designated sweeper/lead tackler) closes down and tackles carrier aggressively
    const distToCarrier = distance(player.position, carrier.position);
    const inTackleZone = !attacking && (player.id === tacklerId || distToCarrier <= 7);
    if (inTackleZone && distToCarrier < (lineBroken ? 40 : 14)) {
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
    const formationGap = distance(player.position, target);
    return command(
      player,
      target,
      attacking ? `attack-${player.pod}` : "defence-line",
      false,
      attacking
        ? formationGap > 12
          ? "sprint"
          : formationGap > 2
            ? "run"
            : "jog"
        : "run",
    );
  });
};
