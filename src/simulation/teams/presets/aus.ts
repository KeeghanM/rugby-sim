import type { TeamDefinition } from '../../domain.ts'

export const aus: TeamDefinition = {
  name: 'Australia',
  color: '#d97706',
  lineSpeed: 4.4,
  tendencies: { carry: 0.46, pass: 0.41, kick: 0.13, maul: 0.45 },
  formationVariation: 0.3,
  speedMultiplier: 1.02,
  weightMultiplier: 1.0,
  formations: {
    kickoffAttack: 'balanced',
    kickoffDefence: 'pendulum',
    openAttack: 'balanced',
    openDefence: 'connected',
    lineoutMembers: 6,
    lineoutNonParticipants: 'split',
    scrumAttack: 'openSide',
    scrumDefence: 'drift',
  },
  customFormations: {},
  tacticalShapes: {
    openAttack: [
      {
        id: 'aus-atk-1',
        name: 'Gold Flat Sweep',
        weight: 60,
        preset: 'balanced',
      },
      {
        id: 'aus-atk-2',
        name: 'Wide Running Line',
        weight: 40,
        preset: 'wide',
      },
    ],
    openDefence: [
      {
        id: 'aus-def-1',
        name: 'Connected Drift',
        weight: 70,
        preset: 'connected',
      },
      { id: 'aus-def-2', name: 'Press Edge', weight: 30, preset: 'wide' },
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
}
