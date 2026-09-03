import { COACHING_COURSES } from './constants.ts'
import { addDays, mondayForRound } from './generators.ts'
import { getManagerLevel, getManagerPerks } from './manager.ts'
import { resolveRound, type RecordedMatchResult } from './round-resolution.ts'
import { deriveStandings } from './standings.ts'
import { resolveWeeklyTraining } from './training.ts'
import type { Career, InboxMessage } from './types.ts'

export function acknowledgeEvent(career: Career): Career {
  if (career.pendingEvent === null) return career
  const eventId = career.pendingEvent.id
  return {
    ...career,
    pendingEvent: null,
    inbox: career.inbox.map((message) => (message.id === eventId ? { ...message, read: true } : message)),
  }
}

export function markInboxRead(career: Career, messageId: string): Career {
  return {
    ...career,
    inbox: career.inbox.map((message) => (message.id === messageId ? { ...message, read: true } : message)),
  }
}

export function deleteInboxMessage(career: Career, messageId: string): Career {
  return {
    ...career,
    inbox: career.inbox.filter((message) => message.id !== messageId),
  }
}

export function clearReadInboxMessages(career: Career): Career {
  return {
    ...career,
    inbox: career.inbox.filter((message) => !message.read),
  }
}

export function advanceCareer(career: Career, recordedResults?: Map<string, RecordedMatchResult>): Career {
  if (career.pendingEvent !== null || career.checkpoint === 'seasonEnd') return career
  if (career.checkpoint === 'monday') {
    const trained = resolveWeeklyTraining(career)
    return {
      ...trained,
      checkpoint: 'thursday',
      currentDate: addDays(career.currentDate, 3),
    }
  }
  if (career.checkpoint === 'thursday') {
    return {
      ...career,
      checkpoint: 'matchDay',
      currentDate: addDays(career.currentDate, 2),
    }
  }
  if (career.checkpoint === 'matchDay') {
    const { fixtures, clubs, newInbox } = resolveRound(career, recordedResults)
    const managedFixture = fixtures.find(
      (fixture) =>
        fixture.round === career.currentRound &&
        (fixture.homeClubId === career.managedClubId || fixture.awayClubId === career.managedClubId),
    )
    const homeClub = clubs.find((c) => c.id === managedFixture?.homeClubId)
    const awayClub = clubs.find((c) => c.id === managedFixture?.awayClubId)
    const isHome = managedFixture?.homeClubId === career.managedClubId
    const opponent = isHome ? awayClub : homeClub
    const result = managedFixture?.result

    let resultMessage: InboxMessage | null = null
    let updatedManager = { ...career.manager }
    const perks = getManagerPerks(updatedManager)

    if (managedFixture && result && homeClub && awayClub && opponent) {
      const userScore = isHome ? result.homeScore : result.awayScore
      const oppScore = isHome ? result.awayScore : result.homeScore
      const userWon = userScore > oppScore
      const isDraw = userScore === oppScore
      const outcome = isDraw ? 'Drawn' : userWon ? 'Victory' : 'Defeat'

      resultMessage = {
        id: `result-${managedFixture.id}`,
        title: `Round ${career.currentRound} Match Report: ${outcome} vs ${opponent.name}`,
        message: `Final Score: ${homeClub.name} ${result.homeScore} - ${result.awayScore} ${awayClub.name}. Click to view full match statistics and individual player ratings.`,
        read: false,
        matchReport: {
          round: career.currentRound,
          homeClubId: homeClub.id,
          awayClubId: awayClub.id,
          homeClubName: homeClub.name,
          awayClubName: awayClub.name,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          homeTeamStats: result.homeTeamStats,
          awayTeamStats: result.awayTeamStats,
          players: result.players ?? [],
        },
      }

      // Match result stats
      const nextStats = {
        ...updatedManager.stats,
        matchesManaged: updatedManager.stats.matchesManaged + 1,
        wins: updatedManager.stats.wins + (userWon ? 1 : 0),
        draws: updatedManager.stats.draws + (isDraw ? 1 : 0),
        losses: updatedManager.stats.losses + (!userWon && !isDraw ? 1 : 0),
        pointsFor: updatedManager.stats.pointsFor + userScore,
        pointsAgainst: updatedManager.stats.pointsAgainst + oppScore,
      }

      // Match XP
      const baseMatchXp = userWon ? 75 : isDraw ? 35 : 20
      const userTries = (result.players ?? [])
        .filter((p) => p.clubId === career.managedClubId)
        .reduce((sum, p) => sum + (p.stats.triesScored || 0), 0)
      const tryBonusXp = userTries * 10
      const totalMatchXp = Math.round((baseMatchXp + tryBonusXp) * (1 + perks.matchXpBonusPct))
      const nextXp = updatedManager.xp + totalMatchXp
      const levelInfo = getManagerLevel(nextXp)

      // Reputation
      const repChange = userWon ? 2 : !isDraw ? -1 : 0
      const nextReputation = Math.max(10, Math.min(100, updatedManager.reputation + repChange))

      updatedManager = {
        ...updatedManager,
        xp: nextXp,
        level: levelInfo.level,
        reputation: nextReputation,
        stats: nextStats,
      }
    }

    // Progress active coaching course
    if (updatedManager.activeCourse) {
      const remaining = updatedManager.activeCourse.roundsRemaining - 1
      if (remaining <= 0) {
        const completedCourseId = updatedManager.activeCourse.courseId
        const courseInfo = COACHING_COURSES[completedCourseId]
        updatedManager = {
          ...updatedManager,
          qualifications: [...updatedManager.qualifications, completedCourseId],
          activeCourse: null,
        }
        if (courseInfo) {
          newInbox.push({
            id: `course-complete-${completedCourseId}-${career.currentRound}`,
            title: `🎓 Qualification Complete: ${courseInfo.name}`,
            message: `Congratulations! You have completed your coaching course: ${courseInfo.name}. ${courseInfo.perks.join(' · ')}. Associated tactics are now unlocked in your Playbook Toolkit!`,
            read: false,
          })
        }
      } else {
        updatedManager = {
          ...updatedManager,
          activeCourse: {
            ...updatedManager.activeCourse,
            roundsRemaining: remaining,
          },
        }
      }
    }

    const combinedInbox = resultMessage ? [resultMessage, ...newInbox, ...career.inbox] : [...newInbox, ...career.inbox]

    return {
      ...career,
      manager: updatedManager,
      checkpoint: 'postMatch',
      season: {
        ...career.season,
        clubs,
        fixtures,
      },
      inbox: combinedInbox,
    }
  }

  if (career.currentRound === 10) {
    const standings = deriveStandings(career)
    const champion = standings[0]
    const isChampion = champion?.clubId === career.managedClubId
    let nextManager = career.manager
    if (isChampion) {
      const nextXp = career.manager.xp + 150
      nextManager = {
        ...career.manager,
        xp: nextXp,
        level: getManagerLevel(nextXp).level,
        reputation: Math.min(100, career.manager.reputation + 10),
        stats: {
          ...career.manager.stats,
          trophiesWon: career.manager.stats.trophiesWon + 1,
        },
      }
    }
    return { ...career, manager: nextManager, checkpoint: 'seasonEnd' }
  }

  const currentRound = career.currentRound + 1
  return {
    ...career,
    currentRound,
    currentDate: mondayForRound(currentRound),
    checkpoint: 'monday',
  }
}
