import type { TeamDefinition } from "../../domain.ts";

export const nz: TeamDefinition = {
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
      { id: "nz-atk-1", name: "Black Wave (Wide)", weight: 60, preset: "wide" },
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
};

export const sa: TeamDefinition = {
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
      { id: "sa-atk-2", name: "Kolbe Wide Strike", weight: 35, preset: "wide" },
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
};

export const aus: TeamDefinition = {
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
};

export const arg: TeamDefinition = {
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
};
