import {
  attackDirection,
  PITCH,
  ROLES,
  type GameState,
  type Player,
} from "../../domain.ts";
import {
  getKickoffTarget,
  getLineoutTarget,
  getRuckTarget,
  getScrumTarget,
  isForward,
} from "../../formations/index.ts";
import { clamp, distance } from "../math.ts";
import { command } from "./utils.ts";

export const getKickoffCommands = (state: GameState, players: Player[]) => {
  const phase = state.phase;
  if (phase.kind !== "kickoff" || phase.stage === "inFlight") return null;
  // Ready players hold formation so kicking side does not cross restart line before kick.
  return players.map((player) =>
    command(
      player,
      getKickoffTarget(
        player,
        phase.kickingTeam,
        phase.reason,
        state.formations[phase.kickingTeam].kickoffAttack,
        state.formations[player.team].kickoffDefence,
        state.activeShapePositions[player.team][
          player.team === phase.kickingTeam ? "kickoffAttack" : "kickoffDefence"
        ],
      ),
      `kickoff-${phase.stage}`,
      false,
      phase.stage === "ready" ? "stand" : "run",
    ),
  );
};

export const getLineoutCommands = (state: GameState, players: Player[]) => {
  const phase = state.phase;
  if (phase.kind !== "lineout" || phase.stage === "inFlight") return null;
  // Formation targets preserve Law 18 tunnel and non-participant offside distances.
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
};

export const getScrumCommands = (state: GameState, players: Player[]) => {
  const phase = state.phase;
  if (phase.kind !== "scrum") return null;
  return players.map((player) => {
    const formation = state.formations[player.team];
    const target = getScrumTarget(
      player,
      phase.position,
      phase.feedingTeam,
      formation.scrumAttack,
      formation.scrumDefence,
      state.activeShapePositions[player.team][
        player.team === phase.feedingTeam ? "scrumAttack" : "scrumDefence"
      ],
    );
    const gap = distance(player.position, target);
    const effort =
      // Set and channeling packs remain bound while contest resolves in phase logic.
      phase.stage === "set" || phase.stage === "channeling"
        ? "stand"
        : gap > 8
          ? "sprint"
          : gap > 1.5
            ? "run"
            : "stand";
    return command(player, target, `scrum-${phase.stage}`, false, effort);
  });
};

export const getMaulCommands = (state: GameState, players: Player[]) => {
  const phase = state.phase;
  if (phase.kind !== "maul") return null;
  const attackers = new Set(phase.attackers);
  const defenders = new Set(phase.defenders);
  const direction = attackDirection(phase.attackingTeam);
  return players.map((player) => {
    const group = attackers.has(player.id)
      ? phase.attackers
      : defenders.has(player.id)
        ? phase.defenders
        : null;
    if (group) {
      const rank = group.indexOf(player.id);
      const attacking = player.team === phase.attackingTeam;
      return command(
        player,
        {
          // Opposed half-metre depth keeps both bound groups around carrier without swapping sides.
          x: clamp(
            phase.position.x + (rank - (group.length - 1) / 2) * 0.7,
            -33,
            33,
          ),
          z: phase.position.z + direction * (attacking ? -0.7 : 0.7),
        },
        `maul-${phase.stage}`,
        true,
        phase.stage === "driving" ? "run" : "stand",
      );
    }
    return command(
      player,
      {
        x: player.laneX,
        z:
          phase.position.z +
          direction * (player.team === phase.attackingTeam ? -8 : 8),
      },
      "maul-shape",
      false,
      "run",
    );
  });
};

export const getConversionCommands = (state: GameState, players: Player[]) => {
  const phase = state.phase;
  if (phase.kind !== "conversion") return null;
  const teamDir = attackDirection(phase.kickingTeam);
  const defendingTryLine =
    phase.kickingTeam === 0 ? PITCH.tryLines.north : PITCH.tryLines.south;
  return players.map((player) => {
    const isKicker =
      player.team === phase.kickingTeam &&
      (player.id === phase.kickerId || player.role === ROLES.FlyHalf);
    const isCarrier = player.id === state.ball.carrierId;
    if (isKicker || isCarrier) {
      const gap = distance(player.position, phase.position);
      return command(
        player,
        phase.position,
        isCarrier ? "conversion-carrier" : "conversion-kicker",
        false,
        gap > 1.2 ? "run" : "stand",
      );
    }
    const slotIdx = player.slotIndex ?? 7;
    const slotOffset = slotIdx - 7;
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
    const target = {
      // Opponents wait behind goal line until conversion kick begins under Law 8.
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
};

export const getPenaltyCommands = (state: GameState, players: Player[]) => {
  const phase = state.phase;
  if (phase.kind !== "penalty") return null;
  const teamDir = attackDirection(phase.awardedTeam);
  const touchSide = Math.sign(phase.position.x) || 1;
  const defendingLineZ = clamp(phase.position.z + teamDir * 10, -55, 55);
  return players.map((player) => {
    const isKicker = player.id === phase.kickerId;
    if (isKicker) {
      return command(player, phase.position, "penalty-kicker", false, "run");
    }
    const slotIndex = player.slotIndex ?? 7;
    if (player.team === phase.awardedTeam) {
      const targetX =
        phase.choice === "touch"
          ? touchSide * (18 + (slotIndex % 4) * 3)
          : phase.position.x + ((slotIndex % 5) - 2) * 2.2;
      return command(
        player,
        {
          x: clamp(targetX, -30, 30),
          z: clamp(
            phase.position.z - teamDir * (2 + (slotIndex % 3) * 1.5),
            -55,
            55,
          ),
        },
        "penalty-attack",
        false,
        "run",
      );
    }
    // Law 20 requires offending side to retreat ten metres from penalty mark.
    return command(
      player,
      {
        x: clamp(phase.position.x + ((slotIndex % 5) - 2) * 5, -30, 30),
        z: clamp(defendingLineZ + teamDir * (slotIndex % 3) * 2, -55, 55),
      },
      "penalty-retreat",
      true,
      "sprint",
    );
  });
};

export const getRuckCommands = (state: GameState, players: Player[]) => {
  const phase = state.phase;
  if (phase.kind !== "ruck") return null;
  const attackers = new Set(phase.attackers);
  const defenders = new Set(phase.defenders);
  return players.map((player) => {
    // Law 14 requires tackled carrier to release or present ball immediately.
    if (player.id === phase.tackledPlayerId) {
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

    // Tackler rolls clear under Law 14, then retreats goal-side of resulting ruck offside line.
    if (player.id === phase.tacklerId) {
      const defendingSide = attackDirection(phase.attackingTeam);
      const rollLateral = player.position.x >= phase.position.x ? 2.5 : -2.5;
      const rollTarget = {
        x: clamp(phase.position.x + rollLateral, -32, 32),
        z: clamp(phase.position.z + defendingSide * 1.2, -56, 56),
      };
      return command(player, rollTarget, "tackler-roll-away", false, "run");
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
    const isAheadOfRuckOffside =
      (player.position.z - offsideZ) * direction > 0.3;
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
};
