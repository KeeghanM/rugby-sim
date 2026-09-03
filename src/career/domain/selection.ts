import { PLAYER_ROLES, ROLE_GROUPS, type PlayerRole } from './constants.ts'
import type { Career, Player } from './types.ts'

export function getPlayerOverall(player: Player): number {
  const group = ROLE_GROUPS[player.role as PlayerRole] ?? 'centre'
  const s = player.skills
  const str = player.strength
  const spd = player.speed
  const fit = player.fitness

  let ovr = 0
  switch (group) {
    case 'prop':
      ovr = str * 0.35 + s.tackling * 0.25 + s.handling * 0.15 + s.decision * 0.15 + fit * 0.1
      break
    case 'hooker':
      ovr = s.tackling * 0.25 + s.handling * 0.25 + str * 0.2 + s.decision * 0.15 + fit * 0.15
      break
    case 'lock':
      ovr = str * 0.3 + s.tackling * 0.25 + s.decision * 0.2 + fit * 0.15 + s.handling * 0.1
      break
    case 'backRow':
      ovr = s.tackling * 0.3 + str * 0.2 + fit * 0.2 + s.decision * 0.15 + s.handling * 0.15
      break
    case 'scrumHalf':
      ovr = s.passing * 0.35 + s.decision * 0.25 + spd * 0.15 + s.handling * 0.15 + s.kicking * 0.1
      break
    case 'flyHalf':
      ovr = s.kicking * 0.3 + s.passing * 0.3 + s.decision * 0.25 + s.handling * 0.1 + spd * 0.05
      break
    case 'centre':
      ovr = s.tackling * 0.25 + s.handling * 0.25 + s.decision * 0.2 + spd * 0.15 + s.passing * 0.15
      break
    case 'outsideBack':
      ovr = spd * 0.35 + s.handling * 0.2 + s.decision * 0.15 + s.kicking * 0.15 + s.tackling * 0.15
      break
    default:
      ovr = (s.decision + s.handling + s.passing + s.kicking + s.tackling + str + spd + fit) / 8
  }

  return Math.max(20, Math.min(99, Math.round(ovr)))
}

export function getOvrClass(ovr: number): string {
  if (ovr >= 78) return 'ovr-elite'
  if (ovr >= 68) return 'ovr-good'
  return 'ovr-solid'
}

export function optimizeSquadSelection(career: Career, clubId: string, criteria: 'ovr' | 'fitness'): Career {
  return {
    ...career,
    season: {
      ...career.season,
      clubs: career.season.clubs.map((club) => {
        if (club.id !== clubId) return club

        const scorePlayer = (player: Player) => {
          const ovr = getPlayerOverall(player)
          return criteria === 'ovr' ? ovr : player.fitness * 100 + ovr
        }

        const available = [...club.squad].sort((a, b) => scorePlayer(b) - scorePlayer(a))
        const assigned: Player[] = []

        for (let slot = 0; slot < PLAYER_ROLES.length; slot += 1) {
          const requiredRole = PLAYER_ROLES[slot] as PlayerRole
          const requiredGroup = ROLE_GROUPS[requiredRole]

          let pickIndex = available.findIndex(
            (p) => p.injury === null && ROLE_GROUPS[p.role as PlayerRole] === requiredGroup,
          )
          if (pickIndex === -1) {
            pickIndex = available.findIndex((p) => p.injury === null)
          }
          if (pickIndex === -1) {
            pickIndex = 0
          }

          if (pickIndex >= 0 && pickIndex < available.length) {
            assigned.push(available[pickIndex])
            available.splice(pickIndex, 1)
          }
        }

        return { ...club, squad: assigned.concat(available) }
      }),
    },
  }
}

export function swapSquadPlayers(career: Career, clubId: string, indexA: number, indexB: number): Career {
  if (indexA === indexB) return career
  return {
    ...career,
    season: {
      ...career.season,
      clubs: career.season.clubs.map((club) => {
        if (club.id !== clubId) return club
        const squad = [...club.squad]
        const temp = squad[indexA]
        squad[indexA] = squad[indexB]
        squad[indexB] = temp
        return { ...club, squad }
      }),
    },
  }
}
