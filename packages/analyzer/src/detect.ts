import type { DataShape, DataShapeDescriptor } from '@contextual-ui/core'

// --- Heuristic helpers ---

const DATE_FIELD_PATTERN =
  /date|time|timestamp|created|updated|month|year|day|week|period/i

const ISO_DATE_PATTERN = /^\d{4}-\d{2}(-\d{2})?(T.*)?$/
const YEAR_PATTERN = /^\d{4}$/

function looksLikeDate(fieldName: string, value: unknown): boolean {
  if (DATE_FIELD_PATTERN.test(fieldName)) return true
  if (typeof value === 'string') {
    if (ISO_DATE_PATTERN.test(value)) return true
    if (YEAR_PATTERN.test(value)) {
      const n = Number(value)
      return n >= 2000 && n <= 2100
    }
  }
  if (typeof value === 'number') {
    return value >= 2000 && value <= 2100
  }
  return false
}

function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') {
    const n = Number(value)
    return value.trim() !== '' && Number.isFinite(n)
  }
  return false
}

function isScalar(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getMaxDepth(value: unknown, current = 0): number {
  if (current > 10) return current // prevent runaway recursion
  if (Array.isArray(value)) {
    let max = current
    for (const item of value) {
      max = Math.max(max, getMaxDepth(item, current + 1))
    }
    return max
  }
  if (isPlainObject(value)) {
    let max = current
    for (const v of Object.values(value)) {
      max = Math.max(max, getMaxDepth(v, current + 1))
    }
    return max
  }
  return current
}

const CATEGORY_FIELD_PATTERN = /category|name|label|type|group|status/i

// --- Shape detectors (order matters: specific → generic) ---

function detectTimeseries(
  rows: Record<string, unknown>[],
): DataShapeDescriptor | null {
  if (rows.length < 2) return null

  const sample = rows[0]!
  const fields = Object.keys(sample)

  let dateField: string | undefined
  const valueFields: string[] = []

  for (const field of fields) {
    const val = sample[field]
    if (!dateField && looksLikeDate(field, val)) {
      dateField = field
    } else if (isNumeric(val)) {
      valueFields.push(field)
    }
  }

  if (dateField && valueFields.length > 0) {
    return {
      shape: 'timeseries',
      fields,
      dateField,
      valueFields,
      rowCount: rows.length,
    }
  }
  return null
}

function detectCategorical(
  rows: Record<string, unknown>[],
): DataShapeDescriptor | null {
  if (rows.length < 2) return null

  const sample = rows[0]!
  const fields = Object.keys(sample)

  let categoryField: string | undefined
  const valueFields: string[] = []

  for (const field of fields) {
    const val = sample[field]
    if (!categoryField && typeof val === 'string' && CATEGORY_FIELD_PATTERN.test(field)) {
      categoryField = field
    } else if (isNumeric(val)) {
      valueFields.push(field)
    }
  }

  if (!categoryField || valueFields.length === 0) return null

  // Check uniqueness ratio: unique categories should be <= 50% of row count.
  // If every row has a unique category, it's not really categorical data.
  const uniqueCategories = new Set(rows.map((r) => r[categoryField!]))
  if (uniqueCategories.size > rows.length * 0.5) return null

  return {
    shape: 'categorical',
    fields,
    categoryField,
    valueFields,
    rowCount: rows.length,
  }
}

function haveUniformKeys(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a).sort()
  const keysB = Object.keys(b).sort()
  if (keysA.length !== keysB.length) return false
  return keysA.every((k, i) => k === keysB[i])
}

function detectComparison(data: unknown): DataShapeDescriptor | null {
  // Array of exactly 2 arrays → comparison
  if (Array.isArray(data) && data.length === 2) {
    const [a, b] = data
    if (Array.isArray(a) && Array.isArray(b)) {
      return { shape: 'comparison' }
    }
    // Two objects with DIFFERENT keys → comparison (same keys = probably a 2-row dataset)
    if (isPlainObject(a) && isPlainObject(b) && !haveUniformKeys(a, b)) {
      return { shape: 'comparison' }
    }
  }
  // Object with exactly 2 keys whose values are arrays
  if (isPlainObject(data)) {
    const keys = Object.keys(data)
    if (keys.length === 2) {
      const [v1, v2] = keys.map((k) => data[k])
      if (Array.isArray(v1) && Array.isArray(v2)) {
        return { shape: 'comparison', fields: keys }
      }
    }
  }
  return null
}

function detectHierarchical(data: unknown): DataShapeDescriptor | null {
  const depth = getMaxDepth(data)
  if (depth > 2) {
    return { shape: 'hierarchical' }
  }
  return null
}

function detectArrayOfObjects(
  data: unknown,
): DataShapeDescriptor | null {
  if (!Array.isArray(data) || data.length === 0) return null
  // Check that all elements are plain objects
  if (!data.every(isPlainObject)) return null

  const sample = data[0]!
  const fields = Object.keys(sample)
  if (fields.length < 3) return null

  return {
    shape: 'tabular',
    fields,
    rowCount: data.length,
  }
}

/**
 * Analyzes raw data and returns a descriptor of its shape.
 *
 * Detection order (most specific → most generic):
 *   unknown → comparison → text-blob → timeseries → categorical →
 *   hierarchical → single-record / key-value → tabular → unknown
 */
export function detectShape(data: unknown): DataShapeDescriptor {
  // 1. Null / undefined / empty
  if (data === null || data === undefined) {
    return { shape: 'unknown' }
  }

  // 2. Text blobs
  if (typeof data === 'string') {
    return { shape: 'text-blob' }
  }
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every((d) => typeof d === 'string')
  ) {
    return { shape: 'text-blob' }
  }

  // 3. Empty array
  if (Array.isArray(data) && data.length === 0) {
    return { shape: 'unknown' }
  }

  // 4. Comparison (exactly 2 comparable items / 2-key object with array values)
  const comparison = detectComparison(data)
  if (comparison) return comparison

  // 5. Array of objects — try specific shapes first
  if (Array.isArray(data) && data.length > 0 && data.every(isPlainObject)) {
    const rows = data as Record<string, unknown>[]

    const ts = detectTimeseries(rows)
    if (ts) return ts

    const cat = detectCategorical(rows)
    if (cat) return cat

    const tabular = detectArrayOfObjects(data)
    if (tabular) return tabular

    // Array of objects with < 3 fields — still tabular-ish
    const sample = rows[0]!
    return {
      shape: 'tabular',
      fields: Object.keys(sample),
      rowCount: rows.length,
    }
  }

  // 6. Single plain object
  if (isPlainObject(data)) {
    // Check hierarchical first
    const hier = detectHierarchical(data)
    if (hier) return hier

    const keys = Object.keys(data)
    if (keys.length < 2) return { shape: 'unknown' }

    // Key-value: all values are scalar
    if (keys.every((k) => isScalar(data[k]))) {
      return { shape: 'key-value', fields: keys }
    }

    // Single record with mixed types
    return { shape: 'single-record', fields: keys }
  }

  // 7. Array of mixed / non-object items (that aren't all strings)
  if (Array.isArray(data)) {
    const hier = detectHierarchical(data)
    if (hier) return hier
  }

  return { shape: 'unknown' }
}
