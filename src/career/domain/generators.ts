import {
  CLUBS,
  FIRST_NAMES,
  LAST_NAMES,
  PLAYER_ROLES,
  ROLE_GROUPS,
  type PlayerRole,
} from "./constants.ts";
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

function generatePlayerStats(
  role: PlayerRole,
  playerIndex: number,
  clubIndex: number,
) {
  const seed = (playerIndex * 7 + clubIndex * 11) % 100;
  const group = ROLE_GROUPS[role] ?? "centre";

  let speed = 65;
  let strength = 65;
  let decision = 65;
  let handling = 65;
  let passing = 60;
  let kicking = 40;
  let tackling = 65;

  switch (group) {
    case "prop":
      strength = 78 + (seed % 15);
      tackling = 74 + (seed % 14);
      handling = 55 + (seed % 16);
      decision = 60 + (seed % 16);
      passing = 50 + (seed % 16);
      kicking = 20 + (seed % 15);
      speed = 46 + (seed % 16);
      break;
    case "hooker":
      strength = 75 + (seed % 14);
      tackling = 76 + (seed % 14);
      handling = 70 + (seed % 16);
      decision = 65 + (seed % 16);
      passing = 60 + (seed % 16);
      kicking = 25 + (seed % 15);
      speed = 52 + (seed % 16);
      break;
    case "lock":
      strength = 80 + (seed % 15);
      tackling = 75 + (seed % 14);
      handling = 60 + (seed % 16);
      decision = 64 + (seed % 16);
      passing = 52 + (seed % 16);
      kicking = 20 + (seed % 15);
      speed = 50 + (seed % 16);
      break;
    case "backRow":
      strength = 76 + (seed % 14);
      tackling = 80 + (seed % 15);
      handling = 68 + (seed % 16);
      decision = 70 + (seed % 16);
      passing = 62 + (seed % 16);
      kicking = 30 + (seed % 15);
      speed = 64 + (seed % 16);
      break;
    case "scrumHalf":
      strength = 48 + (seed % 14);
      tackling = 58 + (seed % 14);
      handling = 78 + (seed % 16);
      decision = 76 + (seed % 16);
      passing = 84 + (seed % 14);
      kicking = 70 + (seed % 16);
      speed = 78 + (seed % 16);
      break;
    case "flyHalf":
      strength = 50 + (seed % 14);
      tackling = 54 + (seed % 14);
      handling = 78 + (seed % 16);
      decision = 82 + (seed % 14);
      passing = 82 + (seed % 14);
      kicking = 84 + (seed % 14);
      speed = 70 + (seed % 16);
      break;
    case "centre":
      strength = 70 + (seed % 14);
      tackling = 76 + (seed % 14);
      handling = 76 + (seed % 16);
      decision = 74 + (seed % 16);
      passing = 72 + (seed % 16);
      kicking = 55 + (seed % 16);
      speed = 75 + (seed % 16);
      break;
    case "outsideBack":
      strength = 58 + (seed % 14);
      tackling = 62 + (seed % 14);
      handling = 76 + (seed % 16);
      decision = 70 + (seed % 16);
      passing = 62 + (seed % 16);
      kicking = 65 + (seed % 16);
      speed = 84 + (seed % 14);
      break;
  }

  const fitness = 70 + ((playerIndex * 5 + clubIndex * 7) % 26);
  return {
    skills: {
      decision: Math.min(99, decision),
      handling: Math.min(99, handling),
      passing: Math.min(99, passing),
      kicking: Math.min(99, kicking),
      tackling: Math.min(99, tackling),
    },
    speed: Math.min(99, speed),
    strength: Math.min(99, strength),
    fitness,
  };
}

export function createClubs(): Club[] {
  return CLUBS.map((club, clubIndex) => ({
    ...club,
    squad: PLAYER_ROLES.map((role, playerIndex) => {
      const stats = generatePlayerStats(role, playerIndex, clubIndex);
      return {
        id: `${club.id}-p${String(playerIndex + 1).padStart(2, "0")}`,
        name: `${FIRST_NAMES[(playerIndex + clubIndex * 2) % FIRST_NAMES.length]} ${LAST_NAMES[(playerIndex * 5 + clubIndex) % LAST_NAMES.length]}`,
        age: 19 + ((playerIndex * 7 + clubIndex * 3) % 17),
        role,
        skills: stats.skills,
        speed: stats.speed,
        strength: stats.strength,
        fitness: stats.fitness,
        injury: null,
        careerRecord: createInitialCareerRecord(),
      };
    }),
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
