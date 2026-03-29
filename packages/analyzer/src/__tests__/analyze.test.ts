import { describe, it, expect } from 'vitest'
import { analyze } from '../analyze'

describe('analyze', () => {
  // --- timeseries + visualize → line-chart ---
  it('returns line-chart for timeseries + visualize', () => {
    const data = [
      { date: '2026-01', revenue: 100 },
      { date: '2026-02', revenue: 200 },
    ]
    const result = analyze(data, 'visualize')
    expect(result.type).toBe('visualization')
    expect(result.components[0]!.kind).toBe('line-chart')
    expect(result.components[0]!.priority).toBe(1.0)
  })

  // --- categorical + visualize → bar-chart ---
  it('returns bar-chart for categorical + visualize', () => {
    const data = [
      { category: 'A', value: 10 },
      { category: 'B', value: 20 },
      { category: 'A', value: 15 },
      { category: 'B', value: 25 },
    ]
    const result = analyze(data, 'chart')
    expect(result.type).toBe('visualization')
    expect(result.components[0]!.kind).toBe('bar-chart')
  })

  // --- tabular + list → table ---
  it('returns table for tabular + list', () => {
    const data = [
      { name: 'Alice', age: 30, city: 'NYC' },
      { name: 'Bob', age: 25, city: 'LA' },
    ]
    const result = analyze(data, 'list')
    expect(result.type).toBe('list')
    expect(result.components[0]!.kind).toBe('table')
  })

  // --- single-record + detail → definition-list ---
  it('returns definition-list for single-record + detail', () => {
    const data = { name: 'Alice', age: 30, address: { city: 'NYC' } }
    const result = analyze(data, 'detail')
    expect(result.type).toBe('detail')
    expect(result.components[0]!.kind).toBe('definition-list')
  })

  // --- text-blob + detail → text-block ---
  it('returns text-block for text-blob + detail', () => {
    const data = 'A long block of text content.'
    const result = analyze(data, 'view')
    expect(result.type).toBe('detail')
    expect(result.components[0]!.kind).toBe('text-block')
  })

  // --- key-value + summarize → stats-card ---
  it('returns stats-card for key-value + summarize', () => {
    const data = { temperature: 72, humidity: 45, pressure: 1013 }
    const result = analyze(data, 'summary')
    expect(result.type).toBe('summary')
    expect(result.components[0]!.kind).toBe('stats-card')
  })

  // --- unknown + anything → json-viewer ---
  it('returns json-viewer for unknown data', () => {
    const result = analyze(null, 'visualize')
    expect(result.components[0]!.kind).toBe('json-viewer')
  })

  it('returns json-viewer for undefined data', () => {
    const result = analyze(undefined, 'list')
    expect(result.components[0]!.kind).toBe('json-viewer')
  })

  // --- dataSlice is passed through ---
  it('passes data through as dataSlice', () => {
    const data = [
      { date: '2026-01', value: 42 },
      { date: '2026-02', value: 84 },
    ]
    const result = analyze(data, 'visualize')
    expect(result.components[0]!.dataSlice).toBe(data)
  })

  // --- priority values ---
  it('assigns correct priority values (primary + secondary)', () => {
    const data = [
      { date: '2026-01', value: 42 },
      { date: '2026-02', value: 84 },
    ]
    const result = analyze(data, 'summarize')
    expect(result.components).toHaveLength(2)
    expect(result.components[0]!.priority).toBe(1.0)
    expect(result.components[1]!.priority).toBe(0.5)
  })

  // --- comparison shape ---
  it('returns split-view for comparison + compare', () => {
    const data = {
      before: [1, 2, 3],
      after: [4, 5, 6],
    }
    const result = analyze(data, 'compare')
    expect(result.type).toBe('comparison')
    expect(result.components[0]!.kind).toBe('split-view')
  })

  // --- labels are generated ---
  it('generates labels on components', () => {
    const data = [
      { date: '2026-01', revenue: 100 },
      { date: '2026-02', revenue: 200 },
    ]
    const result = analyze(data, 'visualize')
    expect(result.components[0]!.label).toBeDefined()
    expect(typeof result.components[0]!.label).toBe('string')
    expect(result.components[0]!.label!.length).toBeGreaterThan(0)
  })
})
