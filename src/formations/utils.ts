import { PITCH, ROLES, type Player, type Role } from "../domain.ts";

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
  Math.max(PITCH.touchLines.left + 1, Math.min(PITCH.touchLines.right - 1, x));
export const clampZ = (z: number) =>
  Math.max(
    PITCH.deadBallLines.south + 1,
    Math.min(PITCH.deadBallLines.north - 1, z),
  );

export const getSlotIndex = (player: Player): number =>
  typeof player.slotIndex === "number"
    ? Math.max(0, Math.min(14, player.slotIndex))
    : Math.max(0, Math.min(14, (player.number - 1) % 15));

export const isForward = (player: Pick<Player, "role">) =>
  FORWARDS.has(player.role);
