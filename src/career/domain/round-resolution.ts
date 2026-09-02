import { simulateMatch } from "../../simulation.ts";
import type { MatchResult as SimulationMatchResult } from "../../domain.ts";
import { INJURY_TYPES } from "./constants.ts";
import { processMatchFinancesAndWages } from "./finances.ts";
import { createMatchInputForFixture, roleName } from "./match-input.ts";
import type {
  Career,
  Club,
  Fixture,
  FixturePlayerPerformance,
  InboxMessage,
  MatchResult,
  PlayerInjury,
} from "./types.ts";

export type RecordedMatchResult = {
  homeScore: number;
  awayScore: number;
  resultObj?: SimulationMatchResult;
};

export function resolveRound(
  career: Career,
  recordedResults?: Map<string, RecordedMatchResult>,
): { fixtures: Fixture[]; clubs: Club[]; newInbox: InboxMessage[] } {
  const newInbox: InboxMessage[] = [];
  const updatedClubsMap = new Map<string, Club>(
    career.season.clubs.map((c) => [c.id, { ...c, squad: [...c.squad] }]),
  );

  const fixtures = career.season.fixtures.map((fixture) => {
    if (fixture.round !== career.currentRound || fixture.status === "played")
      return fixture;
    const recorded = recordedResults?.get(fixture.id);
    let result: MatchResult;

    const input = createMatchInputForFixture(career, fixture);
    const simResult =
      recorded?.resultObj ?? simulateMatch({ input, seed: fixture.seed });

    const homeClub = updatedClubsMap.get(fixture.homeClubId);
    const awayClub = updatedClubsMap.get(fixture.awayClubId);

    const fixturePlayers: FixturePlayerPerformance[] = simResult.players.map(
      (p) => {
        const club = p.team === 0 ? homeClub : awayClub;
        const playerObj = club?.squad.find((pl) => pl.id === p.playerId);
        return {
          playerId: p.playerId,
          clubId:
            club?.id ??
            (p.team === 0 ? fixture.homeClubId : fixture.awayClubId),
          name: playerObj?.name ?? `Player #${p.number}`,
          number: p.number,
          role: roleName(p.role),
          started: p.started,
          stats: { ...p.stats },
        };
      },
    );

    if (recorded) {
      result = {
        homeScore: recorded.homeScore,
        awayScore: recorded.awayScore,
        homeTeamStats: simResult.teamStats[0],
        awayTeamStats: simResult.teamStats[1],
        players: fixturePlayers,
      };
    } else {
      result = {
        homeScore: simResult.score[0],
        awayScore: simResult.score[1],
        homeTeamStats: simResult.teamStats[0],
        awayTeamStats: simResult.teamStats[1],
        players: fixturePlayers,
      };
    }

    // Accumulate career stats for participating players across both clubs
    for (const clubId of [fixture.homeClubId, fixture.awayClubId]) {
      const club = updatedClubsMap.get(clubId);
      if (!club) continue;
      const isManaged = club.id === career.managedClubId;
      const medLevel = club.facilities?.medicalRoom ?? club.facilityLevel ?? 1;

      club.squad = club.squad.map((player, index) => {
        const matchPerf = simResult.players.find(
          (p) => p.playerId === player.id,
        );

        let updatedCareerRecord = { ...player.careerRecord };
        if (matchPerf) {
          const st = matchPerf.stats;
          updatedCareerRecord = {
            appearances: updatedCareerRecord.appearances + 1,
            starts: updatedCareerRecord.starts + (matchPerf.started ? 1 : 0),
            subAppearances:
              updatedCareerRecord.subAppearances + (matchPerf.started ? 0 : 1),
            tries: updatedCareerRecord.tries + st.triesScored,
            lineBreaks: updatedCareerRecord.lineBreaks + st.lineBreaks,
            tacklesMade: updatedCareerRecord.tacklesMade + st.tacklesMade,
            tacklesMissed: updatedCareerRecord.tacklesMissed + st.tacklesMissed,
            distanceCovered:
              updatedCareerRecord.distanceCovered + st.distanceCovered,
            distanceCarried:
              updatedCareerRecord.distanceCarried + st.distanceCarried,
            successfulPasses:
              updatedCareerRecord.successfulPasses + st.successfulPasses,
            totalPasses: updatedCareerRecord.totalPasses + st.totalPasses,
            successfulKicks:
              updatedCareerRecord.successfulKicks + st.successfulKicks,
            totalKicks: updatedCareerRecord.totalKicks + st.totalKicks,
            penaltiesConceded:
              updatedCareerRecord.penaltiesConceded + st.penaltiesConceded,
            knockOns: updatedCareerRecord.knockOns + st.knockOns,
          };
        }

        const isStarter = index < 15;
        const playedInMatch = matchPerf !== undefined;
        const fatigueCost = isStarter ? 18 : playedInMatch ? 10 : 4;
        const nextFitness = Math.max(20, player.fitness - fatigueCost);

        if (player.injury === null && playedInMatch) {
          let matchInjuryChance = isStarter ? 0.04 : 0.015;
          if (nextFitness < 45) matchInjuryChance += 0.04;
          matchInjuryChance = Math.max(
            0.005,
            matchInjuryChance - medLevel * 0.006,
          );

          if (Math.random() < matchInjuryChance) {
            const injuryType =
              INJURY_TYPES[Math.floor(Math.random() * INJURY_TYPES.length)];
            const weeks = Math.floor(Math.random() * 3) + 1;
            const injury: PlayerInjury = {
              type: injuryType,
              weeksRemaining: weeks,
              severity:
                weeks >= 3 ? "severe" : weeks === 2 ? "moderate" : "minor",
            };
            if (isManaged) {
              newInbox.push({
                id: `match-injury-${player.id}-${career.currentRound}`,
                title: `Match Injury: ${player.name}`,
                message: `${player.name} picked up a ${injuryType} in Round ${career.currentRound} and will miss ${weeks} week${weeks > 1 ? "s" : ""}.`,
                read: false,
              });
            }
            return {
              ...player,
              fitness: Math.max(15, nextFitness - 10),
              injury,
              careerRecord: updatedCareerRecord,
            };
          }
        }

        return {
          ...player,
          fitness: nextFitness,
          careerRecord: updatedCareerRecord,
        };
      });

      const isHome = clubId === fixture.homeClubId;
      const opponentClub = isHome ? awayClub : homeClub;
      const financiallyUpdatedClub = processMatchFinancesAndWages(
        club,
        fixture.round,
        fixture.date,
        isHome,
        opponentClub?.reputation ?? 60,
      );
      updatedClubsMap.set(clubId, financiallyUpdatedClub);
    }

    return {
      ...fixture,
      status: "played" as const,
      result,
    };
  });

  return {
    fixtures,
    clubs: Array.from(updatedClubsMap.values()),
    newInbox,
  };
}
