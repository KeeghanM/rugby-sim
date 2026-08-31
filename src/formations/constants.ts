import { ROLES } from "../domain.ts";
import type { Slot } from "./types.ts";
import type {
  KickoffAttackFormation,
  KickoffDefenceFormation,
  LineoutMembers,
  OpenAttackFormation,
  OpenDefenceFormation,
} from "./types.ts";
import type { Position } from "../domain.ts";

export const ATTACK_FORMATION: readonly Slot[] = [
  { role: ROLES.LooseHead, pod: "left", x: -14, z: -3 },
  { role: ROLES.Hooker, pod: "middle", x: 0, z: -3 },
  { role: ROLES.TightHead, pod: "right", x: 14, z: -3 },
  { role: ROLES.Lock, pod: "left", x: -11, z: -4 },
  { role: ROLES.Lock, pod: "middle", x: 3, z: -4 },
  { role: ROLES.BlindSideFlanker, pod: "left", x: -17, z: -5 },
  { role: ROLES.OpenSideFlanker, pod: "right", x: 11, z: -5 },
  { role: ROLES.NumberEight, pod: "middle", x: -3, z: -5 },
  { role: ROLES.ScrumHalf, pod: "backline", x: 7, z: -2.5 },
  { role: ROLES.FlyHalf, pod: "backline", x: 10, z: -5 },
  { role: ROLES.Wing, pod: "backline", x: -30, z: -7 },
  { role: ROLES.InsideCentre, pod: "backline", x: 14, z: -6 },
  { role: ROLES.OutsideCentre, pod: "backline", x: 19, z: -7 },
  { role: ROLES.Wing, pod: "backline", x: 30, z: -7 },
  { role: ROLES.FullBack, pod: "backline", x: 0, z: -18 },
] as const;

export const OPEN_ATTACK_FORMATIONS: Record<
  OpenAttackFormation,
  readonly Slot[]
> = {
  balanced: ATTACK_FORMATION,
  tightPods: ATTACK_FORMATION.map((slot) => ({
    ...slot,
    x: slot.pod === "backline" ? slot.x * 0.85 : slot.x * 0.68,
    z: slot.z * 0.9,
  })),
  wide: ATTACK_FORMATION.map((slot) => ({
    ...slot,
    x: Math.max(-32, Math.min(32, slot.x * 1.12)),
    z: slot.z * 1.15,
  })),
};

export const KICKOFF_ATTACK_FORMATIONS: Record<
  KickoffAttackFormation,
  readonly Position[]
> = {
  balanced: ATTACK_FORMATION.map((slot, index) => ({
    x: index === 9 ? 0 : slot.x,
    z: index === 9 ? 1 : 1 + ((index + 1) % 3) * 1.5,
  })),
  press: ATTACK_FORMATION.map((slot, index) => ({
    x: index === 9 ? 0 : slot.x * 0.9,
    z: index === 9 ? 0.75 : 0.75 + ((index + 1) % 2) * 1.25,
  })),
  split: ATTACK_FORMATION.map((slot, index) => ({
    x: index === 9 ? 0 : Math.max(-32, Math.min(32, slot.x * 1.12)),
    z: index === 9 ? 1 : 1.5 + ((index + 1) % 4),
  })),
};

export const KICKOFF_DEFENCE_FORMATIONS: Record<
  KickoffDefenceFormation,
  readonly Position[]
> = {
  deep: ATTACK_FORMATION.map((slot, index) => ({
    x: slot.x,
    z: index === 14 ? 38 : 30 + ((index + 1) % 4) * 2,
  })),
  pendulum: ATTACK_FORMATION.map((slot, index) => ({
    x: slot.x * 0.92,
    z:
      index === 14
        ? 40
        : slot.role === ROLES.Wing
          ? 35
          : 30 + ((index + 1) % 3),
  })),
  splitField: ATTACK_FORMATION.map((slot, index) => ({
    x: Math.max(-32, Math.min(32, slot.x * 1.08)),
    z: index === 14 ? 36 : 31 + ((index + 1) % 4) * 1.5,
  })),
};

export const LINEOUT_MEMBER_VARIANTS: Record<
  LineoutMembers,
  readonly number[]
> = {
  4: [1, 3, 4, 5],
  5: [1, 3, 4, 5, 8],
  6: [1, 3, 4, 5, 6, 8],
  7: [1, 3, 4, 5, 6, 7, 8],
};

export const OPEN_DEFENCE_VARIANTS: Record<
  OpenDefenceFormation,
  { width: number; fullbackDepth: number }
> = {
  connected: { width: 1, fullbackDepth: 24 },
  narrow: { width: 0.82, fullbackDepth: 22 },
  wide: { width: 1.08, fullbackDepth: 27 },
};

export const DEFENCE_X = [
  -18, -12, -6, 0, 6, 12, 18, -24, 24, -9, -30, -3, 3, 30,
];
