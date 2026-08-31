import { type ActiveTeamFormations, type PlayerSkills, type Pod, type Role, ROLES, type Team } from "./domain.ts";
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

export const BENCH_SLOTS: readonly { number: number; role: Role; pod: Pod }[] = [
  { number: 16, role: ROLES.Hooker, pod: "middle" },
  { number: 17, role: ROLES.LooseHead, pod: "left" },
  { number: 18, role: ROLES.TightHead, pod: "right" },
  { number: 19, role: ROLES.Lock, pod: "left" },
  { number: 20, role: ROLES.OpenSideFlanker, pod: "right" },
  { number: 21, role: ROLES.ScrumHalf, pod: "backline" },
  { number: 22, role: ROLES.FlyHalf, pod: "backline" },
  { number: 23, role: ROLES.Wing, pod: "backline" },
] as const;

const KICKOFF_ATTACK_VARIANTS: readonly KickoffAttackFormation[] = ["balanced", "press", "split"];
const KICKOFF_DEFENCE_VARIANTS: readonly KickoffDefenceFormation[] = ["deep", "pendulum", "splitField"];
const OPEN_ATTACK_VARIANTS: readonly OpenAttackFormation[] = ["balanced", "tightPods", "wide"];
const OPEN_DEFENCE_VARIANTS_LIST: readonly OpenDefenceFormation[] = ["connected", "narrow", "wide"];
const LINEOUT_MEMBERS_LIST: readonly LineoutMembers[] = [4, 5, 6, 7];
const LINEOUT_NON_PARTICIPANTS_LIST: readonly LineoutNonParticipants[] = ["backline", "split", "maulDefence"];
const SCRUM_ATTACK_VARIANTS: readonly ScrumAttackFormation[] = ["openSide", "blindSide", "splitBacks"];
const SCRUM_DEFENCE_VARIANTS: readonly ScrumDefenceFormation[] = ["drift", "manOnMan", "blitz"];

const pickVariant = <T>(defaultVal: T, all: readonly T[], random: Random): T => {
  // 68% chance to use team default structure, 32% chance to vary tactical shape
  if (random() < 0.68) return defaultVal;
  return all[Math.floor(random() * all.length)];
};

export const rollTeamFormations = (
  team: Team,
  random: Random = Math.random,
): ActiveTeamFormations => {
  const def = TEAMS[team].formations;
  return {
    kickoffAttack: pickVariant(def.kickoffAttack, KICKOFF_ATTACK_VARIANTS, random),
    kickoffDefence: pickVariant(def.kickoffDefence, KICKOFF_DEFENCE_VARIANTS, random),
    openAttack: pickVariant(def.openAttack, OPEN_ATTACK_VARIANTS, random),
    openDefence: pickVariant(def.openDefence, OPEN_DEFENCE_VARIANTS_LIST, random),
    lineoutMembers: pickVariant(def.lineoutMembers, LINEOUT_MEMBERS_LIST, random),
    lineoutNonParticipants: pickVariant(def.lineoutNonParticipants, LINEOUT_NON_PARTICIPANTS_LIST, random),
    scrumAttack: pickVariant(def.scrumAttack, SCRUM_ATTACK_VARIANTS, random),
    scrumDefence: pickVariant(def.scrumDefence, SCRUM_DEFENCE_VARIANTS, random),
  };
};

type TeamDefinition = {
  name: string;
  color: string;
  lineSpeed: number;
  tendencies: { carry: number; pass: number; kick: number };
  speedMultiplier: number;
  weightMultiplier: number;
  formations: {
    kickoffAttack: KickoffAttackFormation;
    kickoffDefence: KickoffDefenceFormation;
    openAttack: OpenAttackFormation;
    openDefence: OpenDefenceFormation;
    lineoutMembers: LineoutMembers;
    lineoutNonParticipants: LineoutNonParticipants;
    scrumAttack: ScrumAttackFormation;
    scrumDefence: ScrumDefenceFormation;
  };
  defaultSkills: PlayerSkills;
  playerOverrides: Partial<
    Record<
      number,
      {
        speedMultiplier?: number;
        weightMultiplier?: number;
        skills?: Partial<PlayerSkills>;
      }
    >
  >;
};

export const TEAMS: Record<Team, TeamDefinition> = {
  0: {
    name: "Blue",
    color: "#1d4ed8",
    lineSpeed: 4.6,
    tendencies: { carry: 0.45, pass: 0.43, kick: 0.12 },
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
    tendencies: { carry: 0.57, pass: 0.28, kick: 0.15 },
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
    defaultSkills: {
      decision: 0.8,
      handling: 0.82,
      passing: 0.78,
      kicking: 0.84,
      tackling: 0.87,
    },
    playerOverrides: {
      6: { weightMultiplier: 1.05, skills: { tackling: 0.93 } },
      7: { skills: { tackling: 0.94 } },
      9: { skills: { kicking: 0.9, decision: 0.87 } },
      11: { speedMultiplier: 1.05 },
    },
  },
};

const rolePhysicals = (role: Role) => {
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

export const getPlayerProfile = (team: Team, number: number, role: Role) => {
  const definition = TEAMS[team];
  const override = definition.playerOverrides[number];
  const physicals = rolePhysicals(role);
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
