import {
  type ActiveTeamFormations,
  type PlayerSkills,
  type Pod,
  type Role,
  ROLES,
  type Team,
  type MatchConfig,
  type TeamDefinition,
  type FormationContext,
  type Position,
} from "./domain.ts";
import type {
  KickoffAttackFormation,
  KickoffDefenceFormation,
  LineoutMembers,
  LineoutNonParticipants,
  OpenAttackFormation,
  OpenDefenceFormation,
  ScrumAttackFormation,
  ScrumDefenceFormation,
} from "./formations.ts";

type Random = () => number;

export const BENCH_SLOTS: readonly { number: number; role: Role; pod: Pod }[] =
  [
    { number: 16, role: ROLES.Hooker, pod: "middle" },
    { number: 17, role: ROLES.LooseHead, pod: "left" },
    { number: 18, role: ROLES.TightHead, pod: "right" },
    { number: 19, role: ROLES.Lock, pod: "left" },
    { number: 20, role: ROLES.OpenSideFlanker, pod: "right" },
    { number: 21, role: ROLES.ScrumHalf, pod: "backline" },
    { number: 22, role: ROLES.FlyHalf, pod: "backline" },
    { number: 23, role: ROLES.Wing, pod: "backline" },
  ] as const;

const KICKOFF_ATTACK_VARIANTS: readonly KickoffAttackFormation[] = [
  "balanced",
  "press",
  "split",
];
const KICKOFF_DEFENCE_VARIANTS: readonly KickoffDefenceFormation[] = [
  "deep",
  "pendulum",
  "splitField",
];
const OPEN_ATTACK_VARIANTS: readonly OpenAttackFormation[] = [
  "balanced",
  "tightPods",
  "wide",
];
const OPEN_DEFENCE_VARIANTS_LIST: readonly OpenDefenceFormation[] = [
  "connected",
  "narrow",
  "wide",
];
const LINEOUT_MEMBERS_LIST: readonly LineoutMembers[] = [4, 5, 6, 7];
const LINEOUT_NON_PARTICIPANTS_LIST: readonly LineoutNonParticipants[] = [
  "backline",
  "split",
  "maulDefence",
];
const SCRUM_ATTACK_VARIANTS: readonly ScrumAttackFormation[] = [
  "openSide",
  "blindSide",
  "splitBacks",
];
const SCRUM_DEFENCE_VARIANTS: readonly ScrumDefenceFormation[] = [
  "drift",
  "manOnMan",
  "blitz",
];

const pickVariant = <T>(
  defaultVal: T,
  all: readonly T[],
  variation: number,
  random: Random,
): T => {
  if (random() >= variation) return defaultVal;
  return all[Math.floor(random() * all.length)];
};

export const rollTeamFormations = (
  team: Team,
  random: Random = Math.random,
  teams: MatchConfig = TEAMS,
): ActiveTeamFormations => {
  const definition = teams[team];
  const def = definition.formations;
  const variation = definition.formationVariation;
  return {
    kickoffAttack: pickVariant(
      def.kickoffAttack,
      KICKOFF_ATTACK_VARIANTS,
      variation,
      random,
    ),
    kickoffDefence: pickVariant(
      def.kickoffDefence,
      KICKOFF_DEFENCE_VARIANTS,
      variation,
      random,
    ),
    openAttack: pickVariant(
      def.openAttack,
      OPEN_ATTACK_VARIANTS,
      variation,
      random,
    ),
    openDefence: pickVariant(
      def.openDefence,
      OPEN_DEFENCE_VARIANTS_LIST,
      variation,
      random,
    ),
    lineoutMembers: pickVariant(
      def.lineoutMembers,
      LINEOUT_MEMBERS_LIST,
      variation,
      random,
    ),
    lineoutNonParticipants: pickVariant(
      def.lineoutNonParticipants,
      LINEOUT_NON_PARTICIPANTS_LIST,
      variation,
      random,
    ),
    scrumAttack: pickVariant(
      def.scrumAttack,
      SCRUM_ATTACK_VARIANTS,
      variation,
      random,
    ),
    scrumDefence: pickVariant(
      def.scrumDefence,
      SCRUM_DEFENCE_VARIANTS,
      variation,
      random,
    ),
  };
};

