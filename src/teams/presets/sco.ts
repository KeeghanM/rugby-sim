import type { TeamDefinition } from "../../domain.ts";

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
