import type { TeamDefinition } from "../../domain.ts";

export const ire: TeamDefinition = {
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
};

export const fra: TeamDefinition = {
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
};

export const eng: TeamDefinition = {
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
};

export const sco: TeamDefinition = {
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
};

export const wal: TeamDefinition = {
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
};

export const ita: TeamDefinition = {
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
};
