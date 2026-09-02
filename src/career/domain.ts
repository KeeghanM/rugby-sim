import type {
  MatchInput,
  PlayerSkills,
  PlayerStats,
  TeamDefinition,
  TeamMatchStats,
} from "../domain.ts";
import { simulateMatch } from "../simulation.ts";

export const CAREER_SIMULATION_VERSION = "phase-2";
export const CAREER_CONTENT_VERSION = "2026.1";

export const CLUBS = [
  { id: "harbour-sharks", name: "Harbour Sharks", color: "#167c80" },
  { id: "valley-stags", name: "Valley Stags", color: "#9b3a32" },
  { id: "city-lions", name: "City Lions", color: "#c58b21" },
  { id: "moor-wolves", name: "Moor Wolves", color: "#59677f" },
  { id: "river-bulls", name: "River Bulls", color: "#7a3f78" },
  { id: "coast-hawks", name: "Coast Hawks", color: "#34633f" },
] as const;

export const PLAYER_ROLES = [
  "loosehead",
  "hooker",
  "tighthead",
  "lock",
  "lock",
  "blindside",
  "openside",
  "number8",
  "scrumHalf",
  "flyHalf",
  "leftWing",
  "insideCentre",
  "outsideCentre",
  "rightWing",
  "fullBack",
  "hooker",
  "prop",
  "lock",
  "backRow",
  "scrumHalf",
  "flyHalf",
  "centre",
  "outsideBack",
] as const;

export const CHECKPOINTS = [
  "monday",
  "thursday",
  "matchDay",
  "postMatch",
  "seasonEnd",
] as const;

export const TRAINING_FOCUSES = [
  "balanced",
  "strength",
  "conditioning",
  "handling",
  "attack",
  "defence",
  "recovery",
] as const;
export type TrainingFocus = (typeof TRAINING_FOCUSES)[number];

export const TRAINING_INTENSITIES = ["light", "medium", "high"] as const;
export type TrainingIntensity = (typeof TRAINING_INTENSITIES)[number];

export type TrainingPlan = {
  focus: TrainingFocus;
  intensity: TrainingIntensity;
};

export type PlayerInjury = {
  type: string;
  weeksRemaining: number;
  severity: "minor" | "moderate" | "severe";
};

export type Facilities = {
  gym: number;
  trainingGround: number;
  medicalRoom: number;
};

export type PlayerRole = (typeof PLAYER_ROLES)[number];
export type Checkpoint = (typeof CHECKPOINTS)[number];
export type FixtureStatus = "scheduled" | "played";

export type PlayerCareerRecord = {
  appearances: number;
  starts: number;
  subAppearances: number;
  tries: number;
  lineBreaks: number;
  tacklesMade: number;
  tacklesMissed: number;
  distanceCovered: number;
  distanceCarried: number;
  successfulPasses: number;
  totalPasses: number;
  successfulKicks: number;
  totalKicks: number;
  penaltiesConceded: number;
  knockOns: number;
};

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

export type Player = {
  id: string;
  name: string;
  age: number;
  role: PlayerRole;
  attack: number;
  defence: number;
  fitness: number;
  injury: PlayerInjury | null;
  careerRecord: PlayerCareerRecord;
};

export type Club = {
  id: string;
  name: string;
  color: string;
  reputation: number;
  squad: Player[];
  staffLevel: number;
  facilityLevel: number;
  facilities: Facilities;
  balance: number;
  trainingPlan: TrainingPlan;
};

export type FixturePlayerPerformance = {
  playerId: string;
  clubId: string;
  name: string;
  number: number;
  role: string;
  started: boolean;
  stats: PlayerStats;
};

export type MatchResult = {
  homeScore: number;
  awayScore: number;
  homeTries?: number;
  awayTries?: number;
  homeTeamStats?: TeamMatchStats;
  awayTeamStats?: TeamMatchStats;
  players?: FixturePlayerPerformance[];
};

