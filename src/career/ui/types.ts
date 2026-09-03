export const views = {
  home: 'Club Office',
  selection: 'Team Sheet',
  training: 'Training',
  manager: 'Manager & Playbook',
  transfers: 'Transfers & Scouting',
  staff: 'Staff & Facilities',
  finances: 'Finances',
  inbox: 'Inbox',
  squad: 'Squad',
  league: 'League',
  fixtures: 'Fixtures',
} as const

export type CareerView = keyof typeof views

export const SLOT_NAMES = [
  'Loosehead Prop',
  'Hooker',
  'Tighthead Prop',
  'Lock (4)',
  'Lock (5)',
  'Blindside Flanker',
  'Openside Flanker',
  'Number Eight',
  'Scrum Half',
  'Fly Half',
  'Left Wing',
  'Inside Centre',
  'Outside Centre',
  'Right Wing',
  'Full Back',
  'Reserve Hooker',
  'Reserve Loosehead Prop',
  'Reserve Tighthead Prop',
  'Reserve Lock',
  'Reserve Back Row',
  'Reserve Scrum Half',
  'Reserve Fly Half',
  'Reserve Outside Back',
] as const

export const checkpointLabels = {
  monday: 'Monday planning',
  thursday: 'Thursday selection',
  matchDay: 'Match day',
  postMatch: 'Post-match review',
  seasonEnd: 'Season complete',
} as const

export const advanceLabels = {
  monday: 'Advance to Thursday',
  thursday: 'Advance to match day',
  matchDay: 'Simulate round',
  postMatch: 'Start next week',
  seasonEnd: 'Season complete',
} as const

export type SimulationProgress = {
  round: number
  percent: number
  fixtureText: string
  results: Array<{ homeName: string; awayName: string; score: string }>
}

export type TransfersSubTab = 'freeAgents' | 'squadContracts' | 'leagueMarket' | 'academy'
