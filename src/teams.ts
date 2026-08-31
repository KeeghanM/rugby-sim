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
  type TacticalShape,
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

export const OPEN_ATTACK_VARIANTS: readonly OpenAttackFormation[] = [
  "balanced",
  "tightPods",
  "wide",
];
export const OPEN_DEFENCE_VARIANTS_LIST: readonly OpenDefenceFormation[] = [
  "connected",
  "narrow",
  "wide",
];
export const KICKOFF_ATTACK_VARIANTS: readonly KickoffAttackFormation[] = [
  "balanced",
  "press",
  "split",
];
export const KICKOFF_DEFENCE_VARIANTS: readonly KickoffDefenceFormation[] = [
  "deep",
  "pendulum",
  "splitField",
];
export const LINEOUT_MEMBERS_LIST: readonly LineoutMembers[] = [4, 5, 6, 7];
export const LINEOUT_NON_PARTICIPANTS_LIST: readonly LineoutNonParticipants[] =
  ["backline", "split", "maulDefence"];
export const SCRUM_ATTACK_VARIANTS: readonly ScrumAttackFormation[] = [
  "openSide",
  "blindSide",
  "splitBacks",
];
export const SCRUM_DEFENCE_VARIANTS: readonly ScrumDefenceFormation[] = [
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

export const getActiveShapePositions = (
  teamDef: TeamDefinition,
  context: FormationContext,
  random: Random = Math.random,
): readonly Position[] | undefined => {
  const shapes = teamDef.tacticalShapes?.[context];
  if (shapes && shapes.length > 0) {
    const totalWeight = shapes.reduce(
      (sum, s) => sum + Math.max(0, s.weight),
      0,
    );
    if (totalWeight > 0) {
      let r = random() * totalWeight;
      for (const s of shapes) {
        const w = Math.max(0, s.weight);
        if (r <= w) {
          return s.positions ?? undefined;
        }
        r -= w;
      }
    }
    const last = shapes[shapes.length - 1];
    return last?.positions ?? undefined;
  }
  return teamDef.customFormations[context];
};

export const rollTeamFormations = (
  team: Team,
  random: Random = Math.random,
  teams: MatchConfig = TEAMS,
): ActiveTeamFormations => {
  const definition = teams[team];
  const def = definition.formations;
  const variation = definition.formationVariation;

  let rolledOpenAttack = pickVariant(
    def.openAttack,
    OPEN_ATTACK_VARIANTS,
    variation,
    random,
  );
  const openAttackShapes = definition.tacticalShapes?.openAttack;
  if (openAttackShapes && openAttackShapes.length > 0) {
    const totalWeight = openAttackShapes.reduce(
      (sum, s) => sum + Math.max(0, s.weight),
      0,
    );
    if (totalWeight > 0) {
      let r = random() * totalWeight;
      for (const s of openAttackShapes) {
        const w = Math.max(0, s.weight);
        if (r <= w) {
          if (
            s.preset &&
            OPEN_ATTACK_VARIANTS.includes(s.preset as OpenAttackFormation)
          ) {
            rolledOpenAttack = s.preset as OpenAttackFormation;
          }
          break;
        }
        r -= w;
      }
    }
  }

  let rolledOpenDefence = pickVariant(
    def.openDefence,
    OPEN_DEFENCE_VARIANTS_LIST,
    variation,
    random,
  );
  const openDefenceShapes = definition.tacticalShapes?.openDefence;
  if (openDefenceShapes && openDefenceShapes.length > 0) {
    const totalWeight = openDefenceShapes.reduce(
      (sum, s) => sum + Math.max(0, s.weight),
      0,
    );
    if (totalWeight > 0) {
      let r = random() * totalWeight;
      for (const s of openDefenceShapes) {
        const w = Math.max(0, s.weight);
        if (r <= w) {
          if (
            s.preset &&
            OPEN_DEFENCE_VARIANTS_LIST.includes(
              s.preset as OpenDefenceFormation,
            )
          ) {
            rolledOpenDefence = s.preset as OpenDefenceFormation;
          }
          break;
        }
        r -= w;
      }
    }
  }

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
    openAttack: rolledOpenAttack,
    openDefence: rolledOpenDefence,
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

export const INTERNATIONAL_PRESETS: Record<string, TeamDefinition> = {
  nz: {
    name: "New Zealand",
    color: "#18181b",
    lineSpeed: 4.6,
    tendencies: { carry: 0.44, pass: 0.44, kick: 0.12, maul: 0.4 },
    formationVariation: 0.32,
    speedMultiplier: 1.04,
    weightMultiplier: 0.99,
    formations: {
      kickoffAttack: "split",
      kickoffDefence: "pendulum",
      openAttack: "wide",
      openDefence: "connected",
      lineoutMembers: 6,
      lineoutNonParticipants: "split",
      scrumAttack: "splitBacks",
      scrumDefence: "drift",
    },
    customFormations: {},
    tacticalShapes: {
      openAttack: [
        {
          id: "nz-atk-1",
          name: "Black Wave (Wide)",
          weight: 60,
          preset: "wide",
        },
        {
          id: "nz-atk-2",
          name: "Counter Strike",
          weight: 40,
          preset: "balanced",
        },
      ],
      openDefence: [
        {
          id: "nz-def-1",
          name: "Connected Drift",
          weight: 70,
          preset: "connected",
        },
        { id: "nz-def-2", name: "Wide Screen", weight: 30, preset: "wide" },
      ],
    },
    defaultSkills: {
      decision: 0.89,
      handling: 0.91,
      passing: 0.9,
      kicking: 0.86,
      tackling: 0.85,
    },
    playerOverrides: {
      4: { skills: { tackling: 0.91, handling: 0.88 } },
      7: {
        speedMultiplier: 1.04,
        weightMultiplier: 1.03,
        skills: { tackling: 0.93, handling: 0.91 },
      },
      9: { skills: { passing: 0.96, decision: 0.93 } },
      10: { skills: { passing: 0.94, kicking: 0.92, decision: 0.93 } },
      11: { speedMultiplier: 1.08, skills: { handling: 0.93 } },
      14: { speedMultiplier: 1.09, skills: { handling: 0.94, decision: 0.9 } },
      15: { speedMultiplier: 1.06, skills: { kicking: 0.91, handling: 0.93 } },
    },
  },
  sa: {
    name: "South Africa",
    color: "#14532d",
    lineSpeed: 5.0,
    tendencies: { carry: 0.53, pass: 0.27, kick: 0.2, maul: 0.8 },
    formationVariation: 0.24,
    speedMultiplier: 1.01,
    weightMultiplier: 1.08,
    formations: {
      kickoffAttack: "press",
      kickoffDefence: "deep",
      openAttack: "tightPods",
      openDefence: "narrow",
      lineoutMembers: 7,
      lineoutNonParticipants: "maulDefence",
      scrumAttack: "openSide",
      scrumDefence: "blitz",
    },
    customFormations: {},
    tacticalShapes: {
      openAttack: [
        {
          id: "sa-atk-1",
          name: "Bomb Squad Pods",
          weight: 65,
          preset: "tightPods",
        },
        {
          id: "sa-atk-2",
          name: "Kolbe Wide Strike",
          weight: 35,
          preset: "wide",
        },
      ],
      openDefence: [
        {
          id: "sa-def-1",
          name: "Springbok Blitz",
          weight: 75,
          preset: "narrow",
        },
        {
          id: "sa-def-2",
          name: "Connected Wall",
          weight: 25,
          preset: "connected",
        },
      ],
    },
    defaultSkills: {
      decision: 0.85,
      handling: 0.83,
      passing: 0.8,
      kicking: 0.88,
      tackling: 0.93,
    },
    playerOverrides: {
      1: { weightMultiplier: 1.12, skills: { tackling: 0.91 } },
      2: { weightMultiplier: 1.07, skills: { tackling: 0.92, handling: 0.86 } },
      3: { weightMultiplier: 1.15, skills: { tackling: 0.9 } },
      4: { weightMultiplier: 1.1, skills: { tackling: 0.96, decision: 0.88 } },
      7: { skills: { tackling: 0.96, decision: 0.9 } },
      10: { skills: { kicking: 0.95, decision: 0.92, passing: 0.86 } },
      11: { speedMultiplier: 1.12, skills: { handling: 0.94, kicking: 0.88 } },
      14: { speedMultiplier: 1.11, skills: { handling: 0.92 } },
    },
  },
  ire: {
    name: "Ireland",
    color: "#15803d",
    lineSpeed: 4.7,
    tendencies: { carry: 0.46, pass: 0.42, kick: 0.12, maul: 0.5 },
    formationVariation: 0.2,
    speedMultiplier: 1.01,
    weightMultiplier: 1.02,
    formations: {
      kickoffAttack: "split",
      kickoffDefence: "pendulum",
      openAttack: "tightPods",
      openDefence: "connected",
      lineoutMembers: 6,
      lineoutNonParticipants: "split",
      scrumAttack: "openSide",
      scrumDefence: "drift",
    },
    customFormations: {},
    tacticalShapes: {
      openAttack: [
        {
          id: "ire-atk-1",
          name: "1-3-3-1 Green Pods",
          weight: 70,
          preset: "tightPods",
        },
        {
          id: "ire-atk-2",
          name: "Backline Sweep",
          weight: 30,
          preset: "balanced",
        },
      ],
      openDefence: [
        {
          id: "ire-def-1",
          name: "Connected Pressure",
          weight: 80,
          preset: "connected",
        },
        { id: "ire-def-2", name: "Choke Tackle", weight: 20, preset: "narrow" },
      ],
    },
    defaultSkills: {
      decision: 0.91,
      handling: 0.9,
      passing: 0.89,
      kicking: 0.86,
      tackling: 0.88,
    },
    playerOverrides: {
      1: { weightMultiplier: 1.08, skills: { tackling: 0.91 } },
      2: { speedMultiplier: 1.05, skills: { handling: 0.9, tackling: 0.89 } },
      8: { skills: { decision: 0.93, handling: 0.91, tackling: 0.92 } },
      9: { speedMultiplier: 1.04, skills: { passing: 0.95, decision: 0.94 } },
      10: { skills: { decision: 0.94, passing: 0.92, kicking: 0.91 } },
      12: { weightMultiplier: 1.06, skills: { handling: 0.9, tackling: 0.92 } },
      15: { skills: { handling: 0.93, kicking: 0.89, decision: 0.92 } },
    },
  },
  fra: {
    name: "France",
    color: "#1e40af",
    lineSpeed: 4.6,
    tendencies: { carry: 0.48, pass: 0.36, kick: 0.16, maul: 0.58 },
    formationVariation: 0.3,
    speedMultiplier: 1.03,
    weightMultiplier: 1.07,
    formations: {
      kickoffAttack: "split",
      kickoffDefence: "splitField",
      openAttack: "wide",
      openDefence: "connected",
      lineoutMembers: 6,
      lineoutNonParticipants: "split",
      scrumAttack: "openSide",
      scrumDefence: "drift",
    },
    customFormations: {},
    tacticalShapes: {
      openAttack: [
        { id: "fra-atk-1", name: "French Flair", weight: 60, preset: "wide" },
        {
          id: "fra-atk-2",
          name: "Dupont Power Pod",
          weight: 40,
          preset: "tightPods",
        },
      ],
      openDefence: [
        {
          id: "fra-def-1",
          name: "Rush & Drift",
          weight: 65,
          preset: "connected",
        },
        { id: "fra-def-2", name: "Heavy Blitz", weight: 35, preset: "narrow" },
      ],
    },
    defaultSkills: {
      decision: 0.88,
      handling: 0.89,
      passing: 0.88,
      kicking: 0.88,
      tackling: 0.88,
    },
    playerOverrides: {
      3: { weightMultiplier: 1.25, skills: { tackling: 0.88 } },
      8: { skills: { decision: 0.92, tackling: 0.93, handling: 0.89 } },
      9: {
        speedMultiplier: 1.08,
        weightMultiplier: 1.05,
        skills: { passing: 0.97, decision: 0.96, kicking: 0.93, tackling: 0.9 },
      },
      10: { skills: { passing: 0.93, decision: 0.91, kicking: 0.9 } },
      14: { speedMultiplier: 1.08, skills: { handling: 0.95, decision: 0.9 } },
      15: { skills: { kicking: 0.96, passing: 0.9, decision: 0.91 } },
    },
  },
  eng: {
    name: "England",
    color: "#f8fafc",
    lineSpeed: 4.8,
    tendencies: { carry: 0.48, pass: 0.32, kick: 0.2, maul: 0.65 },
    formationVariation: 0.26,
    speedMultiplier: 1.0,
    weightMultiplier: 1.04,
    formations: {
      kickoffAttack: "press",
      kickoffDefence: "deep",
      openAttack: "balanced",
      openDefence: "narrow",
      lineoutMembers: 6,
      lineoutNonParticipants: "maulDefence",
      scrumAttack: "openSide",
      scrumDefence: "blitz",
    },
    customFormations: {},
    tacticalShapes: {
      openAttack: [
        {
          id: "eng-atk-1",
          name: "Direct Power Strike",
          weight: 55,
          preset: "tightPods",
        },
        {
          id: "eng-atk-2",
          name: "Kicking Chase Line",
          weight: 45,
          preset: "balanced",
        },
      ],
      openDefence: [
        { id: "eng-def-1", name: "Felix Blitz", weight: 75, preset: "narrow" },
        {
          id: "eng-def-2",
          name: "Connected Line",
          weight: 25,
          preset: "connected",
        },
      ],
    },
    defaultSkills: {
      decision: 0.84,
      handling: 0.83,
      passing: 0.82,
      kicking: 0.89,
      tackling: 0.88,
    },
    playerOverrides: {
      4: { skills: { tackling: 0.94, decision: 0.89, handling: 0.85 } },
      7: { skills: { tackling: 0.94 } },
      8: { speedMultiplier: 1.06, skills: { handling: 0.88, tackling: 0.9 } },
      10: { skills: { kicking: 0.94, passing: 0.92, decision: 0.91 } },
      11: { speedMultiplier: 1.08, weightMultiplier: 1.04 },
    },
  },
  sco: {
    name: "Scotland",
    color: "#1e3a8a",
    lineSpeed: 4.4,
    tendencies: { carry: 0.38, pass: 0.5, kick: 0.12, maul: 0.35 },
    formationVariation: 0.32,
    speedMultiplier: 1.03,
    weightMultiplier: 0.98,
    formations: {
      kickoffAttack: "split",
      kickoffDefence: "splitField",
      openAttack: "wide",
      openDefence: "wide",
      lineoutMembers: 5,
      lineoutNonParticipants: "backline",
      scrumAttack: "openSide",
      scrumDefence: "drift",
    },
    customFormations: {},
    tacticalShapes: {
      openAttack: [
        {
          id: "sco-atk-1",
          name: "Finn Russell Wide Magic",
          weight: 75,
          preset: "wide",
        },
        {
          id: "sco-atk-2",
          name: "Fast Phase Strike",
          weight: 25,
          preset: "balanced",
        },
      ],
      openDefence: [
        {
          id: "sco-def-1",
          name: "Expansive Spread",
          weight: 65,
          preset: "wide",
        },
        {
          id: "sco-def-2",
          name: "Connected Drift",
          weight: 35,
          preset: "connected",
        },
      ],
    },
    defaultSkills: {
      decision: 0.86,
      handling: 0.9,
      passing: 0.92,
      kicking: 0.86,
      tackling: 0.82,
    },
    playerOverrides: {
      7: { skills: { tackling: 0.9, decision: 0.86 } },
      9: { skills: { passing: 0.92, decision: 0.88 } },
      10: {
        skills: {
          passing: 0.97,
          decision: 0.94,
          kicking: 0.92,
          handling: 0.93,
        },
      },
      11: {
        speedMultiplier: 1.09,
        weightMultiplier: 1.1,
        skills: { handling: 0.88 },
      },
      13: { speedMultiplier: 1.05, skills: { handling: 0.92, passing: 0.88 } },
      15: { speedMultiplier: 1.06, skills: { kicking: 0.88, handling: 0.9 } },
    },
  },
  aus: {
    name: "Australia",
    color: "#d97706",
    lineSpeed: 4.4,
    tendencies: { carry: 0.46, pass: 0.41, kick: 0.13, maul: 0.45 },
    formationVariation: 0.3,
    speedMultiplier: 1.02,
    weightMultiplier: 1.0,
    formations: {
      kickoffAttack: "balanced",
      kickoffDefence: "pendulum",
      openAttack: "balanced",
      openDefence: "connected",
      lineoutMembers: 6,
      lineoutNonParticipants: "split",
      scrumAttack: "openSide",
      scrumDefence: "drift",
    },
    customFormations: {},
    tacticalShapes: {
      openAttack: [
        {
          id: "aus-atk-1",
          name: "Gold Flat Sweep",
          weight: 60,
          preset: "balanced",
        },
        {
          id: "aus-atk-2",
          name: "Wide Running Line",
          weight: 40,
          preset: "wide",
        },
      ],
      openDefence: [
        {
          id: "aus-def-1",
          name: "Connected Drift",
          weight: 70,
          preset: "connected",
        },
        { id: "aus-def-2", name: "Press Edge", weight: 30, preset: "wide" },
      ],
    },
    defaultSkills: {
      decision: 0.83,
      handling: 0.86,
      passing: 0.85,
      kicking: 0.83,
      tackling: 0.83,
    },
    playerOverrides: {
      7: { skills: { tackling: 0.91, decision: 0.86 } },
      8: { weightMultiplier: 1.08, skills: { tackling: 0.92, handling: 0.86 } },
      10: { skills: { passing: 0.88, kicking: 0.86, decision: 0.85 } },
      14: { speedMultiplier: 1.06, skills: { handling: 0.89 } },
      15: { speedMultiplier: 1.07, skills: { handling: 0.9, decision: 0.84 } },
    },
  },
  arg: {
    name: "Argentina",
    color: "#38bdf8",
    lineSpeed: 4.6,
    tendencies: { carry: 0.5, pass: 0.32, kick: 0.18, maul: 0.7 },
    formationVariation: 0.28,
    speedMultiplier: 1.01,
    weightMultiplier: 1.05,
    formations: {
      kickoffAttack: "press",
      kickoffDefence: "deep",
      openAttack: "tightPods",
      openDefence: "narrow",
      lineoutMembers: 6,
      lineoutNonParticipants: "maulDefence",
      scrumAttack: "openSide",
      scrumDefence: "blitz",
    },
    customFormations: {},
    tacticalShapes: {
      openAttack: [
        {
          id: "arg-atk-1",
          name: "Puma Forward Crush",
          weight: 65,
          preset: "tightPods",
        },
        {
          id: "arg-atk-2",
          name: "Carreras Counter",
          weight: 35,
          preset: "balanced",
        },
      ],
      openDefence: [
        {
          id: "arg-def-1",
          name: "Fierce Breakdown Blitz",
          weight: 70,
          preset: "narrow",
        },
        {
          id: "arg-def-2",
          name: "Connected Line",
          weight: 30,
          preset: "connected",
        },
      ],
    },
    defaultSkills: {
      decision: 0.83,
      handling: 0.84,
      passing: 0.82,
      kicking: 0.87,
      tackling: 0.89,
    },
    playerOverrides: {
      2: { weightMultiplier: 1.06, skills: { tackling: 0.92, decision: 0.87 } },
      6: { weightMultiplier: 1.06, skills: { tackling: 0.93, handling: 0.86 } },
      7: { weightMultiplier: 1.09, skills: { tackling: 0.95, decision: 0.84 } },
      10: {
        speedMultiplier: 1.06,
        skills: { decision: 0.88, passing: 0.87, kicking: 0.88 },
      },
      11: { speedMultiplier: 1.1, skills: { handling: 0.9 } },
      15: { skills: { kicking: 0.95, handling: 0.89, decision: 0.86 } },
    },
  },
  wal: {
    name: "Wales",
    color: "#b91c1c",
    lineSpeed: 4.5,
    tendencies: { carry: 0.46, pass: 0.36, kick: 0.18, maul: 0.55 },
    formationVariation: 0.25,
    speedMultiplier: 1.0,
    weightMultiplier: 1.01,
    formations: {
      kickoffAttack: "balanced",
      kickoffDefence: "deep",
      openAttack: "balanced",
      openDefence: "connected",
      lineoutMembers: 6,
      lineoutNonParticipants: "maulDefence",
      scrumAttack: "openSide",
      scrumDefence: "drift",
    },
    customFormations: {},
    tacticalShapes: {
      openAttack: [
        {
          id: "wal-atk-1",
          name: "Structured Pods",
          weight: 60,
          preset: "balanced",
        },
        { id: "wal-atk-2", name: "Dragon Strike", weight: 40, preset: "wide" },
      ],
      openDefence: [
        { id: "wal-def-1", name: "Red Wall", weight: 75, preset: "connected" },
        { id: "wal-def-2", name: "Choke Tackle", weight: 25, preset: "narrow" },
      ],
    },
    defaultSkills: {
      decision: 0.82,
      handling: 0.83,
      passing: 0.83,
      kicking: 0.85,
      tackling: 0.86,
    },
    playerOverrides: {
      7: { skills: { tackling: 0.93, decision: 0.88 } },
      10: { skills: { kicking: 0.88, passing: 0.86, decision: 0.85 } },
      11: { speedMultiplier: 1.08, skills: { handling: 0.87 } },
      15: { skills: { handling: 0.88, decision: 0.85 } },
    },
  },
  ita: {
    name: "Italy",
    color: "#2563eb",
    lineSpeed: 4.5,
    tendencies: { carry: 0.42, pass: 0.46, kick: 0.12, maul: 0.4 },
    formationVariation: 0.32,
    speedMultiplier: 1.03,
    weightMultiplier: 0.99,
    formations: {
      kickoffAttack: "split",
      kickoffDefence: "pendulum",
      openAttack: "wide",
      openDefence: "connected",
      lineoutMembers: 5,
      lineoutNonParticipants: "split",
      scrumAttack: "openSide",
      scrumDefence: "drift",
    },
    customFormations: {},
    tacticalShapes: {
      openAttack: [
        {
          id: "ita-atk-1",
          name: "Capuozzo Expansive Strike",
          weight: 65,
          preset: "wide",
        },
        {
          id: "ita-atk-2",
          name: "Azzurri Fast Tempo",
          weight: 35,
          preset: "balanced",
        },
      ],
      openDefence: [
        {
          id: "ita-def-1",
          name: "Connected Pressure",
          weight: 70,
          preset: "connected",
        },
        { id: "ita-def-2", name: "Wide Screen", weight: 30, preset: "wide" },
      ],
    },
    defaultSkills: {
      decision: 0.83,
      handling: 0.87,
      passing: 0.86,
      kicking: 0.84,
      tackling: 0.83,
    },
    playerOverrides: {
      8: { skills: { tackling: 0.88, handling: 0.85 } },
      9: { skills: { passing: 0.89, decision: 0.85 } },
      10: { skills: { passing: 0.91, decision: 0.89, kicking: 0.87 } },
      12: {
        speedMultiplier: 1.06,
        weightMultiplier: 1.04,
        skills: { tackling: 0.9, handling: 0.89 },
      },
      13: { skills: { passing: 0.88, decision: 0.88, tackling: 0.87 } },
      15: {
        speedMultiplier: 1.12,
        weightMultiplier: 0.92,
        skills: { handling: 0.94, decision: 0.88 },
      },
    },
  },
};

export const TEAMS: Record<Team, TeamDefinition> = {
  0: INTERNATIONAL_PRESETS.ire,
  1: INTERNATIONAL_PRESETS.fra,
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

export const cloneTeam = (team: TeamDefinition): TeamDefinition => ({
  ...team,
  tendencies: { ...team.tendencies },
  formations: { ...team.formations },
  customFormations: Object.fromEntries(
    Object.entries(team.customFormations).map(([context, positions]) => [
      context,
      positions?.map((position) => ({ ...position })),
    ]),
  ),
  tacticalShapes: Object.fromEntries(
    Object.entries(team.tacticalShapes ?? {}).map(([context, shapes]) => [
      context,
      shapes?.map((shape) => ({
        ...shape,
        positions: shape.positions?.map((position) => ({ ...position })),
      })),
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

export const loadPreset = (
  teams: MatchConfig,
  team: Team,
  presetKey: string,
) => {
  const preset = INTERNATIONAL_PRESETS[presetKey];
  if (!preset) return teams;
  teams[team] = cloneTeam(preset);
  return teams;
};

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
  tacticalShapes?: Partial<Record<FormationContext, TacticalShape[]>>;
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
  if (tactics.tacticalShapes) {
    if (!target.tacticalShapes) target.tacticalShapes = {};
    for (const [context, shapes] of Object.entries(tactics.tacticalShapes) as [
      FormationContext,
      TacticalShape[],
    ][]) {
      target.tacticalShapes[context] = shapes.map((shape) => ({
        ...shape,
        positions: shape.positions?.map((p) => ({ ...p })),
      }));
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
