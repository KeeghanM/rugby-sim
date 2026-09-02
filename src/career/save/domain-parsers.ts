import {
  CHECKPOINTS,
  STAFF_NAMES,
  STAFF_ROLES,
  type BlockingEvent,
  type Career,
  type Club,
  type Fixture,
  type InboxMessage,
  type LedgerCategory,
  type LedgerEntry,
  type StaffMember,
  type StaffRole,
} from "../domain/index.ts";
import {
  parseFacilities,
  parsePlayer,
  parseTrainingPlan,
} from "./player-parsers.ts";
import {
  array,
  boolean,
  boundedInteger,
  date,
  integer,
  nullable,
  number,
  record,
  string,
} from "./primitives.ts";

export function parseEvent(value: unknown, path: string): BlockingEvent {
  const input = record(value, path);
  return {
    id: string(input.id, `${path}.id`),
    title: string(input.title, `${path}.title`),
    message: string(input.message, `${path}.message`),
  };
}

export function parseStaffMember(value: unknown, path: string): StaffMember {
  const input = record(value, path);
  const rawRole = string(input.role, `${path}.role`);
  const role = STAFF_ROLES.find((candidate) => candidate === rawRole);
  if (role === undefined) {
    throw new Error(`Invalid career save: ${path}.role is unsupported`);
  }
  return {
    id: string(input.id, `${path}.id`),
    role,
    name: string(input.name, `${path}.name`),
    level: boundedInteger(input.level, `${path}.level`, 1, 5),
    wage: integer(input.wage, `${path}.wage`),
  };
}

export function parseLedgerEntry(value: unknown, path: string): LedgerEntry {
  const input = record(value, path);
  return {
    id: string(input.id, `${path}.id`),
    round: integer(input.round, `${path}.round`),
    date: string(input.date, `${path}.date`),
    category: string(input.category, `${path}.category`) as LedgerCategory,
    description: string(input.description, `${path}.description`),
    amount: number(input.amount, `${path}.amount`),
  };
}

export function parseClub(value: unknown, path: string): Club {
  const input = record(value, path);
  const color = string(input.color, `${path}.color`);
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error(`Invalid career save: ${path}.color is unsupported`);
  }
  const defaultStaff: StaffMember[] = STAFF_ROLES.map((role) => ({
    id: `staff-${string(input.id, `${path}.id`)}-${role}`,
    role,
    name: STAFF_NAMES[role],
    level: 1,
    wage: 1950,
  }));

  return {
    id: string(input.id, `${path}.id`),
    name: string(input.name, `${path}.name`),
    color,
    squad: array(input.squad, `${path}.squad`).map((item, index) =>
      parsePlayer(item, `${path}.squad[${index}]`),
    ),
    staff: Array.isArray(input.staff)
      ? array(input.staff, `${path}.staff`).map((item, index) =>
          parseStaffMember(item, `${path}.staff[${index}]`),
        )
      : defaultStaff,
    staffLevel: integer(input.staffLevel, `${path}.staffLevel`),
    facilityLevel: integer(input.facilityLevel, `${path}.facilityLevel`),
    facilities: parseFacilities(input.facilities, `${path}.facilities`),
    reputation: integer(input.reputation, `${path}.reputation`),
    balance: number(input.balance, `${path}.balance`),
    ledger: Array.isArray(input.ledger)
      ? array(input.ledger, `${path}.ledger`).map((item, index) =>
          parseLedgerEntry(item, `${path}.ledger[${index}]`),
        )
      : [],
    trainingPlan: parseTrainingPlan(input.trainingPlan, `${path}.trainingPlan`),
  };
}

export function parseFixture(value: unknown, path: string): Fixture {
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

export function parseInboxMessage(value: unknown, path: string): InboxMessage {
  const input = record(value, path);
  return {
    ...parseEvent(value, path),
    read: boolean(input.read, `${path}.read`),
    matchReport: input.matchReport as any,
  };
}

export function parseCareer(value: unknown): Career {
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
        parseClub(item, `career.season.clubs[${index}]`),
      ),
      fixtures: array(season.fixtures, "career.season.fixtures").map(
        (item, index) => parseFixture(item, `career.season.fixtures[${index}]`),
      ),
    },
    currentRound: integer(input.currentRound, "career.currentRound", 1),
    currentDate: date(input.currentDate, "career.currentDate"),
    checkpoint,
    pendingEvent: nullable(input.pendingEvent, (item) =>
      parseEvent(item, "career.pendingEvent"),
    ),
    inbox: array(input.inbox, "career.inbox").map((item, index) =>
      parseInboxMessage(item, `career.inbox[${index}]`),
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
  const clubIds = new Set(parsed.season.clubs.map((c) => c.id));
  if (clubIds.size !== parsed.season.clubs.length) {
    throw new Error("Invalid career save: club IDs must be unique");
  }
  const playerIds = parsed.season.clubs.flatMap((c) => {
    if (c.squad.length < 23 || c.squad.length > 50) {
      throw new Error(
        "Invalid career save: every club must have between 23 and 50 players",
      );
    }
    return c.squad.map((playerValue) => playerValue.id);
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
