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