export type Fixture = {
  id: string;
  round: number;
  date: string;
  seed: number;
  homeClubId: string;
  awayClubId: string;
  status: FixtureStatus;
  result: MatchResult | null;
};

export type BlockingEvent = {
  id: string;
  title: string;
  message: string;
};

export type MatchReportData = {
  round: number;
  homeClubId: string;
  awayClubId: string;
  homeClubName: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  homeTeamStats?: TeamMatchStats;
  awayTeamStats?: TeamMatchStats;
  players: FixturePlayerPerformance[];
};

export type InboxMessage = BlockingEvent & {
  read: boolean;
  matchReport?: MatchReportData;
};

export type Career = {
  id: string;
  manager: { name: string };
  managedClubId: string;
  season: {
    id: string;
    name: string;
    clubs: Club[];
    fixtures: Fixture[];
  };
  currentRound: number;
  currentDate: string;
  checkpoint: Checkpoint;
  pendingEvent: BlockingEvent | null;
  inbox: InboxMessage[];
};

export type Standing = {
  clubId: string;
  clubName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  tablePoints: number;
};

const FIRST_NAMES = [
  "Callum",
  "Finn",
  "Rory",
  "Ellis",
  "Tom",
  "Owen",
  "Jack",
  "Liam",
  "Sam",
  "Ben",
  "Max",
  "Theo",
  "Jacob",
  "Freddie",
  "Alfie",
  "George",
  "Charlie",
  "Harry",
  "Archie",
  "Leo",
  "Isaac",
  "Elliot",
  "Mason",
  "Dylan",
] as const;
const LAST_NAMES = [
  "Morgan",
  "Davies",
  "Evans",
  "Thomas",
  "Williams",
  "Jones",
  "Taylor",
  "Roberts",
  "Lewis",
  "Hughes",
  "Price",
  "Reed",
  "Bennett",
  "Clarke",
  "Foster",
  "Griffiths",
  "Hall",
  "James",
  "Lloyd",
  "Morris",
  "Parker",
  "Shaw",
  "Turner",
  "Walker",
] as const;

function dateForRound(round: number): string {
  const date = new Date(Date.UTC(2026, 7, 15 + (round - 1) * 7));
  return date.toISOString().slice(0, 10);
}

