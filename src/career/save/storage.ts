import { CAREER_CONTENT_VERSION, CAREER_SIMULATION_VERSION, type Career } from '../domain/index.ts'
import { parseCareer } from './domain-parsers.ts'
import { integer, record, string } from './primitives.ts'

export const CAREER_SAVE_KEY = 'rugby-sim.career'
export const CAREER_SCHEMA_VERSION = 1

export type CareerSaveEnvelope = {
  schemaVersion: number
  savedAt: string
  simulationVersion: string
  contentVersion: string
  career: Career
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): StorageLike {
  if (typeof localStorage === 'undefined') throw new Error('localStorage is unavailable')
  return localStorage
}

export function parseCareerSave(json: string): CareerSaveEnvelope {
  let raw: unknown
  try {
    raw = JSON.parse(json) as unknown
  } catch {
    throw new Error('Invalid career save: malformed JSON')
  }
  const input = record(raw, 'save')
  const schemaVersion = integer(input.schemaVersion, 'save.schemaVersion', 1)
  const simulationVersion = string(input.simulationVersion, 'save.simulationVersion')
  const contentVersion = string(input.contentVersion, 'save.contentVersion')
  if (schemaVersion !== CAREER_SCHEMA_VERSION) throw new Error('Unsupported career save schema')
  if (simulationVersion !== CAREER_SIMULATION_VERSION) {
    throw new Error('Unsupported career simulation version')
  }
  if (contentVersion !== CAREER_CONTENT_VERSION) throw new Error('Unsupported career content version')
  const savedAt = string(input.savedAt, 'save.savedAt')
  if (Number.isNaN(Date.parse(savedAt))) throw new Error('Invalid career save: savedAt is not a date')
  return {
    schemaVersion,
    savedAt,
    simulationVersion,
    contentVersion,
    career: parseCareer(input.career),
  }
}

export function saveCareer(careerValue: Career, storage: StorageLike = defaultStorage()): void {
  const envelope: CareerSaveEnvelope = {
    schemaVersion: CAREER_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    simulationVersion: CAREER_SIMULATION_VERSION,
    contentVersion: CAREER_CONTENT_VERSION,
    career: careerValue,
  }
  storage.setItem(CAREER_SAVE_KEY, JSON.stringify(envelope))
}

export function loadCareer(storage: StorageLike = defaultStorage()): Career | null {
  const saved = storage.getItem(CAREER_SAVE_KEY)
  return saved === null ? null : parseCareerSave(saved).career
}

export function deleteCareer(storage: StorageLike = defaultStorage()): void {
  storage.removeItem(CAREER_SAVE_KEY)
}

export function hasCareer(storage: StorageLike = defaultStorage()): boolean {
  return storage.getItem(CAREER_SAVE_KEY) !== null
}
