import { PITCH, ROLES, type Player, type Role } from "../domain.ts";
import { clamp } from "../math.ts";

export const FORWARDS = new Set<Role>([
  ROLES.LooseHead,
  ROLES.Hooker,
  ROLES.TightHead,
  ROLES.Lock,
  ROLES.BlindSideFlanker,
  ROLES.OpenSideFlanker,
  ROLES.NumberEight,
]);

export const clampX = (x: number) =>
  // One-metre inset keeps player centres inside playable boundary.
  clamp(x, PITCH.touchLines.left + 1, PITCH.touchLines.right - 1);
export const clampZ = (z: number) =>
  clamp(z, PITCH.deadBallLines.south + 1, PITCH.deadBallLines.north - 1);

export const getSlotIndex = (player: Player): number =>
  typeof player.slotIndex === "number"
    ? clamp(player.slotIndex, 0, 14)
    : clamp((player.number - 1) % 15, 0, 14);

export const isForward = (player: Pick<Player, "role">) =>
  FORWARDS.has(player.role);
