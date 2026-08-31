import {
  attackDirection,
  ROLES,
  type Player,
  type Position,
  type Team,
} from "../domain.ts";
import { ATTACK_FORMATION, DEFENCE_X } from "./constants.ts";
import { clampX, clampZ, getSlotIndex, isForward } from "./utils.ts";

export const getRuckTarget = (
  player: Player,
  ruck: Position,
  attackingTeam: Team,
  attackers: ReadonlySet<string>,
  defenders: ReadonlySet<string>,
): Position => {
  const slotIdx = getSlotIndex(player);
  const direction = attackDirection(attackingTeam);
  const attacking = player.team === attackingTeam;
  const joins = attackers.has(player.id) || defenders.has(player.id);

  if (joins) {
    const group = attacking ? [...attackers] : [...defenders];
    const rank = group.indexOf(player.id);
    return {
      x: clampX(ruck.x + (rank - (group.length - 1) / 2) * 1.4),
      z: clampZ(ruck.z + direction * (attacking ? -1.2 : 1.2)),
    };
  }

  if (attacking && player.role === ROLES.ScrumHalf) {
    return { x: clampX(ruck.x), z: clampZ(ruck.z - direction * 1.1) };
  }
  if (!attacking && player.role === ROLES.FullBack) {
    return { x: clampX(ruck.x * 0.5), z: clampZ(ruck.z + direction * 26) };
  }

  if (!attacking) {
    return {
      x: clampX((DEFENCE_X[slotIdx] ?? 0) + ruck.x * 0.25),
      z: clampZ(ruck.z + direction * (0.5 + (slotIdx % 2) * 0.3)),
    };
  }

  const slot = ATTACK_FORMATION[slotIdx];
  const podX = player.pod === "left" ? -14 : player.pod === "right" ? 14 : 0;
  return {
    x: clampX((isForward(player) ? podX : slot.x) + ruck.x * 0.2),
    z: clampZ(ruck.z + direction * Math.min(-6, slot.z * 0.7)),
  };
};
