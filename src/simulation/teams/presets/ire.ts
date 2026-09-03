import type { TeamDefinition } from '../../domain.ts'

export const ire: TeamDefinition = {
  name: 'Ireland',
  color: '#15803d',
  lineSpeed: 4.7,
  tendencies: { carry: 0.46, pass: 0.42, kick: 0.12, maul: 0.5 },
  formationVariation: 0.2,
  speedMultiplier: 1.01,
  weightMultiplier: 1.02,
  formations: {
    kickoffAttack: 'split',
    kickoffDefence: 'pendulum',
    openAttack: 'tightPods',
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
        id: 'ire-atk-1',
        name: '1-3-3-1 Green Pods',
        weight: 70,
        preset: 'tightPods',
      },
      {
        id: 'ire-atk-2',
        name: 'Backline Sweep',
        weight: 30,
        preset: 'balanced',
      },
    ],
    openDefence: [
      {
        id: 'ire-def-1',
        name: 'Connected Pressure',
        weight: 80,
        preset: 'connected',
      },
      { id: 'ire-def-2', name: 'Choke Tackle', weight: 20, preset: 'narrow' },
    ],
  },
  defaultSkills: {
    decision: 0.91,
    handling: 0.9,
    passing: 0.89,
    kicking: 0.86,
    tackling: 0.88,
  },
  playerOverrides: {
    1: { weightMultiplier: 1.08, skills: { tackling: 0.91 } },
    2: { speedMultiplier: 1.05, skills: { handling: 0.9, tackling: 0.89 } },
    8: { skills: { decision: 0.93, handling: 0.91, tackling: 0.92 } },
    9: { speedMultiplier: 1.04, skills: { passing: 0.95, decision: 0.94 } },
    10: { skills: { decision: 0.94, passing: 0.92, kicking: 0.91 } },
    12: { weightMultiplier: 1.06, skills: { handling: 0.9, tackling: 0.92 } },
    15: { skills: { handling: 0.93, kicking: 0.89, decision: 0.92 } },
  },
}
