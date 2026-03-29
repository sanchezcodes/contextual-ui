import { describe, it, expect } from 'vitest'
import { detectShape } from '../detect'

describe('detectShape', () => {
  // --- Timeseries ---
  it('detects timeseries (ISO date + numeric value)', () => {
    const data = [
      { date: '2026-01', revenue: 100 },
      { date: '2026-02', revenue: 200 },
      { date: '2026-03', revenue: 150 },
    ]
    const result = detectShape(data)
    expect(result.shape).toBe('timeseries')
    expect(result.dateField).toBe('date')
    expect(result.valueFields).toContain('revenue')
    expect(result.rowCount).toBe(3)
  })

  it('detects timeseries with timestamp field name', () => {
    const data = [
      { created_at: '2026-01-01', count: 5 },
      { created_at: '2026-01-02', count: 12 },
    ]
    const result = detectShape(data)
    expect(result.shape).toBe('timeseries')
    expect(result.dateField).toBe('created_at')
  })

  it('detects timeseries with year values', () => {
    const data = [
      { year: 2024, sales: 1000 },
      { year: 2025, sales: 1200 },
      { year: 2026, sales: 1500 },
    ]
    const result = detectShape(data)
    expect(result.shape).toBe('timeseries')
    expect(result.dateField).toBe('year')
  })

  // --- Categorical ---
  it('detects categorical data', () => {
    const data = [
      { category: 'A', value: 10 },
      { category: 'B', value: 20 },
      { category: 'A', value: 15 },
      { category: 'B', value: 25 },
    ]
    const result = detectShape(data)
    expect(result.shape).toBe('categorical')
    expect(result.categoryField).toBe('category')
    expect(result.valueFields).toContain('value')
  })

  it('detects categorical with name field', () => {
    const data = [
      { name: 'Product X', sales: 100, returns: 5 },
      { name: 'Product X', sales: 120, returns: 3 },
      { name: 'Product Y', sales: 80, returns: 8 },
      { name: 'Product Y', sales: 90, returns: 2 },
    ]
    const result = detectShape(data)
    expect(result.shape).toBe('categorical')
    expect(result.categoryField).toBe('name')
  })

  // --- Tabular ---
  it('detects tabular data (array of objects, 3+ fields)', () => {
    const data = [
      { name: 'Alice', age: 30, city: 'NYC' },
      { name: 'Bob', age: 25, city: 'LA' },
    ]
    const result = detectShape(data)
    expect(result.shape).toBe('tabular')
    expect(result.fields).toEqual(['name', 'age', 'city'])
    expect(result.rowCount).toBe(2)
  })

  // --- Single record ---
  it('detects single-record (plain object with mixed types)', () => {
    const data = { name: 'Alice', age: 30, email: 'alice@example.com', address: { city: 'NYC' } }
    const result = detectShape(data)
    expect(result.shape).toBe('single-record')
    expect(result.fields).toContain('name')
  })

  // --- Text blob ---
  it('detects text-blob from string', () => {
    const data = 'This is a long paragraph of text that describes something in detail.'
    const result = detectShape(data)
    expect(result.shape).toBe('text-blob')
  })

  it('detects text-blob from array of strings', () => {
    const data = ['First paragraph', 'Second paragraph', 'Third paragraph']
    const result = detectShape(data)
    expect(result.shape).toBe('text-blob')
  })

  // --- Key-value ---
  it('detects key-value (object with only scalar values)', () => {
    const data = { temperature: 72, humidity: 45, pressure: 1013 }
    const result = detectShape(data)
    expect(result.shape).toBe('key-value')
    expect(result.fields).toEqual(['temperature', 'humidity', 'pressure'])
  })

  // --- Comparison ---
  it('detects comparison (two arrays)', () => {
    const data = [
      [1, 2, 3],
      [4, 5, 6],
    ]
    const result = detectShape(data)
    expect(result.shape).toBe('comparison')
  })

  it('detects comparison (object with 2 array-valued keys)', () => {
    const data = {
      before: [1, 2, 3],
      after: [4, 5, 6],
    }
    const result = detectShape(data)
    expect(result.shape).toBe('comparison')
    expect(result.fields).toEqual(['before', 'after'])
  })

  // --- Hierarchical ---
  it('detects hierarchical (deeply nested data)', () => {
    const data = {
      company: {
        departments: {
          engineering: {
            teams: ['frontend', 'backend'],
          },
        },
      },
    }
    const result = detectShape(data)
    expect(result.shape).toBe('hierarchical')
  })

  // --- Unknown ---
  it('returns unknown for null', () => {
    expect(detectShape(null).shape).toBe('unknown')
  })

  it('returns unknown for undefined', () => {
    expect(detectShape(undefined).shape).toBe('unknown')
  })

  it('returns unknown for empty array', () => {
    expect(detectShape([]).shape).toBe('unknown')
  })

  // --- Edge cases ---
  it('handles single-element array of objects as tabular', () => {
    const data = [{ a: 1, b: 2, c: 3 }]
    const result = detectShape(data)
    // Single element can't be timeseries or categorical (need >= 2 rows)
    expect(result.shape).toBe('tabular')
  })

  it('handles empty object as unknown', () => {
    const result = detectShape({})
    expect(result.shape).toBe('unknown')
  })

  it('handles object with one key as unknown', () => {
    const result = detectShape({ solo: 42 })
    expect(result.shape).toBe('unknown')
  })
})
