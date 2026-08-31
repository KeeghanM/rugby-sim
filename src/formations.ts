import {
  attackDirection,
  type Player,
  type Pod,
  type Position,
  type Role,
  ROLES,
  PITCH,
  type Team,
} from "./domain.ts";

type Slot = { role: Role; pod: Pod; x: number; z: number };

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

const DEFENCE_X = [-18, -12, -6, 0, 6, 12, 18, -24, 24, -9, -30, -3, 3, 30];
const FORWARDS = new Set<Role>([
  ROLES.LooseHead,
  ROLES.Hooker,
  ROLES.TightHead,
  ROLES.Lock,
  ROLES.BlindSideFlanker,
  ROLES.OpenSideFlanker,
  ROLES.NumberEight,
]);

const clampX = (x: number) =>
  Math.max(PITCH.touchLines.left + 1, Math.min(PITCH.touchLines.right - 1, x));
const clampZ = (z: number) =>
  Math.max(PITCH.tryLines.south + 1, Math.min(PITCH.tryLines.north - 1, z));

export const isForward = (player: Pick<Player, "role">) => FORWARDS.has(player.role);

export const getKickoffTarget = (player: Player, kickingTeam: Team): Position => {
  const slot = ATTACK_FORMATION[player.number - 1];
  if (player.team === kickingTeam) {
    return {
      x: slot.x,
      z: -attackDirection(player.team) * (1 + (player.number % 3) * 1.5),
    };
  }
  const depth = player.role === ROLES.FullBack ? 38 : 30 + (player.number % 4) * 2;
  return { x: slot.x, z: -attackDirection(player.team) * depth };
};

export const getOpenPlayTarget = (
  player: Player,
  carrier: Player,
  defensiveLineZ?: number,
): Position => {
  const ballDirection = attackDirection(carrier.team);
  if (player.team === carrier.team) {
    const slot = ATTACK_FORMATION[player.number - 1];
    const x =
      player.role === ROLES.ScrumHalf
        ? carrier.position.x + 4
        : player.role === ROLES.FlyHalf
          ? carrier.position.x + 9
          : player.laneX;
    return {
      x: clampX(x),
      z: clampZ(carrier.position.z + slot.z * ballDirection),
    };
  }

  if (player.role === ROLES.FullBack) {
    return {
      x: clampX(carrier.position.x * 0.55),
      z: clampZ(carrier.position.z + ballDirection * 24),
    };
  }

  return {
    x: clampX(player.laneX),
    z: clampZ(
      defensiveLineZ ?? carrier.position.z + ballDirection * 3.5,
    ),
  };
};

export const getRuckTarget = (
  player: Player,
  ruck: Position,
  attackingTeam: Team,
  attackers: ReadonlySet<string>,
  defenders: ReadonlySet<string>,
): Position => {
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
    return { x: clampX(ruck.x + 2.5), z: clampZ(ruck.z - direction * 2.8) };
  }
  if (!attacking && player.role === ROLES.FullBack) {
    return { x: clampX(ruck.x * 0.5), z: clampZ(ruck.z + direction * 26) };
  }

  if (!attacking) {
    return {
      x: clampX((DEFENCE_X[player.number - 1] ?? 0) + ruck.x * 0.25),
      z: clampZ(ruck.z + direction * (8 + (player.number % 2) * 0.4)),
    };
  }

  const slot = ATTACK_FORMATION[player.number - 1];
  const podX = player.pod === "left" ? -14 : player.pod === "right" ? 14 : 0;
  return {
    x: clampX((isForward(player) ? podX : slot.x) + ruck.x * 0.2),
    z: clampZ(ruck.z + direction * Math.min(-6, slot.z * 0.7)),
  };
};

export const getLineoutTarget = (
  player: Player,
  mark: Position,
  throwingTeam: Team,
): Position => {
  const touchSide = mark.x < 0 ? -1 : 1;
  const throwing = player.team === throwingTeam;
  if (throwing && player.role === ROLES.Hooker) {
    return { x: touchSide * 34, z: mark.z };
  }
  if (isForward(player)) {
    return {
      x: touchSide * (31 - (player.number - 1) * 2.2),
      z: clampZ(mark.z + attackDirection(throwingTeam) * (throwing ? -0.6 : 0.6)),
    };
  }
  const depth = player.role === ROLES.FullBack ? 20 : 11;
  return {
    x: clampX(ATTACK_FORMATION[player.number - 1].x * 0.65),
    z: clampZ(mark.z + attackDirection(throwingTeam) * (throwing ? -depth : depth)),
  };
};
