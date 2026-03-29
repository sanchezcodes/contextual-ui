import { describe, it, expect } from 'vitest'
import { sizeComponent } from '../size'
import type { ComponentIntent } from '@contextual-ui/core'

function makeIntent(
  kind: ComponentIntent['kind'],
  dataSlice: unknown = '',
  overrides: Partial<ComponentIntent> = {},
): ComponentIntent {
  return { kind, dataSlice, priority: 1.0, ...overrides }
}

describe('sizeComponent', () => {
  const width = 800

  it('text-block sizing uses text measurement', () => {
    const result = sizeComponent(
      makeIntent('text-block', 'Hello world, this is a text block'),
      width,
    )
    expect(result.width).toBe(width)
    expect(result.height).toBeGreaterThan(0)
  })

  it('chart sizing uses default height', () => {
    for (const kind of ['line-chart', 'bar-chart', 'pie-chart', 'scatter-chart'] as const) {
      const result = sizeComponent(makeIntent(kind, []), width)
      expect(result.width).toBe(width)
      expect(result.height).toBe(300) // CHART_DEFAULT_HEIGHT
    }
  })

  it('chart respects constraints.maxHeight', () => {
    const result = sizeComponent(
      makeIntent('line-chart', [], { constraints: { maxHeight: 500 } }),
      width,
    )
    expect(result.height).toBe(500)
  })

  it('table sizing scales with row count', () => {
    const fewRows = sizeComponent(
      makeIntent('table', [{ a: 1 }, { a: 2 }]),
      width,
    )
    const manyRows = sizeComponent(
      makeIntent('table', Array.from({ length: 15 }, (_, i) => ({ a: i }))),
      width,
    )

    expect(manyRows.height).toBeGreaterThan(fewRows.height)
    // 2 rows: 40 + 2*36 = 112
    expect(fewRows.height).toBe(40 + 2 * 36)
    // 15 rows: 40 + 15*36 = 580
    expect(manyRows.height).toBe(40 + 15 * 36)
  })

  it('table caps visible rows at 20', () => {
    const result = sizeComponent(
      makeIntent('table', Array.from({ length: 100 }, (_, i) => ({ a: i }))),
      width,
    )
    // Max 20 rows: 40 + 20*36 = 760
    expect(result.height).toBe(40 + 20 * 36)
  })

  it('stats-card has fixed height', () => {
    const result = sizeComponent(makeIntent('stats-card', { value: 42 }), width)
    expect(result.height).toBe(100) // STATS_CARD_HEIGHT
    expect(result.width).toBeLessThanOrEqual(250)
  })

  it('card sizing includes padding', () => {
    const result = sizeComponent(
      makeIntent('card', { title: 'My Card', content: 'Some body text' }),
      width,
    )
    expect(result.width).toBe(width)
    // Height should include padding (16*2 = 32) plus text heights
    expect(result.height).toBeGreaterThanOrEqual(32 + 24) // padding + at least one line
  })

  it('definition-list sizing scales with key count', () => {
    const small = sizeComponent(
      makeIntent('definition-list', { a: 1, b: 2 }),
      width,
    )
    const large = sizeComponent(
      makeIntent('definition-list', { a: 1, b: 2, c: 3, d: 4, e: 5 }),
      width,
    )
    expect(large.height).toBeGreaterThan(small.height)
    expect(small.height).toBe(2 * 36) // 2 rows * TABLE_ROW_HEIGHT
    expect(large.height).toBe(5 * 36) // 5 rows * TABLE_ROW_HEIGHT
  })
})
