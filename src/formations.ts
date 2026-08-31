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
export type KickoffAttackFormation = "balanced" | "press" | "split";
export type KickoffDefenceFormation = "deep" | "pendulum" | "splitField";
export type OpenAttackFormation = "balanced" | "tightPods" | "wide";
export type OpenDefenceFormation = "connected" | "narrow" | "wide";
export type LineoutMembers = 4 | 5 | 6 | 7;
export type LineoutNonParticipants = "backline" | "split" | "maulDefence";

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

// Provides team-selectable open-play attack widths and depths.
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

// Provides three kicking-team restart shapes; fly-half always owns centre spot.
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

// Provides receiving-team shapes inside own 22.
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
    z: index === 14 ? 40 : slot.role === ROLES.Wing ? 35 : 30 + ((index + 1) % 3),
  })),
  splitField: ATTACK_FORMATION.map((slot, index) => ({
    x: Math.max(-32, Math.min(32, slot.x * 1.08)),
    z: index === 14 ? 36 : 31 + ((index + 1) % 4) * 1.5,
  })),
};

// Defines which forwards stand in line for each legal lineout size.
export const LINEOUT_MEMBER_VARIANTS: Record<
  LineoutMembers,
  readonly number[]
> = {
  4: [1, 3, 4, 5],
  5: [1, 3, 4, 5, 8],
  6: [1, 3, 4, 5, 6, 8],
  7: [1, 3, 4, 5, 6, 7, 8],
};

// Provides defensive line width and fullback depth variants.
const OPEN_DEFENCE_VARIANTS: Record<
  OpenDefenceFormation,
  { width: number; fullbackDepth: number }
> = {
  connected: { width: 1, fullbackDepth: 24 },
  narrow: { width: 0.82, fullbackDepth: 22 },
  wide: { width: 1.08, fullbackDepth: 27 },
};

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

export const getKickoffTarget = (
  player: Player,
  kickingTeam: Team,
  reason: "matchStart" | "try" | "goalLineDropout",
  attackFormation: KickoffAttackFormation,
  defenceFormation: KickoffDefenceFormation,
): Position => {
  const slot = ATTACK_FORMATION[player.number - 1];
  // Place goal-line dropout teams around their own line and receiving side near 22.
  if (reason === "goalLineDropout") {
    const direction = attackDirection(kickingTeam);
    const tryLine = kickingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north;
    const depth = player.team === kickingTeam
      ? 1 + (player.number % 3)
      : 22 + (player.number % 4) * 2;
    return {
      x: player.role === ROLES.FlyHalf && player.team === kickingTeam ? 0 : slot.x,
      z: tryLine + direction * depth,
    };
  }
  // Hold kicking side just behind halfway for normal restarts.
  if (player.team === kickingTeam) {
    const kickoffSlot = KICKOFF_ATTACK_FORMATIONS[attackFormation][player.number - 1];
    return {
      x: kickoffSlot.x,
      z: -attackDirection(player.team) * kickoffSlot.z,
    };
  }
  // Set receiving side inside its own 22 with fullback deepest.
  const receivingSlot =
    KICKOFF_DEFENCE_FORMATIONS[defenceFormation][player.number - 1];
  return {
    x: receivingSlot.x,
    z: -attackDirection(player.team) * receivingSlot.z,
  };
};

export const getOpenPlayTarget = (
  player: Player,
  carrier: Player,
  defensiveLineZ?: number,
  attackFormation: OpenAttackFormation = "balanced",
  defenceFormation: OpenDefenceFormation = "connected",
): Position => {
  const ballDirection = attackDirection(carrier.team);
  if (player.team === carrier.team) {
    const slot = OPEN_ATTACK_FORMATIONS[attackFormation][player.number - 1];
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
    const variant = OPEN_DEFENCE_VARIANTS[defenceFormation];
    return {
      x: clampX(carrier.position.x * 0.55),
      z: clampZ(carrier.position.z + ballDirection * variant.fullbackDepth),
    };
  }

  return {
    x: clampX(player.laneX * OPEN_DEFENCE_VARIANTS[defenceFormation].width),
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
      z: clampZ(ruck.z + direction * (0.5 + (player.number % 2) * 0.3)),
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
  memberCount: LineoutMembers,
  nonParticipants: LineoutNonParticipants,
): Position => {
  const touchSide = mark.x < 0 ? -1 : 1;
  const throwing = player.team === throwingTeam;
  const teamDir = attackDirection(throwingTeam);
  // Throwing hooker MUST stand directly on the touchline at mark
  if (throwing && player.role === ROLES.Hooker) {
    return { x: touchSide * PITCH.touchLines.right, z: mark.z };
  }
  // Defending hooker stands 2m in from touch in 5m tramline on defending side
  if (!throwing && player.role === ROLES.Hooker) {
    return {
      x: touchSide * (PITCH.touchLines.right - 2),
      z: clampZ(mark.z + teamDir * 2),
    };
  }

  const members = LINEOUT_MEMBER_VARIANTS[memberCount];
  // Lineout participants form two parallel rows (5m to 15m from touch) across mark.z
  if (members.includes(player.number)) {
    const rank = members.indexOf(player.number);
    return {
      x: touchSide * (30 - rank * 2.0),
      z: clampZ(mark.z + (throwing ? -teamDir * 0.5 : teamDir * 0.5)),
    };
  }

  // Scrum-halves stand as lineout receivers near the base of the tunnel
  if (player.role === ROLES.ScrumHalf) {
    return {
      x: touchSide * Math.max(16, 30 - memberCount * 2.0 + 2),
      z: clampZ(mark.z + (throwing ? -teamDir * 2.5 : teamDir * 2.5)),
    };
  }

  // Non-participant backs and extra forwards stand 10m back from the lineout mark
  const depth = player.role === ROLES.FullBack
    ? nonParticipants === "maulDefence" ? 18 : 22
    : nonParticipants === "split" ? 12 : nonParticipants === "maulDefence" ? 10 : 10;
  const width = nonParticipants === "split" ? 0.9 : nonParticipants === "maulDefence" ? 0.55 : 0.65;
  return {
    x: clampX(ATTACK_FORMATION[player.number - 1].x * width),
    z: clampZ(mark.z + (throwing ? -teamDir * depth : teamDir * depth)),
  };
};
