import { describe, it, expect } from 'vitest'
import { normalizeIntent } from '../intents'

describe('normalizeIntent', () => {
  // --- Exact matches ---
  it('maps "visualize" → visualization', () => {
    expect(normalizeIntent('visualize')).toBe('visualization')
  })

  it('maps "compare" → comparison', () => {
    expect(normalizeIntent('compare')).toBe('comparison')
  })

  it('maps "summarize" → summary', () => {
    expect(normalizeIntent('summarize')).toBe('summary')
  })

  it('maps "explore" → exploration', () => {
    expect(normalizeIntent('explore')).toBe('exploration')
  })

  it('maps "list" → list', () => {
    expect(normalizeIntent('list')).toBe('list')
  })

  // --- Contains matches ---
  it('maps "show chart of sales" → visualization (contains "show chart")', () => {
    expect(normalizeIntent('show chart of sales')).toBe('visualization')
  })

  it('maps "please summarize this data" → summary', () => {
    expect(normalizeIntent('please summarize this data')).toBe('summary')
  })

  // --- Case insensitive ---
  it('handles uppercase "COMPARE" → comparison', () => {
    expect(normalizeIntent('COMPARE')).toBe('comparison')
  })

  it('handles mixed case "Visualize" → visualization', () => {
    expect(normalizeIntent('Visualize')).toBe('visualization')
  })

  // --- Fallback ---
  it('falls back to detail for unrecognized input', () => {
    expect(normalizeIntent('asdfasdf')).toBe('detail')
  })

  it('falls back to detail for empty string', () => {
    expect(normalizeIntent('')).toBe('detail')
  })
})
