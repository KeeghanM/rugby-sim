export function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid career save: ${path} must be an object`)
  }
  return value as Record<string, unknown>
}

export function string(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid career save: ${path} must be a string`)
  return value
}

export function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid career save: ${path} must be a finite number`)
  }
  return value
}

export function integer(value: unknown, path: string, min = 0): number {
  const parsed = number(value, path)
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`Invalid career save: ${path} must be an integer >= ${min}`)
  }
  return parsed
}

export function boundedInteger(value: unknown, path: string, min: number, max: number): number {
  const parsed = integer(value, path, min)
  if (parsed > max) {
    throw new Error(`Invalid career save: ${path} must be <= ${max}`)
  }
  return parsed
}

export function date(value: unknown, path: string): string {
  const parsed = string(value, path)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed) || Number.isNaN(Date.parse(parsed))) {
    throw new Error(`Invalid career save: ${path} must be an ISO date`)
  }
  return parsed
}

export function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid career save: ${path} must be boolean`)
  return value
}

export function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid career save: ${path} must be an array`)
  return value
}

export function nullable<T>(value: unknown, parse: (input: unknown) => T): T | null {
  return value === null ? null : parse(value)
}
