import {
  attackDirection,
  PITCH,
  ROLES,
  type Player,
  type Position,
  type Team,
} from "../domain.ts";
import { ATTACK_FORMATION, LINEOUT_MEMBER_VARIANTS } from "./constants.ts";
import type { LineoutMembers, LineoutNonParticipants } from "./types.ts";
import { clampX, clampZ, getSlotIndex } from "./utils.ts";

export const getLineoutTarget = (
  player: Player,
  mark: Position,
  throwingTeam: Team,
  memberCount: LineoutMembers,
  nonParticipants: LineoutNonParticipants,
): Position => {
  const slotIdx = getSlotIndex(player);
  const touchSide = mark.x < 0 ? -1 : 1;
  const throwing = player.team === throwingTeam;
  const teamDir = attackDirection(throwingTeam);
  if (throwing && player.role === ROLES.Hooker) {
    // Law 18 places thrower outside field at touch mark.
    return { x: touchSide * PITCH.touchLines.right, z: mark.z };
  }
  if (!throwing && player.role === ROLES.Hooker) {
    return {
      x: touchSide * (PITCH.touchLines.right - 2),
      z: clampZ(mark.z + teamDir * 2),
    };
  }

  const members = LINEOUT_MEMBER_VARIANTS[memberCount];
  const slotNumber = slotIdx + 1;
  if (members.includes(slotNumber)) {
    const rank = members.indexOf(slotNumber);
    return {
      // Half-metre offsets on each side create one-metre tunnel between competing lines.
      x: touchSide * (30 - rank * 2.0),
      z: clampZ(mark.z + (throwing ? -teamDir * 0.5 : teamDir * 0.5)),
    };
  }

  if (player.role === ROLES.ScrumHalf) {
    // Throwing receiver waits closer; defending receiver remains near Law 18 ten-metre offside line.
    return {
      x: touchSide * 18,
      z: clampZ(mark.z + (throwing ? -teamDir * 4.5 : teamDir * 10)),
    };
  }

  const depth =
    player.role === ROLES.FullBack
      ? nonParticipants === "maulDefence"
        ? 18
        : 22
      : nonParticipants === "split"
        ? 12
        : nonParticipants === "maulDefence"
          ? 10
          : 10;
  // Non-participants stay at least ten metres from mark, with fullback deeper for kick cover.
  const width =
    nonParticipants === "split"
      ? 0.9
      : nonParticipants === "maulDefence"
        ? 0.55
        : 0.65;
  return {
    x: clampX(ATTACK_FORMATION[slotIdx].x * width),
    z: clampZ(mark.z + (throwing ? -teamDir * depth : teamDir * depth)),
  };
};
