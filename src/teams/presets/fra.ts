import type { TeamDefinition } from "../../domain.ts";

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
