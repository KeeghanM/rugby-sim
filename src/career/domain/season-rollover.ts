import { CLUBS, SEASON_PRIZE_MONEY, type PlayerRole } from "./constants.ts";
import { generateYouthIntake } from "./academy.ts";
import {
  createFixtures,
  createInitialCareerRecord,
  dateForRound,
  mondayForRound,
} from "./generators.ts";
import { getPlayerOverall } from "./selection.ts";
import { deriveStandings } from "./standings.ts";
import { calculatePlayerMarketValue } from "./transfers.ts";
import type {
  Career,
  Club,
  InboxMessage,
  Player,
  SeasonArchive,
} from "./types.ts";

export function processPlayerYearProgression(
  player: Player,
  clubFacilityLevel: number,
  academyLevel: number,
): { player: Player; retired: boolean } {
  const nextAge = player.age + 1;
  const ovr = getPlayerOverall(player);
  const pot = player.potential ?? ovr + 5;

  // Check retirement probability for veterans (33+)
  if (nextAge >= 33) {
    const retireChance =
      nextAge >= 36
        ? 0.85
        : nextAge === 35
          ? 0.55
          : nextAge === 34
            ? 0.3
            : 0.15;
    if (Math.random() < retireChance) {
      return { player, retired: true };
    }
  }

  const s = { ...player.skills };
  let speed = player.speed;
  let strength = player.strength;

  if (nextAge <= 23 && ovr < pot) {
    // Young Player Progression (+1 to +5)
    const growthCap = Math.min(5, Math.max(1, Math.round((pot - ovr) * 0.35)));
    const bonus = Math.round(1 + (clubFacilityLevel + academyLevel) * 0.4);
    const growth = Math.min(growthCap, bonus);

    s.decision = Math.min(99, s.decision + growth);
    s.handling = Math.min(99, s.handling + growth);
    s.passing = Math.min(99, s.passing + growth);
    s.tackling = Math.min(99, s.tackling + growth);
    speed = Math.min(99, speed + Math.min(2, growth));
    strength = Math.min(99, strength + Math.min(2, growth));
  } else if (nextAge >= 31) {
    // Veteran Physical Decline
    const decline = Math.floor(Math.random() * 3) + 1;
    speed = Math.max(45, speed - decline);
    strength = Math.max(50, strength - Math.max(1, decline - 1));
    s.decision = Math.min(99, s.decision + 1); // veteran savvy
  }

  const updatedPlayer: Player = {
    ...player,
    age: nextAge,
    skills: s,
    speed,
    strength,
    fitness: 100,
    injury: null,
    contractYears: Math.max(0, player.contractYears - 1),
    careerRecord: { ...player.careerRecord },
  };
  updatedPlayer.marketValue = calculatePlayerMarketValue(updatedPlayer);

  return { player: updatedPlayer, retired: false };
}

