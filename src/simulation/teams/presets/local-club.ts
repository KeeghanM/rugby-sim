import type { TeamDefinition } from '../../domain.ts'

export const localClub: TeamDefinition = {
  name: 'Northern RFC',
  color: '#831843',
  lineSpeed: 3.5,
  tendencies: { carry: 0.58, pass: 0.24, kick: 0.18, maul: 0.75 },
  formationVariation: 0.15,
  speedMultiplier: 0.88,
  weightMultiplier: 0.98,
  formations: {
    kickoffAttack: 'balanced',
    kickoffDefence: 'deep',
    openAttack: 'tightPods',
    openDefence: 'connected',
    lineoutMembers: 6,
    lineoutNonParticipants: 'maulDefence',
    scrumAttack: 'openSide',
    scrumDefence: 'drift',
  },
  customFormations: {},
  tacticalShapes: {
    openAttack: [
      {
        id: 'club-atk-1',
        name: 'Prop Smash & Forward Pods',
        weight: 70,
        preset: 'tightPods',
      },
      {
        id: 'club-atk-2',
        name: 'Boot It Down Touch',
        weight: 30,
        preset: 'balanced',
      },
    ],
    openDefence: [
      {
        id: 'club-def-1',
        name: 'Local Club Wall',
        weight: 70,
        preset: 'connected',
      },
      {
        id: 'club-def-2',
        name: 'Drift & Scramble',
        weight: 30,
        preset: 'wide',
      },
    ],
  },
  defaultSkills: {
    decision: 0.58,
    handling: 0.54,
    passing: 0.58,
    kicking: 0.52,
    tackling: 0.66,
  },
  playerOverrides: {
    1: {
      weightMultiplier: 1.12,
      speedMultiplier: 0.82,
      skills: { tackling: 0.72, passing: 0.38 },
    },
    2: {
      weightMultiplier: 1.04,
      skills: { tackling: 0.7, handling: 0.52 },
    },
    3: {
      weightMultiplier: 1.18,
      speedMultiplier: 0.78,
      skills: { tackling: 0.74, passing: 0.32 },
    },
    4: {
      weightMultiplier: 1.06,
      skills: { tackling: 0.72 },
    },
    7: {
      speedMultiplier: 0.95,
      skills: { tackling: 0.76, decision: 0.6 },
    },
    9: {
      speedMultiplier: 0.96,
      skills: { passing: 0.68, decision: 0.62 },
    },
    10: {
      skills: { kicking: 0.78, decision: 0.64, passing: 0.66 },
    },
    11: {
      speedMultiplier: 1.02,
      skills: { handling: 0.56 },
    },
    14: {
      speedMultiplier: 1.0,
      skills: { handling: 0.54 },
    },
  },
}