function mondayForRound(round: number): string {
  const date = new Date(`${dateForRound(round)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 5);
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function createClubs(): Club[] {
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

function createFixtures(): Fixture[] {
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

export function clubToTeamDefinition(club: Club): TeamDefinition {
  const defaultSkills: PlayerSkills = {
    decision: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
    handling: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
    passing: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
    kicking: Math.min(0.95, 0.5 + (club.reputation / 100) * 0.35),
    tackling: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
  };

  const playerOverrides: TeamDefinition["playerOverrides"] = {};
  club.squad.forEach((player, index) => {
    const jerseyNumber = index + 1;
    playerOverrides[jerseyNumber] = {
      speedMultiplier: 0.88 + (player.fitness / 100) * 0.24,
      weightMultiplier: 0.9 + (player.defence / 100) * 0.2,
      skills: {
        decision: Math.max(
          0.1,
          Math.min(0.99, (player.attack * 0.5 + player.defence * 0.5) / 100),
        ),
        handling: Math.max(0.1, Math.min(0.99, player.attack / 100)),
        passing: Math.max(0.1, Math.min(0.99, player.attack / 100)),
        kicking: Math.max(
          0.1,
          Math.min(0.99, (player.attack * 0.8 + 15) / 100),
        ),
        tackling: Math.max(0.1, Math.min(0.99, player.defence / 100)),
      },
    };
  });

  return {
    name: club.name,
    color: club.color,
    lineSpeed: 3.6 + (club.staffLevel - 1) * 0.5,
    tendencies: { carry: 0.48, pass: 0.32, kick: 0.2, maul: 0.5 },
    formationVariation: 0,
    speedMultiplier: 0.92 + (club.facilityLevel - 1) * 0.08,
    weightMultiplier: 0.92 + (club.staffLevel - 1) * 0.08,
    formations: {
      kickoffAttack: "balanced",
      kickoffDefence: "deep",
      openAttack: "balanced",
      openDefence: "connected",
      lineoutMembers: 6,
      lineoutNonParticipants: "backline",
      scrumAttack: "openSide",
      scrumDefence: "drift",
    },
    customFormations: {},
    defaultSkills,
    playerOverrides,
  };
}

export const roleName = (role: string) =>
  role
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());

export function createMatchInputForFixture(
  career: Career,
  fixture: Fixture,
): MatchInput {
  const home = career.season.clubs.find((c) => c.id === fixture.homeClubId);
  const away = career.season.clubs.find((c) => c.id === fixture.awayClubId);
  if (!home || !away) {
    throw new Error(`Clubs for fixture ${fixture.id} not found`);
  }

  return {
    teams: {
      0: clubToTeamDefinition(home),
      1: clubToTeamDefinition(away),
    },
    entrants: {
      0: {
        starters: home.squad.slice(0, 15).map((p) => p.id),
        substitutes: home.squad.slice(15, 23).map((p) => p.id),
      },
      1: {
        starters: away.squad.slice(0, 15).map((p) => p.id),
        substitutes: away.squad.slice(15, 23).map((p) => p.id),
      },
    },
  };
}

export const ROLE_GROUPS: Record<PlayerRole, string> = {
  loosehead: "prop",
  prop: "prop",
  tighthead: "prop",
  hooker: "hooker",
  lock: "lock",
  blindside: "backRow",
  openside: "backRow",
  number8: "backRow",
  backRow: "backRow",
  scrumHalf: "scrumHalf",
  flyHalf: "flyHalf",
  insideCentre: "centre",
  outsideCentre: "centre",
  centre: "centre",
  leftWing: "outsideBack",
  rightWing: "outsideBack",
  fullBack: "outsideBack",
  outsideBack: "outsideBack",
};

export const INJURY_TYPES = [
  "Hamstring strain",
  "Ankle sprain",
  "Dead leg",
  "Shoulder knock",
  "Groin pull",
  "Calf tightness",
  "Rib cartilage injury",
  "Knee hyperextension",
] as const;

export function setClubTrainingPlan(
  career: Career,
  clubId: string,
  plan: Partial<TrainingPlan>,
): Career {
  return {
    ...career,
    season: {
      ...career.season,
      clubs: career.season.clubs.map((club) => {
        if (club.id !== clubId) return club;
        return {
          ...club,
          trainingPlan: { ...club.trainingPlan, ...plan },
        };
      }),
    },
  };
}

export function resolveWeeklyTraining(career: Career): Career {
  let trainingEvent: BlockingEvent | null = null;
  const newInboxMessages: InboxMessage[] = [];

  const updatedClubs = career.season.clubs.map((club) => {
    const isManaged = club.id === career.managedClubId;
    const plan = club.trainingPlan;
    const medLevel = club.facilities?.medicalRoom ?? club.facilityLevel ?? 1;
    const gymLevel = club.facilities?.gym ?? club.staffLevel ?? 1;

    const updatedSquad = club.squad.map((player) => {
      // 1. Process existing injury recovery
      if (player.injury !== null) {
        const recoverySpeed = plan.focus === "recovery" ? 1.5 : 1.0;
        const newRemaining = Math.max(
          0,
          player.injury.weeksRemaining - recoverySpeed,
        );
        if (newRemaining <= 0) {
          if (isManaged) {
            newInboxMessages.push({
              id: `recovery-${player.id}-${career.currentRound}`,
              title: `Injury Recovery: ${player.name}`,
              message: `${player.name} has completed recovery from their ${player.injury.type} and is now available for selection.`,
              read: false,
            });
          }
          return {
            ...player,
            injury: null,
            fitness: Math.min(100, player.fitness + 15),
          };
        }
        return {
          ...player,
          injury: { ...player.injury, weeksRemaining: Math.ceil(newRemaining) },
          fitness: Math.min(100, player.fitness + 5),
        };
      }

      // 2. Training impact on healthy players
      let fitnessDelta = 0;
      let attackDelta = 0;
      let defenceDelta = 0;

      if (plan.intensity === "light") fitnessDelta += 10;
      else if (plan.intensity === "medium") fitnessDelta += 2;
      else if (plan.intensity === "high") fitnessDelta -= 8;

      if (plan.focus === "recovery") fitnessDelta += 14;
      else if (plan.focus === "conditioning") fitnessDelta += 8;
      else if (plan.focus === "strength") {
        attackDelta += Math.random() < 0.3 + gymLevel * 0.1 ? 1 : 0;
        defenceDelta += Math.random() < 0.3 + gymLevel * 0.1 ? 1 : 0;
      } else if (plan.focus === "attack" || plan.focus === "handling") {
        attackDelta += Math.random() < 0.45 ? 1 : 0;
      } else if (plan.focus === "defence") {
        defenceDelta += Math.random() < 0.45 ? 1 : 0;
      }

      const nextFitness = Math.max(
        25,
        Math.min(100, player.fitness + fitnessDelta),
      );
      const nextAttack = Math.min(99, player.attack + attackDelta);
      const nextDefence = Math.min(99, player.defence + defenceDelta);

      // 3. Roll for training injury
      let injuryRisk = 0.02;
      if (plan.intensity === "light") injuryRisk = 0.005;
      else if (plan.intensity === "high") injuryRisk = 0.06;

      if (plan.focus === "recovery") injuryRisk *= 0.3;
      if (nextFitness < 50) injuryRisk += 0.03;
      injuryRisk = Math.max(0.002, injuryRisk - medLevel * 0.008);

      if (Math.random() < injuryRisk) {
        const injuryType =
          INJURY_TYPES[Math.floor(Math.random() * INJURY_TYPES.length)];
        const weeks = Math.floor(Math.random() * 3) + 1; // 1 to 3 weeks
        const injury: PlayerInjury = {
          type: injuryType,
          weeksRemaining: weeks,
          severity: weeks >= 3 ? "severe" : weeks === 2 ? "moderate" : "minor",
        };

        if (isManaged && !trainingEvent) {
          trainingEvent = {
            id: `training-injury-${player.id}-${career.currentRound}`,
            title: `Training Injury: ${player.name}`,
            message: `${player.name} sustained a ${injuryType} in Tuesday's training session and will be unavailable for ${weeks} week${weeks > 1 ? "s" : ""}.`,
          };
          newInboxMessages.push({ ...trainingEvent, read: false });
        }

        return {
          ...player,
          attack: nextAttack,
          defence: nextDefence,
          fitness: Math.max(20, nextFitness - 15),
          injury,
        };
      }

      return {
        ...player,
        attack: nextAttack,
        defence: nextDefence,
        fitness: nextFitness,
      };
    });

    return { ...club, squad: updatedSquad };
  });

  return {
    ...career,
    season: { ...career.season, clubs: updatedClubs },
    pendingEvent: trainingEvent ?? career.pendingEvent,
    inbox: newInboxMessages.concat(career.inbox),
  };
}

