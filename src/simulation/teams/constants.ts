import { ROLES, type Pod, type Role } from '../domain.ts'
import type {
  KickoffAttackFormation,
  KickoffDefenceFormation,
  LineoutMembers,
  LineoutNonParticipants,
  OpenAttackFormation,
  OpenDefenceFormation,
  ScrumAttackFormation,
  ScrumDefenceFormation,
} from '../formations.ts'

export const BENCH_SLOTS: readonly { number: number; role: Role; pod: Pod }[] = [
  { number: 16, role: ROLES.Hooker, pod: 'middle' },
  { number: 17, role: ROLES.LooseHead, pod: 'left' },
  { number: 18, role: ROLES.TightHead, pod: 'right' },
  { number: 19, role: ROLES.Lock, pod: 'left' },
  { number: 20, role: ROLES.OpenSideFlanker, pod: 'right' },
  { number: 21, role: ROLES.ScrumHalf, pod: 'backline' },
  { number: 22, role: ROLES.FlyHalf, pod: 'backline' },
  { number: 23, role: ROLES.Wing, pod: 'backline' },
] as const

export const OPEN_ATTACK_VARIANTS: readonly OpenAttackFormation[] = ['balanced', 'tightPods', 'wide']
export const OPEN_DEFENCE_VARIANTS_LIST: readonly OpenDefenceFormation[] = ['connected', 'narrow', 'wide']
export const KICKOFF_ATTACK_VARIANTS: readonly KickoffAttackFormation[] = ['balanced', 'press', 'split']
export const KICKOFF_DEFENCE_VARIANTS: readonly KickoffDefenceFormation[] = ['deep', 'pendulum', 'splitField']
export const LINEOUT_MEMBERS_LIST: readonly LineoutMembers[] = [4, 5, 6, 7]
export const LINEOUT_NON_PARTICIPANTS_LIST: readonly LineoutNonParticipants[] = ['backline', 'split', 'maulDefence']
export const SCRUM_ATTACK_VARIANTS: readonly ScrumAttackFormation[] = ['openSide', 'blindSide', 'splitBacks']
export const SCRUM_DEFENCE_VARIANTS: readonly ScrumDefenceFormation[] = ['drift', 'manOnMan', 'blitz']
