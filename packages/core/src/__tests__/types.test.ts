// Compilation tests — verify types work correctly
import { describe, it, expect } from 'vitest'
import type {
  LayoutNode, LayoutTree, LayoutIntent, ComponentIntent,
  DataShapeDescriptor, AnalyzerFn, LayoutFn, RendererFn, Viewport
} from '../index'

describe('Core types', () => {
  it('LayoutNode is structurally valid', () => {
    const node: LayoutNode = {
      type: 'text-block',
      bounds: { x: 0, y: 0, width: 100, height: 50 },
      style: { font: 'Inter', fontSize: 16, color: '#000' },
      data: 'Hello world',
    }
    expect(node.type).toBe('text-block')
    expect(node.bounds.width).toBe(100)
  })

  it('LayoutTree can nest children', () => {
    const tree: LayoutTree = {
      type: 'stack',
      bounds: { x: 0, y: 0, width: 800, height: 600 },
      children: [
        { type: 'text-block', bounds: { x: 0, y: 0, width: 800, height: 50 }, data: 'Title' },
        { type: 'bar-chart', bounds: { x: 0, y: 50, width: 800, height: 300 }, data: [1, 2, 3] },
        { type: 'table', bounds: { x: 0, y: 350, width: 800, height: 250 }, data: [] },
      ]
    }
    expect(tree.children).toHaveLength(3)
  })

  it('ComponentIntent has required fields', () => {
    const intent: ComponentIntent = {
      kind: 'line-chart',
      dataSlice: [{ date: '2026-01', value: 42 }],
      priority: 1.0,
      constraints: { minHeight: 200 },
      label: 'Revenue trend',
    }
    expect(intent.priority).toBe(1.0)
  })

  it('LayoutIntent composes components', () => {
    const intent: LayoutIntent = {
      type: 'visualization',
      components: [
        { kind: 'line-chart', dataSlice: [], priority: 1.0 },
        { kind: 'stats-card', dataSlice: {}, priority: 0.5 },
      ]
    }
    expect(intent.components).toHaveLength(2)
  })

  it('DataShapeDescriptor describes data', () => {
    const desc: DataShapeDescriptor = {
      shape: 'timeseries',
      fields: ['date', 'revenue', 'cost'],
      dateField: 'date',
      valueFields: ['revenue', 'cost'],
      rowCount: 365,
    }
    expect(desc.shape).toBe('timeseries')
  })

  it('Function signatures type-check', () => {
    // These just need to compile — runtime doesn't matter
    const mockAnalyzer: AnalyzerFn = (_data, _intent) => ({
      type: 'visualization',
      components: []
    })
    const mockLayout: LayoutFn = (_intent, viewport) => ({
      type: 'stack',
      bounds: { x: 0, y: 0, width: viewport.width, height: viewport.height }
    })
    const mockRenderer: RendererFn = (_tree, _target) => {}

    const viewport: Viewport = { width: 800, height: 600 }
    const intent = mockAnalyzer({}, 'visualize', viewport)
    const tree = mockLayout(intent, viewport)
    mockRenderer(tree, null)

    expect(intent.type).toBe('visualization')
    expect(tree.bounds.width).toBe(800)
  })
})
