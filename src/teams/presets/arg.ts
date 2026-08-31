import type { TeamDefinition } from "../../domain.ts";

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
