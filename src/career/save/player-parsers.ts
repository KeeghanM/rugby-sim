import {
  createInitialCareerRecord,
  PLAYER_ROLES,
  TRAINING_FOCUSES,
  TRAINING_INTENSITIES,
  type Facilities,
  type Player,
  type PlayerCareerRecord,
  type PlayerInjury,
  type TrainingPlan,
} from "../domain/index.ts";
import {
  boundedInteger,
  integer,
  nullable,
  number,
  record,
  string,
} from "./primitives.ts";

export function parsePlayerInjury(value: unknown, path: string): PlayerInjury {
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

export function parsePlayerCareerRecord(
  value: unknown,
  path: string,
): PlayerCareerRecord {
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

export function parsePlayer(value: unknown, path: string): Player {
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
      parsePlayerInjury(item, `${path}.injury`),
    ),
    careerRecord: parsePlayerCareerRecord(
      input.careerRecord,
      `${path}.careerRecord`,
    ),
  };
}

export function parseFacilities(value: unknown, path: string): Facilities {
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

export function parseTrainingPlan(value: unknown, path: string): TrainingPlan {
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
