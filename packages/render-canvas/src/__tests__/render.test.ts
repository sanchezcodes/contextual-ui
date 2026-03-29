import { describe, it, expect } from 'vitest'
import { renderCanvas } from '../render'
import type { LayoutNode } from '@contextual-ui/core'

// ---------------------------------------------------------------------------
// Mock CanvasRenderingContext2D — records every method call
// ---------------------------------------------------------------------------

interface Call {
  method: string
  args: unknown[]
}

function createMockContext() {
  const calls: Call[] = []
  const state: Record<string, unknown> = {
    font: '10px sans-serif',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  }

  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'calls') return calls
      if (prop in state) return state[prop]
      // measureText — return a simple metrics object
      if (prop === 'measureText') {
        return (text: string) => {
          calls.push({ method: 'measureText', args: [text] })
          return { width: text.length * 7 } // rough estimate
        }
      }
      // Everything else returns a recording function
      return (...args: unknown[]) => {
        calls.push({ method: prop, args })
      }
    },
    set(_target, prop: string, value: unknown) {
      state[prop] = value
      calls.push({ method: `set:${prop}`, args: [value] })
      return true
    },
  }

  return new Proxy({} as Record<string, unknown>, handler) as unknown as CanvasRenderingContext2D & {
    calls: Call[]
  }
}

function hasCalls(calls: Call[], method: string): Call[] {
  return calls.filter((c) => c.method === method)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('renderCanvas', () => {
  it('calls fillText for text-block', () => {
    const ctx = createMockContext()
    const tree: LayoutNode = {
      type: 'text-block',
      bounds: { x: 0, y: 0, width: 200, height: 100 },
      data: 'Hello world',
    }
    renderCanvas(tree, ctx)
    const fillTextCalls = hasCalls(ctx.calls, 'fillText')
    expect(fillTextCalls.length).toBeGreaterThan(0)
    expect(fillTextCalls.some((c) => (c.args[0] as string).includes('Hello'))).toBe(true)
  })

  it('calls strokeRect for card', () => {
    const ctx = createMockContext()
    const tree: LayoutNode = {
      type: 'card',
      bounds: { x: 10, y: 10, width: 300, height: 200 },
    }
    renderCanvas(tree, ctx)
    const strokeCalls = hasCalls(ctx.calls, 'stroke')
    expect(strokeCalls.length).toBeGreaterThan(0)
  })

  it('calls fillRect for bar-chart bars', () => {
    const ctx = createMockContext()
    const tree: LayoutNode = {
      type: 'bar-chart',
      bounds: { x: 0, y: 0, width: 400, height: 300 },
      data: [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
        { label: 'C', value: 15 },
      ],
    }
    renderCanvas(tree, ctx)
    const fillRectCalls = hasCalls(ctx.calls, 'fillRect')
    expect(fillRectCalls.length).toBe(3)
  })

  it('calls moveTo/lineTo for line-chart', () => {
    const ctx = createMockContext()
    const tree: LayoutNode = {
      type: 'line-chart',
      bounds: { x: 0, y: 0, width: 400, height: 300 },
      data: [
        { x: 0, y: 5 },
        { x: 1, y: 10 },
        { x: 2, y: 3 },
      ],
    }
    renderCanvas(tree, ctx)
    const moveToCalls = hasCalls(ctx.calls, 'moveTo')
    const lineToCalls = hasCalls(ctx.calls, 'lineTo')
    // At least the axis moveTo + data moveTo
    expect(moveToCalls.length).toBeGreaterThanOrEqual(2)
    // At least axis lineTo + data lineTo
    expect(lineToCalls.length).toBeGreaterThanOrEqual(3)
  })

  it('handles nested children (stack/grid)', () => {
    const ctx = createMockContext()
    const tree: LayoutNode = {
      type: 'stack',
      bounds: { x: 0, y: 0, width: 800, height: 600 },
      children: [
        {
          type: 'text-block',
          bounds: { x: 0, y: 0, width: 800, height: 100 },
          data: 'Title',
        },
        {
          type: 'grid',
          bounds: { x: 0, y: 100, width: 800, height: 500 },
          children: [
            {
              type: 'text-block',
              bounds: { x: 0, y: 100, width: 400, height: 250 },
              data: 'Cell 1',
            },
            {
              type: 'text-block',
              bounds: { x: 400, y: 100, width: 400, height: 250 },
              data: 'Cell 2',
            },
          ],
        },
      ],
    }
    renderCanvas(tree, ctx)
    const fillTextCalls = hasCalls(ctx.calls, 'fillText')
    // Should have text from all 3 text-block nodes
    expect(fillTextCalls.length).toBeGreaterThanOrEqual(3)
    const texts = fillTextCalls.map((c) => c.args[0] as string)
    expect(texts).toContain('Title')
    expect(texts).toContain('Cell 1')
    expect(texts).toContain('Cell 2')
  })

  it('applies font from style', () => {
    const ctx = createMockContext()
    const tree: LayoutNode = {
      type: 'text-block',
      bounds: { x: 0, y: 0, width: 200, height: 100 },
      style: { font: '20px Georgia' },
      data: 'Styled text',
    }
    renderCanvas(tree, ctx)
    const fontSets = ctx.calls.filter((c) => c.method === 'set:font')
    expect(fontSets.some((c) => c.args[0] === '20px Georgia')).toBe(true)
  })

  it('applies color from style', () => {
    const ctx = createMockContext()
    const tree: LayoutNode = {
      type: 'text-block',
      bounds: { x: 0, y: 0, width: 200, height: 100 },
      style: { color: '#FF0000' },
      data: 'Red text',
    }
    renderCanvas(tree, ctx)
    const fillStyleSets = ctx.calls.filter((c) => c.method === 'set:fillStyle')
    expect(fillStyleSets.some((c) => c.args[0] === '#FF0000')).toBe(true)
  })

  it('handles empty tree gracefully (stack with no children)', () => {
    const ctx = createMockContext()
    const tree: LayoutNode = {
      type: 'stack',
      bounds: { x: 0, y: 0, width: 800, height: 600 },
    }
    // Should not throw
    renderCanvas(tree, ctx)
    // No drawing calls expected (aside from possible property sets)
    const drawCalls = ctx.calls.filter(
      (c) => !c.method.startsWith('set:') && c.method !== 'measureText',
    )
    expect(drawCalls.length).toBe(0)
  })
})