export const TEAMS: Record<Team, TeamDefinition> = {
  0: {
    name: "Blue",
    color: "#1d4ed8",
    lineSpeed: 4.6,
    tendencies: { carry: 0.45, pass: 0.43, kick: 0.12, maul: 0.5 },
    formationVariation: 0.32,
    speedMultiplier: 1.02,
    weightMultiplier: 0.98,
    formations: {
      kickoffAttack: "split",
      kickoffDefence: "pendulum",
      openAttack: "wide",
      openDefence: "connected",
      lineoutMembers: 6,
      lineoutNonParticipants: "split",
      scrumAttack: "openSide",
      scrumDefence: "drift",
    },
    customFormations: {},
    defaultSkills: {
      decision: 0.84,
      handling: 0.86,
      passing: 0.84,
      kicking: 0.8,
      tackling: 0.82,
    },
    playerOverrides: {
      9: { skills: { passing: 0.92, decision: 0.9 } },
      10: { skills: { passing: 0.91, kicking: 0.9, decision: 0.91 } },
      14: { speedMultiplier: 1.06, skills: { handling: 0.9 } },
      15: { skills: { handling: 0.92, kicking: 0.88 } },
    },
  },
  1: {
    name: "Red",
    color: "#dc2626",
    lineSpeed: 4,
    tendencies: { carry: 0.57, pass: 0.28, kick: 0.15, maul: 0.65 },
    formationVariation: 0.32,
    speedMultiplier: 0.98,
    weightMultiplier: 1.04,
    formations: {
      kickoffAttack: "press",
      kickoffDefence: "deep",
      openAttack: "tightPods",
      openDefence: "narrow",
      lineoutMembers: 5,
      lineoutNonParticipants: "maulDefence",
      scrumAttack: "splitBacks",
      scrumDefence: "blitz",
    },
    customFormations: {},
    defaultSkills: {
      decision: 0.2,
      handling: 0.2,
      passing: 0.2,
      kicking: 0.2,
      tackling: 0.2,
    },
    playerOverrides: {
      6: { weightMultiplier: 1.05, skills: { tackling: 0.4 } },
      7: { skills: { tackling: 0.4 } },
      9: { skills: { kicking: 0.4, decision: 0.4 } },
      11: { speedMultiplier: 1.05 },
    },
  },
};

export const getRolePhysicals = (role: Role) => {
  if (role === ROLES.LooseHead || role === ROLES.TightHead) {
    return { weight: 118, speed: 4.2 };
  }
  if (role === ROLES.Hooker) return { weight: 108, speed: 4.5 };
  if (role === ROLES.Lock) return { weight: 115, speed: 4.4 };
  if (role === ROLES.BlindSideFlanker || role === ROLES.OpenSideFlanker) {
    return { weight: 102, speed: 5.1 };
  }
  if (role === ROLES.NumberEight) return { weight: 110, speed: 5 };
  if (role === ROLES.ScrumHalf) return { weight: 78, speed: 5.8 };
  if (role === ROLES.FlyHalf) return { weight: 85, speed: 5.4 };
  if (role === ROLES.InsideCentre || role === ROLES.OutsideCentre) {
    return { weight: 98, speed: 5.3 };
  }
  if (role === ROLES.Wing) return { weight: 88, speed: 6.2 };
  return { weight: 90, speed: 5.9 };
};

export const getPlayerProfile = (
  team: Team,
  number: number,
  role: Role,
  teams: MatchConfig = TEAMS,
) => {
  const definition = teams[team];
  const override = definition.playerOverrides[number];
  const physicals = getRolePhysicals(role);
  return {
    speed:
      physicals.speed *
      definition.speedMultiplier *
      (override?.speedMultiplier ?? 1),
    weight:
      physicals.weight *
      definition.weightMultiplier *
      (override?.weightMultiplier ?? 1),
    skills: { ...definition.defaultSkills, ...override?.skills },
  };
};

