import type { Pod, Role } from '../domain.ts'

export type Slot = { role: Role; pod: Pod; x: number; z: number }

export type KickoffAttackFormation = 'balanced' | 'press' | 'split'
export type KickoffDefenceFormation = 'deep' | 'pendulum' | 'splitField'
export type OpenAttackFormation = 'balanced' | 'tightPods' | 'wide'
export type OpenDefenceFormation = 'connected' | 'narrow' | 'wide'
export type LineoutMembers = 4 | 5 | 6 | 7
export type LineoutNonParticipants = 'backline' | 'split' | 'maulDefence'
export type ScrumAttackFormation = 'openSide' | 'blindSide' | 'splitBacks'
export type ScrumDefenceFormation = 'drift' | 'manOnMan' | 'blitz'
