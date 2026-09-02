import {
  CAREER_CONTENT_VERSION,
  CAREER_SIMULATION_VERSION,
  CHECKPOINTS,
  createInitialCareerRecord,
  PLAYER_ROLES,
  TRAINING_FOCUSES,
  TRAINING_INTENSITIES,
  type BlockingEvent,
  type Career,
  type Club,
  type Facilities,
  type Fixture,
  type FixturePlayerPerformance,
  type InboxMessage,
  type MatchReportData,
  type MatchResult,
  type Player,
  type PlayerCareerRecord,
  type PlayerInjury,
  type TrainingPlan,
} from "./domain.ts";

export const CAREER_SAVE_KEY = "rugby-sim.career";
export const CAREER_SCHEMA_VERSION = 1;

export type CareerSaveEnvelope = {
  schemaVersion: number;
  savedAt: string;
  simulationVersion: string;
  contentVersion: string;
  career: Career;
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike {
  if (typeof localStorage === "undefined")
    throw new Error("localStorage is unavailable");
  return localStorage;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid career save: ${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string")
    throw new Error(`Invalid career save: ${path} must be a string`);
  return value;
}

function number(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid career save: ${path} must be a finite number`);
  }
  return value;
}

function integer(value: unknown, path: string, min = 0): number {
  const parsed = number(value, path);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(
      `Invalid career save: ${path} must be an integer >= ${min}`,
    );
  }
  return parsed;
}

function boundedInteger(
  value: unknown,
  path: string,
  min: number,
  max: number,
): number {
  const parsed = integer(value, path, min);
  if (parsed > max) {
    throw new Error(`Invalid career save: ${path} must be <= ${max}`);
  }
  return parsed;
}

function date(value: unknown, path: string): string {
  const parsed = string(value, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed) || Number.isNaN(Date.parse(parsed))) {
    throw new Error(`Invalid career save: ${path} must be an ISO date`);
  }
  return parsed;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean")
    throw new Error(`Invalid career save: ${path} must be boolean`);
  return value;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value))
    throw new Error(`Invalid career save: ${path} must be an array`);
  return value;
}

function nullable<T>(value: unknown, parse: (input: unknown) => T): T | null {
  return value === null ? null : parse(value);
}

function event(value: unknown, path: string): BlockingEvent {
  const input = record(value, path);
  return {
    id: string(input.id, `${path}.id`),
    title: string(input.title, `${path}.title`),
    message: string(input.message, `${path}.message`),
  };
}

function playerInjury(value: unknown, path: string): PlayerInjury {
  const input = record(value, path);
  const rawSeverity = string(input.severity, `${path}.severity`);
  if (
    rawSeverity !== "minor" &&
    rawSeverity !== "moderate" &&
    rawSeverity !== "severe"
  ) {
    throw new Error(`Invalid career save: ${path}.severity is unsupported`);
  }
  return {
    type: string(input.type, `${path}.type`),
    weeksRemaining: boundedInteger(
      input.weeksRemaining,
      `${path}.weeksRemaining`,
      1,
      20,
    ),
    severity: rawSeverity,
  };
}

function playerCareerRecord(value: unknown, path: string): PlayerCareerRecord {
  if (value === undefined || value === null) {
    return createInitialCareerRecord();
  }
  const input = record(value, path);
  return {
    appearances: integer(input.appearances ?? 0, `${path}.appearances`),
    starts: integer(input.starts ?? 0, `${path}.starts`),
    subAppearances: integer(
      input.subAppearances ?? 0,
      `${path}.subAppearances`,
    ),
    tries: integer(input.tries ?? 0, `${path}.tries`),
    lineBreaks: integer(input.lineBreaks ?? 0, `${path}.lineBreaks`),
    tacklesMade: integer(input.tacklesMade ?? 0, `${path}.tacklesMade`),
    tacklesMissed: integer(input.tacklesMissed ?? 0, `${path}.tacklesMissed`),
    distanceCovered: number(
      input.distanceCovered ?? 0,
      `${path}.distanceCovered`,
    ),
    distanceCarried: number(
      input.distanceCarried ?? 0,
      `${path}.distanceCarried`,
    ),
    successfulPasses: integer(
      input.successfulPasses ?? 0,
      `${path}.successfulPasses`,
    ),
    totalPasses: integer(input.totalPasses ?? 0, `${path}.totalPasses`),
    successfulKicks: integer(
      input.successfulKicks ?? 0,
      `${path}.successfulKicks`,
    ),
    totalKicks: integer(input.totalKicks ?? 0, `${path}.totalKicks`),
    penaltiesConceded: integer(
      input.penaltiesConceded ?? 0,
      `${path}.penaltiesConceded`,
    ),
    knockOns: integer(input.knockOns ?? 0, `${path}.knockOns`),
  };
}

function player(value: unknown, path: string): Player {
  const input = record(value, path);
  const rawRole = string(input.role, `${path}.role`);
  const role = PLAYER_ROLES.find((candidate) => candidate === rawRole);
  if (role === undefined) {
    throw new Error(`Invalid career save: ${path}.role is unsupported`);
  }
  return {
    id: string(input.id, `${path}.id`),
    name: string(input.name, `${path}.name`),
    age: boundedInteger(input.age, `${path}.age`, 17, 45),
    role,
    attack: boundedInteger(input.attack, `${path}.attack`, 0, 100),
    defence: boundedInteger(input.defence, `${path}.defence`, 0, 100),
    fitness: boundedInteger(input.fitness, `${path}.fitness`, 0, 100),
    injury: nullable(input.injury, (item) =>
      playerInjury(item, `${path}.injury`),
    ),
    careerRecord: playerCareerRecord(
      input.careerRecord,
      `${path}.careerRecord`,
    ),
  };
}

function facilities(value: unknown, path: string): Facilities {
  const input = record(value, path);
  return {
    gym: boundedInteger(input.gym, `${path}.gym`, 1, 5),
    trainingGround: boundedInteger(
      input.trainingGround,
      `${path}.trainingGround`,
      1,
      5,
    ),
    medicalRoom: boundedInteger(input.medicalRoom, `${path}.medicalRoom`, 1, 5),
  };
}

function trainingPlan(value: unknown, path: string): TrainingPlan {
  const input = record(value, path);
  const rawFocus = string(input.focus, `${path}.focus`);
  const focus = TRAINING_FOCUSES.find((candidate) => candidate === rawFocus);
  if (focus === undefined) {
    throw new Error(`Invalid career save: ${path}.focus is unsupported`);
  }
  const rawIntensity = string(input.intensity, `${path}.intensity`);
  const intensity = TRAINING_INTENSITIES.find(
    (candidate) => candidate === rawIntensity,
  );
  if (intensity === undefined) {
    throw new Error(`Invalid career save: ${path}.intensity is unsupported`);
  }
  return { focus, intensity };
}

function club(value: unknown, path: string): Club {
  const input = record(value, path);
  const color = string(input.color, `${path}.color`);
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error(`Invalid career save: ${path}.color is unsupported`);
  }
  return {
    id: string(input.id, `${path}.id`),
    name: string(input.name, `${path}.name`),
    color,
    squad: array(input.squad, `${path}.squad`).map((item, index) =>
      player(item, `${path}.squad[${index}]`),
    ),
    staffLevel: integer(input.staffLevel, `${path}.staffLevel`),
    facilityLevel: integer(input.facilityLevel, `${path}.facilityLevel`),
    facilities: facilities(input.facilities, `${path}.facilities`),
    reputation: integer(input.reputation, `${path}.reputation`),
    balance: number(input.balance, `${path}.balance`),
    trainingPlan: trainingPlan(input.trainingPlan, `${path}.trainingPlan`),
  };
}

function fixture(value: unknown, path: string): Fixture {
  const input = record(value, path);
  const status = string(input.status, `${path}.status`);
  if (status !== "scheduled" && status !== "played") {
    throw new Error(`Invalid career save: ${path}.status is unsupported`);
  }
  const result = nullable(input.result, (raw) => {
    const parsed = record(raw, `${path}.result`);
    return {
      homeScore: integer(parsed.homeScore, `${path}.result.homeScore`),
      awayScore: integer(parsed.awayScore, `${path}.result.awayScore`),
      homeTeamStats: parsed.homeTeamStats as any,
      awayTeamStats: parsed.awayTeamStats as any,
      players: parsed.players as any,
    };
  });
  if ((status === "played") !== (result !== null)) {
    throw new Error(`Invalid career save: ${path} status and result disagree`);
  }
  return {
    id: string(input.id, `${path}.id`),
    round: integer(input.round, `${path}.round`, 1),
    date: date(input.date, `${path}.date`),
    seed: integer(input.seed, `${path}.seed`, 1),
    homeClubId: string(input.homeClubId, `${path}.homeClubId`),
    awayClubId: string(input.awayClubId, `${path}.awayClubId`),
    status,
    result,
  };
}

function inboxMessage(value: unknown, path: string): InboxMessage {
  const input = record(value, path);
  return {
    ...event(value, path),
    read: boolean(input.read, `${path}.read`),
    matchReport: input.matchReport as any,
  };
}

function career(value: unknown): Career {
  const input = record(value, "career");
  const manager = record(input.manager, "career.manager");
  const season = record(input.season, "career.season");
  const rawCheckpoint = string(input.checkpoint, "career.checkpoint");
  const checkpoint = CHECKPOINTS.find(
    (candidate) => candidate === rawCheckpoint,
  );
  if (checkpoint === undefined) {
    throw new Error("Invalid career save: career.checkpoint is unsupported");
  }
  const parsed: Career = {
    id: string(input.id, "career.id"),
    manager: { name: string(manager.name, "career.manager.name") },
    managedClubId: string(input.managedClubId, "career.managedClubId"),
    season: {
      id: string(season.id, "career.season.id"),
      name: string(season.name, "career.season.name"),
      clubs: array(season.clubs, "career.season.clubs").map((item, index) =>
        club(item, `career.season.clubs[${index}]`),
      ),
      fixtures: array(season.fixtures, "career.season.fixtures").map(
        (item, index) => fixture(item, `career.season.fixtures[${index}]`),
      ),
    },
    currentRound: integer(input.currentRound, "career.currentRound", 1),
    currentDate: date(input.currentDate, "career.currentDate"),
    checkpoint,
    pendingEvent: nullable(input.pendingEvent, (item) =>
      event(item, "career.pendingEvent"),
    ),
    inbox: array(input.inbox, "career.inbox").map((item, index) =>
      inboxMessage(item, `career.inbox[${index}]`),
    ),
  };
  if (!parsed.season.clubs.some((item) => item.id === parsed.managedClubId)) {
    throw new Error("Invalid career save: managed club does not exist");
  }
  if (
    parsed.season.clubs.length !== 6 ||
    parsed.season.fixtures.length !== 30
  ) {
    throw new Error("Invalid career save: league size is unsupported");
  }
  const clubIds = new Set(parsed.season.clubs.map((club) => club.id));
  if (clubIds.size !== parsed.season.clubs.length) {
    throw new Error("Invalid career save: club IDs must be unique");
  }
  const playerIds = parsed.season.clubs.flatMap((club) => {
    if (club.squad.length !== 23) {
      throw new Error("Invalid career save: every club must have 23 players");
    }
    return club.squad.map((playerValue) => playerValue.id);
  });
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("Invalid career save: player IDs must be unique");
  }
  const fixtureIds = new Set<string>();
  for (const fixtureValue of parsed.season.fixtures) {
    if (
      fixtureIds.has(fixtureValue.id) ||
      fixtureValue.homeClubId === fixtureValue.awayClubId ||
      !clubIds.has(fixtureValue.homeClubId) ||
      !clubIds.has(fixtureValue.awayClubId) ||
      fixtureValue.round > 10
    ) {
      throw new Error("Invalid career save: fixture schedule is inconsistent");
    }
    fixtureIds.add(fixtureValue.id);
  }
  if (parsed.currentRound > 10) {
    throw new Error("Invalid career save: current round is unsupported");
  }
  return parsed;
}

export function parseCareerSave(json: string): CareerSaveEnvelope {
  let raw: unknown;
  try {
    raw = JSON.parse(json) as unknown;
  } catch {
    throw new Error("Invalid career save: malformed JSON");
  }
  const input = record(raw, "save");
  const schemaVersion = integer(input.schemaVersion, "save.schemaVersion", 1);
  const simulationVersion = string(
    input.simulationVersion,
    "save.simulationVersion",
  );
  const contentVersion = string(input.contentVersion, "save.contentVersion");
  if (schemaVersion !== CAREER_SCHEMA_VERSION)
    throw new Error("Unsupported career save schema");
  if (simulationVersion !== CAREER_SIMULATION_VERSION) {
    throw new Error("Unsupported career simulation version");
  }
  if (contentVersion !== CAREER_CONTENT_VERSION)
    throw new Error("Unsupported career content version");
  const savedAt = string(input.savedAt, "save.savedAt");
  if (Number.isNaN(Date.parse(savedAt)))
    throw new Error("Invalid career save: savedAt is not a date");
  return {
    schemaVersion,
    savedAt,
    simulationVersion,
    contentVersion,
    career: career(input.career),
  };
}

export function saveCareer(
  careerValue: Career,
  storage: StorageLike = defaultStorage(),
): void {
  const envelope: CareerSaveEnvelope = {
    schemaVersion: CAREER_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    simulationVersion: CAREER_SIMULATION_VERSION,
    contentVersion: CAREER_CONTENT_VERSION,
    career: careerValue,
  };
  storage.setItem(CAREER_SAVE_KEY, JSON.stringify(envelope));
}

export function loadCareer(
  storage: StorageLike = defaultStorage(),
): Career | null {
  const saved = storage.getItem(CAREER_SAVE_KEY);
  return saved === null ? null : parseCareerSave(saved).career;
}

export function deleteCareer(storage: StorageLike = defaultStorage()): void {
  storage.removeItem(CAREER_SAVE_KEY);
}

export function hasCareer(storage: StorageLike = defaultStorage()): boolean {
  return storage.getItem(CAREER_SAVE_KEY) !== null;
}
