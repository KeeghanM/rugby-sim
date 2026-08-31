import {
  attackDirection,
  type GameState,
  type Player,
  type Pod,
  type Position,
  type Role,
  ROLES,
  PITCH,
} from "./domain.ts";

type Slot = { role: Role; pod: Pod; x: number; z: number };

export const ATTACK_FORMATION: readonly Slot[] = [
  { role: ROLES.LooseHead, pod: "left", x: -14, z: -5 },
  { role: ROLES.Hooker, pod: "middle", x: 0, z: -5 },
  { role: ROLES.TightHead, pod: "right", x: 14, z: -5 },
  { role: ROLES.Lock, pod: "left", x: -11, z: -7 },
  { role: ROLES.Lock, pod: "middle", x: 3, z: -7 },
  { role: ROLES.BlindSideFlanker, pod: "left", x: -17, z: -8 },
  { role: ROLES.OpenSideFlanker, pod: "right", x: 11, z: -8 },
  { role: ROLES.NumberEight, pod: "middle", x: -3, z: -9 },
  { role: ROLES.ScrumHalf, pod: "backline", x: 7, z: -7 },
  { role: ROLES.FlyHalf, pod: "backline", x: 10, z: -12 },
  { role: ROLES.Wing, pod: "backline", x: -30, z: -15 },
  { role: ROLES.InsideCentre, pod: "backline", x: 14, z: -15 },
  { role: ROLES.OutsideCentre, pod: "backline", x: 19, z: -18 },
  { role: ROLES.Wing, pod: "backline", x: 30, z: -15 },
  { role: ROLES.FullBack, pod: "backline", x: 0, z: -27 },
] as const;

const DEFENCE_FORMATION: readonly Slot[] = [
  { role: ROLES.LooseHead, pod: "left", x: -10, z: 5 },
  { role: ROLES.Hooker, pod: "middle", x: -5, z: 4 },
  { role: ROLES.TightHead, pod: "right", x: 0, z: 4 },
  { role: ROLES.Lock, pod: "left", x: 5, z: 4 },
  { role: ROLES.Lock, pod: "middle", x: 10, z: 5 },
  { role: ROLES.BlindSideFlanker, pod: "left", x: -16, z: 6 },
  { role: ROLES.OpenSideFlanker, pod: "right", x: 16, z: 6 },
  { role: ROLES.NumberEight, pod: "middle", x: 0, z: 8 },
  { role: ROLES.ScrumHalf, pod: "backline", x: -21, z: 8 },
  { role: ROLES.FlyHalf, pod: "backline", x: 21, z: 8 },
  { role: ROLES.Wing, pod: "backline", x: -30, z: 11 },
  { role: ROLES.InsideCentre, pod: "backline", x: -10, z: 12 },
  { role: ROLES.OutsideCentre, pod: "backline", x: 10, z: 12 },
  { role: ROLES.Wing, pod: "backline", x: 30, z: 11 },
  { role: ROLES.FullBack, pod: "backline", x: 0, z: 24 },
] as const;

const clampX = (x: number) =>
  Math.max(PITCH.touchLines.left + 1, Math.min(PITCH.touchLines.right - 1, x));
const clampZ = (z: number) =>
  Math.max(PITCH.tryLines.south + 1, Math.min(PITCH.tryLines.north - 1, z));

export const getKickoffTarget = (player: Player): Position => {
  const slot = ATTACK_FORMATION[player.number - 1];
  return { x: slot.x, z: slot.z * attackDirection(player.team) };
};

export const getOpenPlayTarget = (
  _state: GameState,
  player: Player,
  ballCarrier: Player,
): Position => {
  const attacking = player.team === ballCarrier.team;
  const slot = (attacking ? ATTACK_FORMATION : DEFENCE_FORMATION)[
    player.number - 1
  ];
  const ballDirection = attackDirection(ballCarrier.team);

  return {
    x: clampX(slot.x + ballCarrier.position.x * (attacking ? 0.25 : 0.35)),
    z: clampZ(
      ballCarrier.position.z + slot.z * ballDirection,
    ),
  };
};

const FORWARDS = new Set<Role>([
  ROLES.LooseHead,
  ROLES.Hooker,
  ROLES.TightHead,
  ROLES.Lock,
  ROLES.BlindSideFlanker,
  ROLES.OpenSideFlanker,
  ROLES.NumberEight,
]);

export const isForward = (player: Pick<Player, "role">) => FORWARDS.has(player.role);

export const getRuckTarget = (
  player: Player,
  ruck: Position,
  attackingTeam: Player["team"],
  joinsRuck: boolean,
): Position => {
  const direction = attackDirection(attackingTeam);
  const attacking = player.team === attackingTeam;
  const side = player.number % 2 === 0 ? 1 : -1;

  if (joinsRuck) {
    const rank = Math.floor((player.number - 1) / 2);
    return {
      x: clampX(ruck.x + side * (1.2 + rank * 0.5)),
      z: clampZ(ruck.z + direction * (attacking ? -1.5 : 1.5)),
    };
  }

  const slot = ATTACK_FORMATION[player.number - 1];
  const podX = player.pod === "left" ? -14 : player.pod === "right" ? 14 : 0;
  return {
    x: clampX((isForward(player) ? podX : slot.x) + ruck.x * 0.25),
    z: clampZ(
      ruck.z +
        direction *
          (attacking ? Math.min(-6, slot.z * 0.65) : 7 + Math.abs(slot.z) * 0.25),
    ),
  };
};
