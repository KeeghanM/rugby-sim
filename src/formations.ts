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
export type ScrumAttackFormation = "openSide" | "blindSide" | "splitBacks";
export type ScrumDefenceFormation = "drift" | "manOnMan" | "blitz";

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
  reason: "matchStart" | "try" | "goalLineDropout" | "halfTime",
  attackFormation: KickoffAttackFormation,
  defenceFormation: KickoffDefenceFormation,
): Position => {
  const slot = ATTACK_FORMATION[player.number - 1];
  // For goal-line dropouts, all kicking team players MUST be in-goal behind their own try line
  if (reason === "goalLineDropout") {
    const direction = attackDirection(kickingTeam);
    const tryLine = kickingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north;
    const isKicker = player.role === ROLES.FlyHalf && player.team === kickingTeam;
    // Kicking team stands in-goal behind the try line
    if (player.team === kickingTeam) {
      return {
        x: isKicker ? 0 : slot.x,
        z: tryLine - direction * (isKicker ? 0.5 : 1.8 + (player.number % 3) * 1.2),
      };
    }
    // Receiving team stands out on the pitch (18m-26m from goal line)
    return {
      x: slot.x,
      z: tryLine + direction * (18 + (player.number % 4) * 2),
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
    // Fullback on attack always holds deep sweeping cover behind the backline
    if (player.role === ROLES.FullBack) {
      return {
        x: clampX(carrier.position.x * 0.35),
        z: clampZ(carrier.position.z - ballDirection * 18),
      };
    }
    // Scrum-half tracks close behind ball carrier
    if (player.role === ROLES.ScrumHalf) {
      return {
        x: clampX(carrier.position.x + (carrier.position.x >= 0 ? -3 : 3)),
        z: clampZ(carrier.position.z - ballDirection * 2.5),
      };
    }
    // Fly-half positions as first receiver
    if (player.role === ROLES.FlyHalf) {
      return {
        x: clampX(carrier.position.x + (carrier.position.x >= 0 ? -8 : 8)),
        z: clampZ(carrier.position.z - ballDirection * 5),
      };
    }
    // All other attacking players stay spread across their assigned pitch channels
    return {
      x: clampX(slot.x + carrier.position.x * 0.2),
      z: clampZ(carrier.position.z + slot.z * ballDirection),
    };
  }

  // Fullback on defence stays deep (22m-27m) to sweep kicks and tackle line breaks
  if (player.role === ROLES.FullBack) {
    const variant = OPEN_DEFENCE_VARIANTS[defenceFormation];
    return {
      x: clampX(carrier.position.x * 0.45),
      z: clampZ(carrier.position.z + ballDirection * variant.fullbackDepth),
    };
  }

  // Defending line stays spread across the width of the pitch on the offside line
  const slotX = DEFENCE_X[player.number - 1] ?? 0;
  return {
    x: clampX(
      slotX * OPEN_DEFENCE_VARIANTS[defenceFormation].width +
        carrier.position.x * 0.15,
    ),
    z: clampZ(
      defensiveLineZ ?? carrier.position.z + ballDirection * 0.5,
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

  // Scrum-halves (9) stand outside the lineout: throwing 9 in pocket (5m back, 15m in), defending 9 with backline (10m back)
  if (player.role === ROLES.ScrumHalf) {
    return {
      x: touchSide * 18,
      z: clampZ(mark.z + (throwing ? -teamDir * 4.5 : teamDir * 10)),
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

// Computes 3-4-1 pack coordinates for forwards and backline variants for backs at scrums
export const getScrumTarget = (
  player: Player,
  mark: Position,
  feedingTeam: Team,
  attackFormation: ScrumAttackFormation = "openSide",
  defenceFormation: ScrumDefenceFormation = "drift",
): Position => {
  const isFeeding = player.team === feedingTeam;
  const teamDir = attackDirection(player.team);
  const openSideDir = mark.x < 0 ? 1 : -1;

  // 8 Forwards form 3-4-1 pack head-to-head at mark
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

  // Scrum-half positions: feeding 9 at base of scrum on open side; defending 9 on blind side
  if (player.role === ROLES.ScrumHalf) {
    return isFeeding
      ? { x: clampX(mark.x + openSideDir * 2.0), z: clampZ(mark.z - teamDir * 3.2) }
      : { x: clampX(mark.x - openSideDir * 2.2), z: clampZ(mark.z + teamDir * 3.2) };
  }

  // Backs (10, 11, 12, 13, 14, 15) must stay 5m back from hindmost foot (8m from mark)
  const offsideDist = 8.0;

  if (isFeeding) {
    // Attack backline variants
    if (attackFormation === "blindSide") {
      if (player.role === ROLES.FlyHalf) return { x: clampX(mark.x - openSideDir * 6), z: clampZ(mark.z - teamDir * offsideDist) };
      if (player.role === ROLES.Wing && player.number === 11) return { x: clampX(mark.x - openSideDir * 14), z: clampZ(mark.z - teamDir * (offsideDist + 2)) };
      if (player.role === ROLES.FullBack) return { x: clampX(mark.x - openSideDir * 10), z: clampZ(mark.z - teamDir * (offsideDist + 5)) };
      if (player.role === ROLES.InsideCentre) return { x: clampX(mark.x + openSideDir * 8), z: clampZ(mark.z - teamDir * offsideDist) };
      if (player.role === ROLES.OutsideCentre) return { x: clampX(mark.x + openSideDir * 16), z: clampZ(mark.z - teamDir * (offsideDist + 1)) };
      return { x: clampX(mark.x + openSideDir * 26), z: clampZ(mark.z - teamDir * (offsideDist + 2)) };
    }
    if (attackFormation === "splitBacks") {
      if (player.role === ROLES.FlyHalf) return { x: clampX(mark.x + 6), z: clampZ(mark.z - teamDir * offsideDist) };
      if (player.role === ROLES.InsideCentre) return { x: clampX(mark.x - 8), z: clampZ(mark.z - teamDir * offsideDist) };
      if (player.role === ROLES.OutsideCentre) return { x: clampX(mark.x + 15), z: clampZ(mark.z - teamDir * (offsideDist + 2)) };
      if (player.role === ROLES.Wing && player.number === 11) return { x: clampX(mark.x - 20), z: clampZ(mark.z - teamDir * (offsideDist + 2)) };
      if (player.role === ROLES.Wing) return { x: clampX(mark.x + 24), z: clampZ(mark.z - teamDir * (offsideDist + 2)) };
      return { x: clampX(mark.x), z: clampZ(mark.z - teamDir * (offsideDist + 8)) };
    }
    // Default "openSide" backline sweep
    if (player.role === ROLES.FlyHalf) return { x: clampX(mark.x + openSideDir * 8), z: clampZ(mark.z - teamDir * offsideDist) };
    if (player.role === ROLES.InsideCentre) return { x: clampX(mark.x + openSideDir * 15), z: clampZ(mark.z - teamDir * (offsideDist + 1)) };
    if (player.role === ROLES.OutsideCentre) return { x: clampX(mark.x + openSideDir * 22), z: clampZ(mark.z - teamDir * (offsideDist + 2)) };
    if (player.role === ROLES.Wing && player.number === 14) return { x: clampX(mark.x + openSideDir * 29), z: clampZ(mark.z - teamDir * (offsideDist + 3)) };
    if (player.role === ROLES.Wing) return { x: clampX(mark.x - openSideDir * 10), z: clampZ(mark.z - teamDir * (offsideDist + 1)) };
    return { x: clampX(mark.x + openSideDir * 12), z: clampZ(mark.z - teamDir * (offsideDist + 8)) };
  }

  // Defence backline variants
  const depthMod = defenceFormation === "blitz" ? 0.8 : defenceFormation === "drift" ? 1.4 : 1.0;
  if (player.role === ROLES.FlyHalf) return { x: clampX(mark.x + openSideDir * 8), z: clampZ(mark.z + teamDir * (offsideDist * depthMod)) };
  if (player.role === ROLES.InsideCentre) return { x: clampX(mark.x + openSideDir * 15), z: clampZ(mark.z + teamDir * (offsideDist * depthMod)) };
  if (player.role === ROLES.OutsideCentre) return { x: clampX(mark.x + openSideDir * 22), z: clampZ(mark.z + teamDir * (offsideDist * depthMod)) };
  if (player.role === ROLES.Wing && player.number === 14) return { x: clampX(mark.x + openSideDir * 29), z: clampZ(mark.z + teamDir * ((offsideDist + 3) * depthMod)) };
  if (player.role === ROLES.Wing) return { x: clampX(mark.x - openSideDir * 10), z: clampZ(mark.z + teamDir * ((offsideDist + 2) * depthMod)) };
  return { x: clampX(mark.x + openSideDir * 14), z: clampZ(mark.z + teamDir * (offsideDist + 14)) };
};
