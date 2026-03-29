// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, update } from '../render'
import type { LayoutTree, LayoutNode } from '@contextual-ui/core'

function makeNode(overrides: Partial<LayoutNode> & { type: LayoutNode['type'] }): LayoutNode {
  return {
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    ...overrides,
  }
}

function makeTree(overrides: Partial<LayoutTree> = {}): LayoutTree {
  return {
    type: 'stack',
    bounds: { x: 0, y: 0, width: 800, height: 600 },
    ...overrides,
  }
}

describe('render', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('creates DOM elements in container', () => {
    const tree = makeTree()
    render(tree, container)

    expect(container.children.length).toBe(1)
    expect(container.style.position).toBe('relative')
  })

  it('positions elements with absolute positioning', () => {
    const tree = makeTree({
      children: [
        makeNode({ type: 'text-block', bounds: { x: 10, y: 20, width: 300, height: 50 }, data: 'Hello' }),
      ],
    })

    render(tree, container)

    const root = container.firstElementChild as HTMLElement
    const child = root.firstElementChild as HTMLElement
    expect(child.style.position).toBe('absolute')
    expect(child.style.left).toBe('10px')
    expect(child.style.top).toBe('20px')
    expect(child.style.width).toBe('300px')
    expect(child.style.height).toBe('50px')
  })

  it('renders text-block with text content', () => {
    const tree = makeTree({
      children: [
        makeNode({ type: 'text-block', data: 'Hello World' }),
      ],
    })

    render(tree, container)

    const root = container.firstElementChild as HTMLElement
    const textNode = root.firstElementChild as HTMLElement
    expect(textNode.innerText).toBe('Hello World')
    expect(textNode.classList.contains('cui-text-block')).toBe(true)
  })

  it('renders table with headers and rows', () => {
    const tree = makeTree({
      children: [
        makeNode({
          type: 'table',
          data: [
            { name: 'Alice', age: 30 },
            { name: 'Bob', age: 25 },
          ],
        }),
      ],
    })

    render(tree, container)

    const root = container.firstElementChild as HTMLElement
    const table = root.querySelector('table') as HTMLTableElement
    expect(table).not.toBeNull()

    const headers = table.querySelectorAll('th')
    expect(headers.length).toBe(2)
    expect(headers[0]!.textContent).toBe('name')
    expect(headers[1]!.textContent).toBe('age')

    const rows = table.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
    const cells = rows[0]!.querySelectorAll('td')
    expect(cells[0]!.textContent).toBe('Alice')
    expect(cells[1]!.textContent).toBe('30')
  })

  it('renders stats-card with value and label', () => {
    const tree = makeTree({
      children: [
        makeNode({
          type: 'stats-card',
          data: { value: 42000, label: 'Total Users' },
        }),
      ],
    })

    render(tree, container)

    const root = container.firstElementChild as HTMLElement
    const statsCard = root.firstElementChild as HTMLElement
    const valueEl = statsCard.querySelector('.cui-value') as HTMLElement
    const labelEl = statsCard.querySelector('.cui-label') as HTMLElement
    expect(valueEl.textContent).toBe('42,000')
    expect(labelEl.textContent).toBe('Total Users')
  })

  it('renders definition-list with dt/dd pairs', () => {
    const tree = makeTree({
      children: [
        makeNode({
          type: 'definition-list',
          data: { Name: 'Alice', Role: 'Engineer' },
        }),
      ],
    })

    render(tree, container)

    const root = container.firstElementChild as HTMLElement
    const dl = root.querySelector('dl') as HTMLDListElement
    expect(dl).not.toBeNull()

    const dts = dl.querySelectorAll('dt')
    const dds = dl.querySelectorAll('dd')
    expect(dts.length).toBe(2)
    expect(dds.length).toBe(2)
    expect(dts[0]!.textContent).toBe('Name')
    expect(dds[0]!.textContent).toBe('Alice')
    expect(dts[1]!.textContent).toBe('Role')
    expect(dds[1]!.textContent).toBe('Engineer')
  })

  it('renders card with border styling', () => {
    const tree = makeTree({
      children: [
        makeNode({ type: 'card' }),
      ],
    })

    render(tree, container)

    const root = container.firstElementChild as HTMLElement
    const card = root.firstElementChild as HTMLElement
    expect(card.classList.contains('cui-card')).toBe(true)
    expect(card.style.borderRadius).toBe('8px')
  })

  it('renders json-viewer with formatted JSON', () => {
    const data = { foo: 'bar', num: 42 }
    const tree = makeTree({
      children: [
        makeNode({ type: 'json-viewer', data }),
      ],
    })

    render(tree, container)

    const root = container.firstElementChild as HTMLElement
    const pre = root.querySelector('pre') as HTMLPreElement
    expect(pre).not.toBeNull()
    const code = pre.querySelector('code') as HTMLElement
    expect(code.textContent).toBe(JSON.stringify(data, null, 2))
  })

  it('update clears and re-renders', () => {
    const tree1 = makeTree({
      children: [
        makeNode({ type: 'text-block', data: 'First' }),
      ],
    })
    const tree2 = makeTree({
      children: [
        makeNode({ type: 'text-block', data: 'Second' }),
      ],
    })

    render(tree1, container)
    expect(container.children.length).toBe(1)

    update(tree2, container)
    expect(container.children.length).toBe(1)

    const root = container.firstElementChild as HTMLElement
    const textNode = root.firstElementChild as HTMLElement
    expect(textNode.innerText).toBe('Second')
  })

  it('renders nested tree (stack with children) recursively', () => {
    const tree = makeTree({
      children: [
        makeNode({
          type: 'card',
          bounds: { x: 0, y: 0, width: 400, height: 300 },
          children: [
            makeNode({ type: 'text-block', bounds: { x: 10, y: 10, width: 380, height: 50 }, data: 'Inside card' }),
            makeNode({ type: 'stats-card', bounds: { x: 10, y: 70, width: 380, height: 100 }, data: { value: 99, label: 'Score' } }),
          ],
        }),
      ],
    })

    render(tree, container)

    const root = container.firstElementChild as HTMLElement
    const card = root.firstElementChild as HTMLElement
    expect(card.classList.contains('cui-card')).toBe(true)
    expect(card.children.length).toBe(2)

    const textChild = card.children[0] as HTMLElement
    expect(textChild.innerText).toBe('Inside card')

    const statsChild = card.children[1] as HTMLElement
    const valueEl = statsChild.querySelector('.cui-value') as HTMLElement
    expect(valueEl.textContent).toBe('99')
  })

  it('chart nodes create SVG elements', () => {
    const tree = makeTree({
      children: [
        makeNode({
          type: 'line-chart',
          bounds: { x: 0, y: 0, width: 400, height: 200 },
          data: [{ y: 10 }, { y: 20 }, { y: 15 }],
        }),
        makeNode({
          type: 'bar-chart',
          bounds: { x: 0, y: 210, width: 400, height: 200 },
          data: [5, 10, 8],
        }),
      ],
    })

    render(tree, container)

    const root = container.firstElementChild as HTMLElement
    const lineChart = root.children[0] as HTMLElement
    expect(lineChart.querySelector('svg')).not.toBeNull()
    expect(lineChart.querySelector('polyline')).not.toBeNull()

    const barChart = root.children[1] as HTMLElement
    expect(barChart.querySelector('svg')).not.toBeNull()
    expect(barChart.querySelectorAll('rect').length).toBe(3)
  })
})
