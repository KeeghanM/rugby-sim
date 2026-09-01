import {
  attackDirection,
  PITCH,
  ROLES,
  type Player,
  type Position,
  type Team,
} from "../domain.ts";
import { ATTACK_FORMATION } from "./constants.ts";
import {
  KICKOFF_ATTACK_FORMATIONS,
  KICKOFF_DEFENCE_FORMATIONS,
} from "./constants.ts";
import type {
  KickoffAttackFormation,
  KickoffDefenceFormation,
} from "./types.ts";
import { clampX, clampZ, getSlotIndex } from "./utils.ts";

export const getKickoffTarget = (
  player: Player,
  kickingTeam: Team,
  reason: "matchStart" | "try" | "goalLineDropout" | "halfTime",
  attackFormation: KickoffAttackFormation,
  defenceFormation: KickoffDefenceFormation,
  custom?: readonly Position[],
): Position => {
  const slotIdx = getSlotIndex(player);
  const slot = ATTACK_FORMATION[slotIdx];
  const customPosition = custom?.[slotIdx];
  // Goal-line dropout overrides custom kickoff shape to enforce restart-side placement behind goal line.
  if (customPosition && reason !== "goalLineDropout") {
    return {
      x: clampX(customPosition.x),
      z: clampZ(customPosition.z * attackDirection(player.team)),
    };
  }
  if (reason === "goalLineDropout") {
    const direction = attackDirection(kickingTeam);
    const tryLine =
      kickingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north;
    const isKicker =
      player.role === ROLES.FlyHalf && player.team === kickingTeam;
    if (player.team === kickingTeam) {
      // Kicker sets on goal line while teammates stagger behind it under simplified Law 12 geometry.
      return {
        x: isKicker ? 0 : slot.x,
        z: tryLine - direction * (isKicker ? 0.5 : 1.8 + (slotIdx % 3) * 1.2),
      };
    }
    return {
      // Receivers begin well beyond dropout mark to create legal space and a plausible catch line.
      x: slot.x,
      z: tryLine + direction * (18 + (slotIdx % 4) * 2),
    };
  }
  if (player.team === kickingTeam) {
    // Formation coordinates are mirrored by attack direction so both teams share one template.
    const kickoffSlot = KICKOFF_ATTACK_FORMATIONS[attackFormation][slotIdx];
    return {
      x: kickoffSlot.x,
      z: -attackDirection(player.team) * kickoffSlot.z,
    };
  }
  const receivingSlot = KICKOFF_DEFENCE_FORMATIONS[defenceFormation][slotIdx];
  return {
    x: receivingSlot.x,
    z: -attackDirection(player.team) * receivingSlot.z,
  };
};
