import type { TeamDefinition } from '../../domain.ts'
import { arg } from './arg.ts'
import { aus } from './aus.ts'
import { eng } from './eng.ts'
import { fra } from './fra.ts'
import { ire } from './ire.ts'
import { ita } from './ita.ts'
import { localClub } from './local-club.ts'
import { nz } from './nz.ts'
import { sa } from './sa.ts'
import { sco } from './sco.ts'
import { wal } from './wal.ts'

export const INTERNATIONAL_PRESETS: Record<string, TeamDefinition> = {
  nz,
  sa,
  ire,
  fra,
  eng,
  sco,
  aus,
  arg,
  wal,
  ita,
  local: localClub,
}

export const TEAMS: Record<0 | 1, TeamDefinition> = {
  0: INTERNATIONAL_PRESETS.ire,
  1: INTERNATIONAL_PRESETS.fra,
}
