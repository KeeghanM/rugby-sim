import {
  attackDirection,
  ROLES,
  type Player,
  type Position,
  type Team,
} from "../domain.ts";
import type { ScrumAttackFormation, ScrumDefenceFormation } from "./types.ts";
import { clampX, clampZ, getSlotIndex } from "./utils.ts";

export const getScrumTarget = (
  player: Player,
  mark: Position,
  feedingTeam: Team,
  attackFormation: ScrumAttackFormation = "openSide",
  defenceFormation: ScrumDefenceFormation = "drift",
  custom?: readonly Position[],
): Position => {
  const isFeeding = player.team === feedingTeam;
  const teamDir = attackDirection(player.team);
  const openSideDir = mark.x < 0 ? 1 : -1;
  const customPosition = custom?.[getSlotIndex(player)];
  if (customPosition) {
    return {
      x: clampX(mark.x + customPosition.x),
      z: clampZ(mark.z + customPosition.z * teamDir),
    };
  }

  if (player.role === ROLES.LooseHead) {
    return { x: mark.x - 1.0, z: clampZ(mark.z - teamDir * 0.6) };
  }
  if (player.role === ROLES.Hooker) {
    return { x: mark.x, z: clampZ(mark.z - teamDir * 0.6) };
  }
  if (player.role === ROLES.TightHead) {
    return { x: mark.x + 1.0, z: clampZ(mark.z - teamDir * 0.6) };
  }
  if (player.role === ROLES.Lock && player.number === 4) {
    return { x: mark.x - 0.5, z: clampZ(mark.z - teamDir * 1.8) };
  }
  if (player.role === ROLES.Lock) {
    return { x: mark.x + 0.5, z: clampZ(mark.z - teamDir * 1.8) };
  }
  if (player.role === ROLES.BlindSideFlanker) {
    return { x: mark.x - 1.6, z: clampZ(mark.z - teamDir * 2.0) };
  }
  if (player.role === ROLES.OpenSideFlanker) {
    return { x: mark.x + 1.6, z: clampZ(mark.z - teamDir * 2.0) };
  }
  if (player.role === ROLES.NumberEight) {
    return { x: mark.x, z: clampZ(mark.z - teamDir * 3.0) };
  }

  if (player.role === ROLES.ScrumHalf) {
    return isFeeding
      ? {
          x: clampX(mark.x + openSideDir * 2.0),
          z: clampZ(mark.z - teamDir * 3.2),
        }
      : {
          x: clampX(mark.x - openSideDir * 2.2),
          z: clampZ(mark.z + teamDir * 3.2),
        };
  }

  const offsideDist = 8.0;

  if (isFeeding) {
    if (attackFormation === "blindSide") {
      if (player.role === ROLES.FlyHalf)
        return {
          x: clampX(mark.x - openSideDir * 6),
          z: clampZ(mark.z - teamDir * offsideDist),
        };
      if (player.role === ROLES.Wing && player.number === 11)
        return {
          x: clampX(mark.x - openSideDir * 14),
          z: clampZ(mark.z - teamDir * (offsideDist + 2)),
        };
      if (player.role === ROLES.FullBack)
        return {
          x: clampX(mark.x - openSideDir * 10),
          z: clampZ(mark.z - teamDir * (offsideDist + 5)),
        };
      if (player.role === ROLES.InsideCentre)
        return {
          x: clampX(mark.x + openSideDir * 8),
          z: clampZ(mark.z - teamDir * offsideDist),
        };
      if (player.role === ROLES.OutsideCentre)
        return {
          x: clampX(mark.x + openSideDir * 16),
          z: clampZ(mark.z - teamDir * (offsideDist + 1)),
        };
      return {
        x: clampX(mark.x + openSideDir * 26),
        z: clampZ(mark.z - teamDir * (offsideDist + 2)),
      };
    }
    if (attackFormation === "splitBacks") {
      if (player.role === ROLES.FlyHalf)
        return {
          x: clampX(mark.x + 6),
          z: clampZ(mark.z - teamDir * offsideDist),
        };
      if (player.role === ROLES.InsideCentre)
        return {
          x: clampX(mark.x - 8),
          z: clampZ(mark.z - teamDir * offsideDist),
        };
      if (player.role === ROLES.OutsideCentre)
        return {
          x: clampX(mark.x + 15),
          z: clampZ(mark.z - teamDir * (offsideDist + 2)),
        };
      if (player.role === ROLES.Wing && player.number === 11)
        return {
          x: clampX(mark.x - 20),
          z: clampZ(mark.z - teamDir * (offsideDist + 2)),
        };
      if (player.role === ROLES.Wing)
        return {
          x: clampX(mark.x + 24),
          z: clampZ(mark.z - teamDir * (offsideDist + 2)),
        };
      return {
        x: clampX(mark.x),
        z: clampZ(mark.z - teamDir * (offsideDist + 8)),
      };
    }
    if (player.role === ROLES.FlyHalf)
      return {
        x: clampX(mark.x + openSideDir * 8),
        z: clampZ(mark.z - teamDir * offsideDist),
      };
    if (player.role === ROLES.InsideCentre)
      return {
        x: clampX(mark.x + openSideDir * 15),
        z: clampZ(mark.z - teamDir * (offsideDist + 1)),
      };
    if (player.role === ROLES.OutsideCentre)
      return {
        x: clampX(mark.x + openSideDir * 22),
        z: clampZ(mark.z - teamDir * (offsideDist + 2)),
      };
    if (player.role === ROLES.Wing && player.number === 14)
      return {
        x: clampX(mark.x + openSideDir * 29),
        z: clampZ(mark.z - teamDir * (offsideDist + 3)),
      };
    if (player.role === ROLES.Wing)
      return {
        x: clampX(mark.x - openSideDir * 10),
        z: clampZ(mark.z - teamDir * (offsideDist + 1)),
      };
    return {
      x: clampX(mark.x + openSideDir * 12),
      z: clampZ(mark.z - teamDir * (offsideDist + 8)),
    };
  }

  const depthMod =
    defenceFormation === "blitz"
      ? 0.8
      : defenceFormation === "drift"
        ? 1.4
        : 1.0;
  if (player.role === ROLES.FlyHalf)
    return {
      x: clampX(mark.x + openSideDir * 8),
      z: clampZ(mark.z + teamDir * (offsideDist * depthMod)),
    };
  if (player.role === ROLES.InsideCentre)
    return {
      x: clampX(mark.x + openSideDir * 15),
      z: clampZ(mark.z + teamDir * (offsideDist * depthMod)),
    };
  if (player.role === ROLES.OutsideCentre)
    return {
      x: clampX(mark.x + openSideDir * 22),
      z: clampZ(mark.z + teamDir * (offsideDist * depthMod)),
    };
  if (player.role === ROLES.Wing && player.number === 14)
    return {
      x: clampX(mark.x + openSideDir * 29),
      z: clampZ(mark.z + teamDir * ((offsideDist + 3) * depthMod)),
    };
  if (player.role === ROLES.Wing)
    return {
      x: clampX(mark.x - openSideDir * 10),
      z: clampZ(mark.z + teamDir * ((offsideDist + 2) * depthMod)),
    };
  return {
    x: clampX(mark.x + openSideDir * 14),
    z: clampZ(mark.z + teamDir * (offsideDist + 14)),
  };
};
