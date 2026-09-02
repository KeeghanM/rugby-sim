import { CLUBS, FIRST_NAMES, LAST_NAMES, PLAYER_ROLES } from "./constants.ts";
import type { Career, Club, Fixture, PlayerCareerRecord } from "./types.ts";

export const createInitialCareerRecord = (): PlayerCareerRecord => ({
  appearances: 0,
  starts: 0,
  subAppearances: 0,
  tries: 0,
  lineBreaks: 0,
  tacklesMade: 0,
  tacklesMissed: 0,
  distanceCovered: 0,
  distanceCarried: 0,
  successfulPasses: 0,
  totalPasses: 0,
  successfulKicks: 0,
  totalKicks: 0,
  penaltiesConceded: 0,
  knockOns: 0,
});

export function dateForRound(round: number): string {
  const date = new Date(Date.UTC(2026, 7, 15 + (round - 1) * 7));
  return date.toISOString().slice(0, 10);
}

export function mondayForRound(round: number): string {
  const date = new Date(`${dateForRound(round)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 5);
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function createClubs(): Club[] {
  return CLUBS.map((club, clubIndex) => ({
    ...club,
    squad: PLAYER_ROLES.map((role, playerIndex) => ({
      id: `${club.id}-p${String(playerIndex + 1).padStart(2, "0")}`,
      name: `${FIRST_NAMES[(playerIndex + clubIndex * 2) % FIRST_NAMES.length]} ${LAST_NAMES[(playerIndex * 5 + clubIndex) % LAST_NAMES.length]}`,
      age: 19 + ((playerIndex * 7 + clubIndex * 3) % 17),
      role,
      attack: 55 + ((playerIndex * 3 + clubIndex * 5) % 31),
      defence: 54 + ((playerIndex * 7 + clubIndex * 3) % 32),
      fitness: 60 + ((playerIndex * 5 + clubIndex * 7) % 26),
      injury: null,
      careerRecord: createInitialCareerRecord(),
    })),
    staffLevel: 1 + (clubIndex % 3),
    facilityLevel: 1 + ((clubIndex + 1) % 3),
    facilities: {
      gym: 1 + (clubIndex % 3),
      trainingGround: 1 + ((clubIndex + 1) % 3),
      medicalRoom: 1 + ((clubIndex + 2) % 3),
    },
    reputation: 58 + clubIndex * 4,
    balance: 1_000_000 + clubIndex * 75_000,
    trainingPlan: {
      focus: "balanced",
      intensity: "medium",
    },
  }));
}

export function createFixtures(): Fixture[] {
  const rotating: string[] = CLUBS.map((club) => club.id);
  const firstHalf: Fixture[] = [];
  let seed = 1;

  for (let round = 1; round <= CLUBS.length - 1; round += 1) {
    for (let pair = 0; pair < CLUBS.length / 2; pair += 1) {
      const left = rotating[pair];
      const right = rotating[rotating.length - 1 - pair];
      if (left === undefined || right === undefined)
        throw new Error("Invalid fixture rotation");
      const reverse = (round + pair) % 2 === 0;
      firstHalf.push({
        id: `season-1-f${String(seed).padStart(2, "0")}`,
        round,
        date: dateForRound(round),
        seed,
        homeClubId: reverse ? right : left,
        awayClubId: reverse ? left : right,
        status: "scheduled",
        result: null,
      });
      seed += 1;
    }
    rotating.splice(1, 0, rotating.pop() ?? "");
  }

  return firstHalf.concat(
    firstHalf.map((fixture) => ({
      ...fixture,
      id: `season-1-f${String(fixture.seed + 15).padStart(2, "0")}`,
      round: fixture.round + 5,
      date: dateForRound(fixture.round + 5),
      seed: fixture.seed + 15,
      homeClubId: fixture.awayClubId,
      awayClubId: fixture.homeClubId,
    })),
  );
}

export function createCareer(managerName: string, clubId: string): Career {
  const name = managerName.trim();
  if (!name) throw new Error("Manager name is required");
  if (!CLUBS.some((club) => club.id === clubId))
    throw new Error(`Unknown club: ${clubId}`);

  const welcome = {
    id: "board-welcome",
    title: "Welcome to the club",
    message: "The board expects a competitive first season.",
  };
  return {
    id: `career-${clubId}-2026`,
    manager: { name },
    managedClubId: clubId,
    season: {
      id: "league-2026",
      name: "National Club League",
      clubs: createClubs(),
      fixtures: createFixtures(),
    },
    currentRound: 1,
    currentDate: mondayForRound(1),
    checkpoint: "monday",
    pendingEvent: welcome,
    inbox: [{ ...welcome, read: false }],
  };
}
