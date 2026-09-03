import type { TeamDefinition } from '../../domain.ts'

export const eng: TeamDefinition = {
  name: 'England',
  color: '#f8fafc',
  lineSpeed: 4.8,
  tendencies: { carry: 0.48, pass: 0.32, kick: 0.2, maul: 0.65 },
  formationVariation: 0.26,
  speedMultiplier: 1.0,
  weightMultiplier: 1.04,
  formations: {
    kickoffAttack: 'press',
    kickoffDefence: 'deep',
    openAttack: 'balanced',
    openDefence: 'narrow',
    lineoutMembers: 6,
    lineoutNonParticipants: 'maulDefence',
    scrumAttack: 'openSide',
    scrumDefence: 'blitz',
  },
  customFormations: {},
  tacticalShapes: {
    openAttack: [
      {
        id: 'eng-atk-1',
        name: 'Direct Power Strike',
        weight: 55,
        preset: 'tightPods',
      },
      {
        id: 'eng-atk-2',
        name: 'Kicking Chase Line',
        weight: 45,
        preset: 'balanced',
      },
    ],
    openDefence: [
      { id: 'eng-def-1', name: 'Felix Blitz', weight: 75, preset: 'narrow' },
      {
        id: 'eng-def-2',
        name: 'Connected Line',
        weight: 25,
        preset: 'connected',
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
}
