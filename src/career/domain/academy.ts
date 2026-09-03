import { FIRST_NAMES, LAST_NAMES, type PlayerRole } from './constants.ts'
import { createInitialCareerRecord, generatePlayerStats } from './generators.ts'
import { calculatePlayerMarketValue } from './transfers.ts'
import type { Career, Club, InboxMessage, Player } from './types.ts'

export function generateYouthIntake(club: Club, year: number, count = 6): Player[] {
  const academyLvl = club.facilities.academy ?? 1
  const dir = club.staff.find((s) => s.role === 'academyDirector')
  const dirLvl = dir?.level ?? 1

  const sampleRoles: PlayerRole[] = [
    'loosehead',
    'hooker',
    'lock',
    'openside',
    'number8',
    'scrumHalf',
    'flyHalf',
    'insideCentre',
    'rightWing',
    'fullBack',
  ]

  return Array.from({ length: count }, (_, i) => {
    const role = sampleRoles[(i + year) % sampleRoles.length]!
    const stats = generatePlayerStats(role, i + year * 3, i + 5)
    const age = 17 + (i % 3) // 17, 18, 19
    const potentialBonus = Math.round(academyLvl * 2.5 + dirLvl * 2.0)
    const ovrEst = (stats.strength + stats.speed + stats.skills.tackling) / 3
    const potential = Math.min(99, Math.max(72, Math.round(ovrEst + 15 + potentialBonus + (i % 7))))

    const tempPlayer: Player = {
      id: `${club.id}-youth-${year}-${i + 1}`,
      name: `${FIRST_NAMES[(i * 3 + year * 2) % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7 + year * 4) % LAST_NAMES.length]}`,
      age,
      role,
      skills: stats.skills,
      speed: Math.max(55, stats.speed - 4),
      strength: Math.max(50, stats.strength - 6),
      fitness: 85,
      wage: 350,
      contractYears: 2,
      marketValue: 0,
      potential,
      injury: null,
      careerRecord: createInitialCareerRecord(),
    }
    tempPlayer.marketValue = calculatePlayerMarketValue(tempPlayer)
    return tempPlayer
  })
}

export function promoteAcademyProspect(career: Career, prospectId: string): Career {
  const managedClub = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!managedClub) throw new Error('Managed club not found')

  const prospect = managedClub.academySquad.find((p) => p.id === prospectId)
  if (!prospect) throw new Error('Youth prospect not found in academy')

  if (managedClub.squad.length >= 40) {
    throw new Error('Senior squad is full (40 players max). Release or sell a senior player before promoting youth.')
  }

  const seniorWage = Math.max(750, Math.round(prospect.wage * 2.2))
  const promotedPlayer: Player = {
    ...prospect,
    wage: seniorWage,
    contractYears: 3,
  }

  const updatedClubs = career.season.clubs.map((club) => {
    if (club.id !== career.managedClubId) return club
    return {
      ...club,
      squad: [...club.squad, promotedPlayer],
      academySquad: club.academySquad.filter((p) => p.id !== prospectId),
    }
  })

  const confirmMsg: InboxMessage = {
    id: `youth-promoted-${promotedPlayer.id}-${Date.now()}`,
    title: `🌟 Youth Prospect Promoted: ${promotedPlayer.name}`,
    message: `${promotedPlayer.name} (${promotedPlayer.age}yo ${promotedPlayer.role}) has signed a 3-year senior contract (£${seniorWage.toLocaleString()}/wk) and joined the senior squad!`,
    read: false,
  }

  return {
    ...career,
    season: {
      ...career.season,
      clubs: updatedClubs,
    },
    inbox: [confirmMsg, ...career.inbox],
  }
}

export function dismissAcademyProspect(career: Career, prospectId: string): Career {
  const updatedClubs = career.season.clubs.map((club) => {
    if (club.id !== career.managedClubId) return club
    return {
      ...club,
      academySquad: club.academySquad.filter((p) => p.id !== prospectId),
    }
  })

  return {
    ...career,
    season: {
      ...career.season,
      clubs: updatedClubs,
    },
  }
}
