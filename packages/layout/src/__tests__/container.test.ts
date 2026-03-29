import { describe, it, expect } from 'vitest'
import { layoutContainer, chooseDirection } from '../container'
import type { SizedComponent } from '../size'
import type { ComponentIntent } from '@contextual-ui/core'

function makeSized(
  width: number,
  height: number,
  priority = 1.0,
  kind: ComponentIntent['kind'] = 'text-block',
): SizedComponent {
  return {
    intent: { kind, dataSlice: '', priority },
    width,
    height,
  }
}

const viewport = { width: 1200, height: 800 }

describe('layoutContainer', () => {
  it('vertical: children stack with Y accumulating', () => {
    const children = [
      makeSized(1200, 100),
      makeSized(1200, 200),
      makeSized(1200, 150),
    ]
    const rects = layoutContainer(children, viewport, 'vertical')

    expect(rects).toHaveLength(3)
    expect(rects[0]!.y).toBe(0)
    expect(rects[1]!.y).toBe(100 + 16) // first height + gap
    expect(rects[2]!.y).toBe(100 + 16 + 200 + 16) // cumulative
  })

  it('horizontal: width split by priority', () => {
    const children = [
      makeSized(600, 200, 1.0),
      makeSized(600, 200, 1.0),
    ]
    const rects = layoutContainer(children, viewport, 'horizontal')

    expect(rects).toHaveLength(2)
    // Each should get roughly half the available width (minus gap)
    const totalWidth = rects[0]!.width + rects[1]!.width + 16
    expect(totalWidth).toBe(viewport.width)
    // Equal priority → equal width
    expect(rects[0]!.width).toBe(rects[1]!.width)
  })

  it('horizontal: unequal priority gives unequal width', () => {
    const children = [
      makeSized(600, 200, 2.0), // 2/3 of width
      makeSized(600, 200, 1.0), // 1/3 of width
    ]
    const rects = layoutContainer(children, viewport, 'horizontal')

    expect(rects[0]!.width).toBeGreaterThan(rects[1]!.width)
  })

  it('grid: auto-columns based on viewport', () => {
    const children = [
      makeSized(250, 100),
      makeSized(250, 100),
      makeSized(250, 100),
      makeSized(250, 100),
    ]
    const rects = layoutContainer(children, viewport, 'grid')

    expect(rects).toHaveLength(4)
    // With 1200px viewport and 250px min cells, should fit 4 columns
    // All 4 should be on the same row (y=0)
    expect(rects[0]!.y).toBe(0)
    expect(rects[1]!.y).toBe(0)
  })

  it('gap applied between children in vertical', () => {
    const children = [
      makeSized(1200, 50),
      makeSized(1200, 50),
    ]
    const rects = layoutContainer(children, viewport, 'vertical')

    const gap = rects[1]!.y - (rects[0]!.y + rects[0]!.height)
    expect(gap).toBe(16)
  })

  it('single child gets full viewport width', () => {
    const children = [makeSized(1200, 100)]
    const rects = layoutContainer(children, viewport, 'vertical')

    expect(rects).toHaveLength(1)
    expect(rects[0]!.width).toBe(viewport.width)
    expect(rects[0]!.x).toBe(0)
    expect(rects[0]!.y).toBe(0)
  })

  it('empty children returns empty array', () => {
    const rects = layoutContainer([], viewport, 'vertical')
    expect(rects).toHaveLength(0)
  })
})

describe('chooseDirection', () => {
  it('single component → vertical', () => {
    expect(chooseDirection([makeSized(800, 300)])).toBe('vertical')
  })

  it('2 components with similar priority → horizontal', () => {
    const children = [makeSized(400, 200, 1.0), makeSized(400, 200, 1.0)]
    expect(chooseDirection(children)).toBe('horizontal')
  })

  it('2 components with different priorities → vertical', () => {
    const children = [makeSized(400, 200, 1.0), makeSized(400, 200, 0.5)]
    expect(chooseDirection(children)).toBe('vertical')
  })

  it('4+ small components → grid', () => {
    const children = Array.from({ length: 4 }, () =>
      makeSized(250, 100),
    )
    expect(chooseDirection(children)).toBe('grid')
  })
})
