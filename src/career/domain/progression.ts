import { addDays, mondayForRound } from "./generators.ts";
import { resolveRound } from "./round-resolution.ts";
import { resolveWeeklyTraining } from "./training.ts";
import type { Career, InboxMessage } from "./types.ts";

export function acknowledgeEvent(career: Career): Career {
  if (career.pendingEvent === null) return career;
  const eventId = career.pendingEvent.id;
  return {
    ...career,
    pendingEvent: null,
    inbox: career.inbox.map((message) =>
      message.id === eventId ? { ...message, read: true } : message,
    ),
  };
}

export function markInboxRead(career: Career, messageId: string): Career {
  return {
    ...career,
    inbox: career.inbox.map((message) =>
      message.id === messageId ? { ...message, read: true } : message,
    ),
  };
}

export function advanceCareer(
  career: Career,
  recordedResults?: Map<string, { homeScore: number; awayScore: number }>,
): Career {
  if (career.pendingEvent !== null || career.checkpoint === "seasonEnd")
    return career;
  if (career.checkpoint === "monday") {
    const trained = resolveWeeklyTraining(career);
    return {
      ...trained,
      checkpoint: "thursday",
      currentDate: addDays(career.currentDate, 3),
    };
  }
  if (career.checkpoint === "thursday") {
    return {
      ...career,
      checkpoint: "matchDay",
      currentDate: addDays(career.currentDate, 2),
    };
  }
  if (career.checkpoint === "matchDay") {
    const { fixtures, clubs, newInbox } = resolveRound(career, recordedResults);
    const managedFixture = fixtures.find(
      (fixture) =>
        fixture.round === career.currentRound &&
        (fixture.homeClubId === career.managedClubId ||
          fixture.awayClubId === career.managedClubId),
    );
    const homeClub = clubs.find((c) => c.id === managedFixture?.homeClubId);
    const awayClub = clubs.find((c) => c.id === managedFixture?.awayClubId);
    const isHome = managedFixture?.homeClubId === career.managedClubId;
    const opponent = isHome ? awayClub : homeClub;
    const result = managedFixture?.result;

    let resultMessage: InboxMessage | null = null;
    if (managedFixture && result && homeClub && awayClub && opponent) {
      const userWon = isHome
        ? result.homeScore > result.awayScore
        : result.awayScore > result.homeScore;
      const isDraw = result.homeScore === result.awayScore;
      const outcome = isDraw ? "Drawn" : userWon ? "Victory" : "Defeat";

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
      };
    }

    const combinedInbox = resultMessage
      ? [resultMessage, ...newInbox, ...career.inbox]
      : [...newInbox, ...career.inbox];

    return {
      ...career,
      checkpoint: "postMatch",
      season: {
        ...career.season,
        clubs,
        fixtures,
      },
      inbox: combinedInbox,
    };
  }
  if (career.currentRound === 10) return { ...career, checkpoint: "seasonEnd" };
  const currentRound = career.currentRound + 1;
  return {
    ...career,
    currentRound,
    currentDate: mondayForRound(currentRound),
    checkpoint: "monday",
  };
}
