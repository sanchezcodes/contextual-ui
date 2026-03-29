import { describe, it, expect } from 'vitest'
import { layout } from '../layout'
import type { LayoutIntent, Viewport } from '@contextual-ui/core'

const viewport: Viewport = { width: 1024, height: 768 }

describe('layout (end-to-end)', () => {
  it('produces a LayoutTree from a LayoutIntent', () => {
    const intent: LayoutIntent = {
      type: 'visualization',
      components: [
        { kind: 'line-chart', dataSlice: [{ x: 1, y: 2 }], priority: 1.0 },
      ],
    }

    const tree = layout(intent, viewport)
    expect(tree.type).toBe('stack')
    expect(tree.children).toHaveLength(1)
    expect(tree.children![0]!.type).toBe('line-chart')
  })

  it('root node has viewport bounds', () => {
    const intent: LayoutIntent = {
      type: 'detail',
      components: [
        { kind: 'table', dataSlice: [{ a: 1 }], priority: 1.0 },
      ],
    }

    const tree = layout(intent, viewport)
    expect(tree.bounds.x).toBe(0)
    expect(tree.bounds.y).toBe(0)
    expect(tree.bounds.width).toBe(viewport.width)
  })

  it('children have non-overlapping bounds in vertical layout', () => {
    const intent: LayoutIntent = {
      type: 'detail',
      components: [
        { kind: 'text-block', dataSlice: 'Some text', priority: 1.0 },
        { kind: 'table', dataSlice: [{ a: 1 }, { a: 2 }], priority: 0.5 },
      ],
    }

    const tree = layout(intent, viewport)
    const [first, second] = tree.children!

    // second should start after first ends (non-overlapping)
    expect(second!.bounds.y).toBeGreaterThanOrEqual(
      first!.bounds.y + first!.bounds.height,
    )
  })

  it('all bounds are positive', () => {
    const intent: LayoutIntent = {
      type: 'summary',
      components: [
        { kind: 'stats-card', dataSlice: { value: 42 }, priority: 1.0 },
        { kind: 'bar-chart', dataSlice: [], priority: 0.5 },
      ],
    }

    const tree = layout(intent, viewport)
    expect(tree.bounds.width).toBeGreaterThan(0)
    expect(tree.bounds.height).toBeGreaterThan(0)

    for (const child of tree.children ?? []) {
      expect(child.bounds.x).toBeGreaterThanOrEqual(0)
      expect(child.bounds.y).toBeGreaterThanOrEqual(0)
      expect(child.bounds.width).toBeGreaterThan(0)
      expect(child.bounds.height).toBeGreaterThan(0)
    }
  })

  it('integration: analyzer-style output produces valid tree', () => {
    // Simulates what the analyzer would produce for timeseries + summarize
    const intent: LayoutIntent = {
      type: 'summary',
      components: [
        {
          kind: 'stats-card',
          dataSlice: [
            { date: '2026-01', revenue: 100 },
            { date: '2026-02', revenue: 200 },
          ],
          priority: 1.0,
          label: 'Trend over time \u2014 Summary',
        },
        {
          kind: 'line-chart',
          dataSlice: [
            { date: '2026-01', revenue: 100 },
            { date: '2026-02', revenue: 200 },
          ],
          priority: 0.5,
          label: 'Trend over time \u2014 Summary',
        },
      ],
    }

    const tree = layout(intent, viewport)
    expect(tree.type).toBe('stack')
    expect(tree.children).toHaveLength(2)
    expect(tree.children![0]!.type).toBe('stats-card')
    expect(tree.children![1]!.type).toBe('line-chart')

    // Labels preserved in meta
    expect(tree.children![0]!.meta?.['label']).toBe('Trend over time \u2014 Summary')
  })
})
