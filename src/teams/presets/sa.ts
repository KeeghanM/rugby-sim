import type { TeamDefinition } from "../../domain.ts";

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
