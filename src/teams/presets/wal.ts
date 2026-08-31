import type { TeamDefinition } from "../../domain.ts";

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