export function optimizeSquadSelection(
  career: Career,
  clubId: string,
  criteria: "ovr" | "fitness",
): Career {
  return {
    ...career,
    season: {
      ...career.season,
      clubs: career.season.clubs.map((club) => {
        if (club.id !== clubId) return club;

        const scorePlayer = (player: Player) => {
          const ovr = (player.attack + player.defence + player.fitness) / 3;
          return criteria === "ovr" ? ovr : player.fitness * 100 + ovr;
        };

        const available = [...club.squad].sort(
          (a, b) => scorePlayer(b) - scorePlayer(a),
        );
        const assigned: Player[] = [];

        for (let slot = 0; slot < PLAYER_ROLES.length; slot += 1) {
          const requiredRole = PLAYER_ROLES[slot];
          const requiredGroup = ROLE_GROUPS[requiredRole];

          // Pick the highest scoring available non-injured player in matching role group
          let pickIndex = available.findIndex(
            (p) => p.injury === null && ROLE_GROUPS[p.role] === requiredGroup,
          );
          // Fallback to highest scoring available non-injured player
          if (pickIndex === -1) {
            pickIndex = available.findIndex((p) => p.injury === null);
          }
          // Fallback to any available if extreme shortage
          if (pickIndex === -1) {
            pickIndex = 0;
          }

          if (pickIndex >= 0 && pickIndex < available.length) {
            assigned.push(available[pickIndex]);
            available.splice(pickIndex, 1);
          }
        }

        return { ...club, squad: assigned.concat(available) };
      }),
    },
  };
}

