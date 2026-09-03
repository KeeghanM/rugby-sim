import {
  COACHING_COURSES,
  LEVEL_THRESHOLDS,
  MANAGER_REPUTATION_TIERS,
  type CoachingCourseId,
  type AttackStructurePreset,
  type DefenseStructurePreset,
  type SetPieceFocusPreset,
} from './constants.ts'
import type { Career, ManagerProfile, ManagerStats, PlaybookTactics } from './types.ts'

export const DEFAULT_PLAYBOOK: PlaybookTactics = {
  attackStructure: 'standard',
  defenseStructure: 'drift',
  setPieceFocus: 'balanced',
  kickPressure: 'standard',
  tempo: 'balanced',
}

export const DEFAULT_MANAGER_STATS: ManagerStats = {
  matchesManaged: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  trophiesWon: 0,
}

export function createDefaultManagerProfile(name: string): ManagerProfile {
  return {
    name: name.trim(),
    reputation: 35,
    xp: 0,
    level: 1,
    qualifications: [],
    activeCourse: null,
    playbook: { ...DEFAULT_PLAYBOOK },
    stats: { ...DEFAULT_MANAGER_STATS },
  }
}

export function getManagerLevel(xp: number): {
  level: number
  currentXp: number
  nextLevelXp: number
  progress: number
} {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    const threshold = LEVEL_THRESHOLDS[i]
    if (threshold !== undefined && xp >= threshold) {
      level = i + 1
    } else {
      break
    }
  }

  const currentLevelFloor = LEVEL_THRESHOLDS[level - 1] ?? 0
  const nextLevelFloor = LEVEL_THRESHOLDS[level] ?? currentLevelFloor + level * 500
  const diff = nextLevelFloor - currentLevelFloor
  const progress = diff > 0 ? Math.min(1, Math.max(0, (xp - currentLevelFloor) / diff)) : 1

  return {
    level,
    currentXp: xp,
    nextLevelXp: nextLevelFloor,
    progress,
  }
}

export function getManagerReputationTier(reputation: number) {
  const tier = MANAGER_REPUTATION_TIERS.find((t) => reputation >= t.min)
  return tier ?? MANAGER_REPUTATION_TIERS[MANAGER_REPUTATION_TIERS.length - 1]
}

export function getUnlockedTactics(manager: ManagerProfile) {
  const unlockedAttack = new Set<AttackStructurePreset>(['standard'])
  const unlockedDefense = new Set<DefenseStructurePreset>(['drift'])
  const unlockedSetPiece = new Set<SetPieceFocusPreset>(['balanced'])

  for (const qId of manager.qualifications) {
    const course = COACHING_COURSES[qId]
    if (!course) continue
    if (course.unlocks.attackStructures) {
      for (const s of course.unlocks.attackStructures) unlockedAttack.add(s)
    }
    if (course.unlocks.defenseStructures) {
      for (const s of course.unlocks.defenseStructures) unlockedDefense.add(s)
    }
    if (course.unlocks.setPieceFocuses) {
      for (const s of course.unlocks.setPieceFocuses) unlockedSetPiece.add(s)
    }
  }

  return {
    attackStructures: unlockedAttack,
    defenseStructures: unlockedDefense,
    setPieceFocuses: unlockedSetPiece,
  }
}

export function isTacticsUnlocked(manager: ManagerProfile, setting: keyof PlaybookTactics, value: string): boolean {
  const unlocked = getUnlockedTactics(manager)
  if (setting === 'attackStructure') {
    return unlocked.attackStructures.has(value as AttackStructurePreset)
  }
  if (setting === 'defenseStructure') {
    return unlocked.defenseStructures.has(value as DefenseStructurePreset)
  }
  if (setting === 'setPieceFocus') {
    return unlocked.setPieceFocuses.has(value as SetPieceFocusPreset)
  }
  // kickPressure and tempo are freely adjustable
  return true
}

export function getManagerPerks(manager: ManagerProfile) {
  let trainingBonusPct = 0
  let matchXpBonusPct = 0
  let disciplineBonus = 0

  for (const qId of manager.qualifications) {
    const course = COACHING_COURSES[qId]
    if (!course) continue
    if (course.unlocks.trainingBonusPct) trainingBonusPct += course.unlocks.trainingBonusPct
    if (course.unlocks.matchXpBonusPct) matchXpBonusPct += course.unlocks.matchXpBonusPct
    if (course.unlocks.disciplineBonus) disciplineBonus += course.unlocks.disciplineBonus
  }

  return {
    trainingBonusPct,
    matchXpBonusPct,
    disciplineBonus,
  }
}

export function enrollCoachingCourse(career: Career, courseId: CoachingCourseId): Career {
  const course = COACHING_COURSES[courseId]
  if (!course) throw new Error(`Unknown coaching course: ${courseId}`)

  if (career.manager.qualifications.includes(courseId)) {
    throw new Error('You already hold this coaching qualification.')
  }
  if (career.manager.activeCourse) {
    throw new Error('You are already enrolled in a coaching course. Complete it before starting another.')
  }
  if (career.manager.level < course.levelRequired) {
    throw new Error(`Requires Manager Level ${course.levelRequired} (Current Level: ${career.manager.level})`)
  }

  const club = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!club) throw new Error('Managed club not found')

  if (club.balance < course.cost) {
    throw new Error(
      `Insufficient club funds (£${club.balance.toLocaleString()} available, £${course.cost.toLocaleString()} required)`,
    )
  }

  const updatedClubs = career.season.clubs.map((c) => {
    if (c.id !== career.managedClubId) return c
    return {
      ...c,
      balance: c.balance - course.cost,
      ledger: [
        {
          id: `ledger-course-${Date.now()}`,
          round: career.currentRound,
          date: career.currentDate,
          category: 'staffRecruitment' as const,
          description: `Coaching Qualification Tuition: ${course.name}`,
          amount: -course.cost,
        },
        ...c.ledger,
      ],
    }
  })

  const updatedManager: ManagerProfile = {
    ...career.manager,
    activeCourse: {
      courseId,
      roundsRemaining: course.roundsDuration,
    },
  }

  return {
    ...career,
    season: {
      ...career.season,
      clubs: updatedClubs,
    },
    manager: updatedManager,
  }
}

export function updatePlaybookTactics(career: Career, playbookUpdates: Partial<PlaybookTactics>): Career {
  const current = career.manager.playbook
  const next: PlaybookTactics = {
    attackStructure: playbookUpdates.attackStructure ?? current.attackStructure,
    defenseStructure: playbookUpdates.defenseStructure ?? current.defenseStructure,
    setPieceFocus: playbookUpdates.setPieceFocus ?? current.setPieceFocus,
    kickPressure: playbookUpdates.kickPressure ?? current.kickPressure,
    tempo: playbookUpdates.tempo ?? current.tempo,
  }

  // Validate unlocked status
  if (
    !isTacticsUnlocked(career.manager, 'attackStructure', next.attackStructure) ||
    !isTacticsUnlocked(career.manager, 'defenseStructure', next.defenseStructure) ||
    !isTacticsUnlocked(career.manager, 'setPieceFocus', next.setPieceFocus)
  ) {
    throw new Error('Selected tactic is locked. Complete the required coaching qualification first.')
  }

  return {
    ...career,
    manager: {
      ...career.manager,
      playbook: next,
    },
  }
}
