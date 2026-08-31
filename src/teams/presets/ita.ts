import type { TeamDefinition } from "../../domain.ts";

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