const bounded = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const cloneTeam = (team: TeamDefinition): TeamDefinition => ({
  ...team,
  tendencies: { ...team.tendencies },
  formations: { ...team.formations },
  customFormations: Object.fromEntries(
    Object.entries(team.customFormations).map(([context, positions]) => [
      context,
      positions?.map((position) => ({ ...position })),
    ]),
  ),
  defaultSkills: { ...team.defaultSkills },
  playerOverrides: Object.fromEntries(
    Object.entries(team.playerOverrides).flatMap(([number, override]) =>
      override
        ? [
            [
              number,
              {
                ...override,
                skills: override.skills ? { ...override.skills } : undefined,
              },
            ],
          ]
        : [],
    ),
  ),
});

export const createMatchConfig = (
  source: MatchConfig = TEAMS,
): MatchConfig => ({
  0: cloneTeam(source[0]),
  1: cloneTeam(source[1]),
});

export type TeamStatsInput = Partial<
  Pick<
    TeamDefinition,
    "name" | "color" | "lineSpeed" | "speedMultiplier" | "weightMultiplier"
  >
> & {
  skills?: Partial<PlayerSkills>;
  playerOverrides?: TeamDefinition["playerOverrides"] | null;
};

export type TeamTacticsInput = {
  carry?: number;
  pass?: number;
  kick?: number;
  maul?: number;
  formationVariation?: number;
  formations?: Partial<ActiveTeamFormations>;
  customFormations?: Partial<Record<FormationContext, Position[] | null>>;
};

export const setStats = (
  teams: MatchConfig,
  team: Team,
  stats: TeamStatsInput,
) => {
  const target = teams[team];
  if (stats.name !== undefined) target.name = stats.name.trim() || target.name;
  if (stats.color !== undefined && /^#[0-9a-f]{6}$/i.test(stats.color)) {
    target.color = stats.color;
  }
  if (stats.lineSpeed !== undefined)
    target.lineSpeed = bounded(stats.lineSpeed, 1, 8);
  if (stats.speedMultiplier !== undefined) {
    target.speedMultiplier = bounded(stats.speedMultiplier, 0.7, 1.3);
  }
  if (stats.weightMultiplier !== undefined) {
    target.weightMultiplier = bounded(stats.weightMultiplier, 0.7, 1.3);
  }
  if (stats.skills) {
    for (const skill of Object.keys(stats.skills) as (keyof PlayerSkills)[]) {
      const value = stats.skills[skill];
      if (value !== undefined)
        target.defaultSkills[skill] = bounded(value, 0, 1);
    }
  }
  if (stats.playerOverrides === null) {
    target.playerOverrides = {};
  } else if (stats.playerOverrides) {
    for (const [number, override] of Object.entries(stats.playerOverrides)) {
      if (!override) continue;
      const current = target.playerOverrides[Number(number)] ?? {};
      target.playerOverrides[Number(number)] = {
        ...current,
        ...override,
        skills: { ...current.skills, ...override.skills },
      };
    }
  }
  return teams;
};

export const setTactics = (
  teams: MatchConfig,
  team: Team,
  tactics: TeamTacticsInput,
) => {
  const target = teams[team];
  if (tactics.formations) {
    Object.assign(target.formations, tactics.formations);
  }
  if (tactics.customFormations) {
    for (const [context, positions] of Object.entries(
      tactics.customFormations,
    ) as [FormationContext, Position[] | null][]) {
      if (positions) {
        target.customFormations[context] = positions.map((position) => ({
          ...position,
        }));
      } else {
        delete target.customFormations[context];
      }
    }
  }
  if (tactics.formationVariation !== undefined) {
    target.formationVariation = bounded(tactics.formationVariation, 0, 1);
  }
  if (tactics.maul !== undefined)
    target.tendencies.maul = bounded(tactics.maul, 0, 1);
  if (tactics.carry !== undefined)
    target.tendencies.carry = Math.max(0, tactics.carry);
  if (tactics.pass !== undefined)
    target.tendencies.pass = Math.max(0, tactics.pass);
  if (tactics.kick !== undefined)
    target.tendencies.kick = Math.max(0, tactics.kick);
  const total =
    target.tendencies.carry + target.tendencies.pass + target.tendencies.kick;
  if (total > 0) {
    target.tendencies.carry /= total;
    target.tendencies.pass /= total;
    target.tendencies.kick /= total;
  }
  return teams;
};