export function executeSeasonRollover(career: Career): Career {
  const standings = deriveStandings(career);
  const nextYear = career.seasonYear + 1;
  const champion = standings[0];
  const isUserChampion = champion?.clubId === career.managedClubId;

  const userStandingIndex = standings.findIndex(
    (s) => s.clubId === career.managedClubId,
  );
  const userFinishPos = userStandingIndex !== -1 ? userStandingIndex + 1 : 6;
  const userStanding = standings[userStandingIndex];

  // Distribute Prize Money and Process Player Progression across all clubs
  const retiredPlayerNames: string[] = [];
  const expiredFreeAgents: Player[] = [];

  const updatedClubs: Club[] = career.season.clubs.map((club) => {
    const clubStandingIndex = standings.findIndex((s) => s.clubId === club.id);
    const position = clubStandingIndex !== -1 ? clubStandingIndex + 1 : 6;
    const prize = SEASON_PRIZE_MONEY[position] ?? 25_000;

    const remainingSeniorSquad: Player[] = [];
    const clubFacilityLvl = club.facilityLevel ?? 1;
    const academyLvl = club.facilities.academy ?? 1;

    for (let i = 0; i < club.squad.length; i++) {
      const player = club.squad[i]!;
      const { player: progressed, retired } = processPlayerYearProgression(
        player,
        clubFacilityLvl,
        academyLvl,
      );

      if (retired) {
        if (club.id === career.managedClubId) {
          retiredPlayerNames.push(player.name);
        }
      } else if (progressed.contractYears === 0) {
        // Contract Expired: Top 25 players or managed club starters get automatic 1-2 year extension
        if (i < 25 || remainingSeniorSquad.length < 32) {
          remainingSeniorSquad.push({
            ...progressed,
            contractYears: 2,
          });
        } else {
          // Release to Free Agents pool
          expiredFreeAgents.push({
            ...progressed,
            contractYears: 0,
          });
        }
      } else {
        remainingSeniorSquad.push(progressed);
      }
    }

    // Process Academy Prospects progression
    const progressedAcademy = club.academySquad.map((p) => {
      const { player: progressed } = processPlayerYearProgression(
        p,
        clubFacilityLvl,
        academyLvl,
      );
      return progressed;
    });

    // If senior squad has vacancies below 35, promote top academy players
    let currentSenior = [...remainingSeniorSquad];
    let remainingAcademy = [...progressedAcademy];

    while (currentSenior.length < 35 && remainingAcademy.length > 0) {
      const promoted = remainingAcademy.shift()!;
      currentSenior.push({
        ...promoted,
        wage: 850,
        contractYears: 3,
      });
    }

    // Generate fresh annual Youth Intake
    const freshIntake = generateYouthIntake(club, nextYear, 4);

    return {
      id: club.id,
      name: club.name,
      color: club.color,
      squad: currentSenior,
      staff: club.staff,
      staffLevel: club.staffLevel,
      facilityLevel: club.facilityLevel,
      facilities: club.facilities,
      academySquad: [...remainingAcademy, ...freshIntake].slice(0, 10),
      reputation: club.reputation,
      balance: club.balance + prize,
      ledger: [
        {
          id: `ledger-prize-${Date.now()}-${club.id}`,
          round: 10,
          date: career.currentDate,
          category: "prizeMoney" as const,
          description: `Season ${career.seasonYear} Prize Money (Finished #${position})`,
          amount: prize,
        },
        ...club.ledger,
      ],
      trainingPlan: club.trainingPlan,
    };
  });

  // Archive Season
  const archive: SeasonArchive = {
    year: career.seasonYear,
    seasonName: `${career.seasonYear} National Club League`,
    championClubId: champion?.clubId ?? "harbour-sharks",
    championClubName: champion?.clubName ?? "Harbour Sharks",
    userFinishPosition: userFinishPos,
    userRecord: {
      won: userStanding?.won ?? 0,
      drawn: userStanding?.drawn ?? 0,
      lost: userStanding?.lost ?? 0,
      pointsFor: userStanding?.pointsFor ?? 0,
      pointsAgainst: userStanding?.pointsAgainst ?? 0,
    },
    prizeMoney: SEASON_PRIZE_MONEY[userFinishPos] ?? 25_000,
    standings,
  };

  // Generate new season fixtures
  const newFixtures = createFixtures().map((f) => ({
    ...f,
    id: `season-${nextYear}-f${String(f.seed).padStart(2, "0")}`,
  }));

  // Create end-of-season inbox report
  const rolloverMessage: InboxMessage = {
    id: `season-${career.seasonYear}-review`,
    title: `🏆 Season ${career.seasonYear} Review & New Season Launch`,
    message: `${champion?.clubName} crowned champions! Your club finished #${userFinishPos} earning £${(SEASON_PRIZE_MONEY[userFinishPos] ?? 25000).toLocaleString()} in prize money. ${retiredPlayerNames.length > 0 ? `Retirements: ${retiredPlayerNames.join(", ")}.` : ""} Fresh youth academy intake has arrived. Welcome to the ${nextYear} season!`,
    read: false,
  };

  return {
    id: career.id,
    manager: career.manager,
    managedClubId: career.managedClubId,
    seasonYear: nextYear,
    season: {
      id: `league-${nextYear}`,
      name: `${nextYear} National Club League`,
      clubs: updatedClubs,
      fixtures: newFixtures,
    },
    history: [archive, ...career.history],
    freeAgents: [...expiredFreeAgents, ...career.freeAgents].slice(0, 36),
    scoutingReports: career.scoutingReports,
    transferOffers: career.transferOffers,
    currentRound: 1,
    currentDate: mondayForRound(1),
    checkpoint: "monday",
    pendingEvent: null,
    inbox: [rolloverMessage, ...career.inbox],
  };
}