export function swapSquadPlayers(
  career: Career,
  clubId: string,
  indexA: number,
  indexB: number,
): Career {
  if (indexA === indexB) return career;
  return {
    ...career,
    season: {
      ...career.season,
      clubs: career.season.clubs.map((club) => {
        if (club.id !== clubId) return club;
        const squad = [...club.squad];
        const temp = squad[indexA];
        squad[indexA] = squad[indexB];
        squad[indexB] = temp;
        return { ...club, squad };
      }),
    },
  };
}

function resolveRound(
  career: Career,
  recordedResults?: Map<
    string,
    { homeScore: number; awayScore: number; resultObj?: MatchResult }
  >,
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
    const simResult = simulateMatch({ input, seed: fixture.seed });

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

        // Starters (0-14) take more fatigue than bench (15-22)
        const isStarter = index < 15;
        const playedInMatch = matchPerf !== undefined;
        const fatigueCost = isStarter ? 18 : playedInMatch ? 10 : 4;
        const nextFitness = Math.max(20, player.fitness - fatigueCost);

        // Match injury check for healthy players who played
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

export function deriveStandings(career: Career): Standing[] {
  const table = new Map(
    career.season.clubs.map((club) => [
      club.id,
      {
        clubId: club.id,
        clubName: club.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDifference: 0,
        tablePoints: 0,
      },
    ]),
  );

  for (const fixture of career.season.fixtures) {
    if (fixture.status !== "played" || fixture.result === null) continue;
    const home = table.get(fixture.homeClubId);
    const away = table.get(fixture.awayClubId);
    if (home === undefined || away === undefined)
      throw new Error("Fixture references unknown club");
    home.played += 1;
    away.played += 1;
    home.pointsFor += fixture.result.homeScore;
    home.pointsAgainst += fixture.result.awayScore;
    away.pointsFor += fixture.result.awayScore;
    away.pointsAgainst += fixture.result.homeScore;
    if (fixture.result.homeScore > fixture.result.awayScore) {
      home.won += 1;
      away.lost += 1;
      home.tablePoints += 4;
    } else if (fixture.result.homeScore < fixture.result.awayScore) {
      away.won += 1;
      home.lost += 1;
      away.tablePoints += 4;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.tablePoints += 2;
      away.tablePoints += 2;
    }
  }

  return [...table.values()]
    .map((standing) => ({
      ...standing,
      pointsDifference: standing.pointsFor - standing.pointsAgainst,
    }))
    .sort(
      (a, b) =>
        b.tablePoints - a.tablePoints ||
        b.pointsDifference - a.pointsDifference ||
        b.pointsFor - a.pointsFor ||
        a.clubId.localeCompare(b.clubId),
    );
}

export function getUpcomingManagedFixture(career: Career): Fixture | null {
  return (
    career.season.fixtures.find(
      (fixture) =>
        fixture.status === "scheduled" &&
        (fixture.homeClubId === career.managedClubId ||
          fixture.awayClubId === career.managedClubId),
    ) ?? null
  );
}
