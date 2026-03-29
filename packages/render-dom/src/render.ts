import type { LayoutTree, LayoutNode, Style } from '@contextual-ui/core'
import { injectStyles } from './styles'
import { renderLineChart, renderBarChart, renderScatterChart } from './charts'

/**
 * Render a LayoutTree into the DOM.
 *
 * Clears the container, injects base styles, then recursively
 * creates absolutely-positioned elements for each node.
 */
export function render(tree: LayoutTree, container: HTMLElement): void {
  injectStyles()
  clearContainer(container)
  container.style.position = 'relative'
  const el = renderNode(tree)
  container.appendChild(el)
}

/**
 * Update: clear and re-render. (Diffing is a future optimization.)
 */
export function update(tree: LayoutTree, container: HTMLElement): void {
  render(tree, container)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Remove all child nodes from an element safely (no innerHTML). */
function clearContainer(el: HTMLElement): void {
  while (el.firstChild) {
    el.removeChild(el.firstChild)
  }
}

function renderNode(node: LayoutNode): HTMLElement {
  const el = createElementForType(node)

  // Positioning
  el.style.position = 'absolute'
  el.style.left = `${node.bounds.x}px`
  el.style.top = `${node.bounds.y}px`
  el.style.width = `${node.bounds.width}px`
  el.style.height = `${node.bounds.height}px`

  // CSS classes
  el.classList.add('cui-node', `cui-${node.type}`)

  // Apply style properties
  if (node.style) {
    applyStyle(el, node.style)
  }

  // Render children recursively for container types
  if (node.children) {
    for (const child of node.children) {
      el.appendChild(renderNode(child))
    }
  }

  return el
}

function createElementForType(node: LayoutNode): HTMLElement {
  switch (node.type) {
    case 'text-block':
      return createTextBlock(node)
    case 'number-display':
      return createNumberDisplay(node)
    case 'line-chart':
      return createChart(node, 'line')
    case 'bar-chart':
      return createChart(node, 'bar')
    case 'pie-chart':
      return createChart(node, 'pie')
    case 'scatter-chart':
      return createChart(node, 'scatter')
    case 'table':
      return createTable(node)
    case 'card':
      return createCard(node)
    case 'stats-card':
      return createStatsCard(node)
    case 'definition-list':
      return createDefinitionList(node)
    case 'split-view':
      return createContainer(node)
    case 'grid':
    case 'stack':
      return createContainer(node)
    case 'json-viewer':
      return createJsonViewer(node)
    case 'image':
      return createImage(node)
    default:
      return document.createElement('div')
  }
}

function createTextBlock(node: LayoutNode): HTMLElement {
  const div = document.createElement('div')
  div.innerText = String(node.data ?? '')
  return div
}

function createNumberDisplay(node: LayoutNode): HTMLElement {
  const div = document.createElement('div')
  const value = typeof node.data === 'number' ? node.data.toLocaleString() : String(node.data ?? '')
  div.innerText = value
  div.style.fontSize = '2em'
  div.style.fontWeight = '700'
  return div
}

function createChart(node: LayoutNode, chartType: 'line' | 'bar' | 'pie' | 'scatter'): HTMLElement {
  const div = document.createElement('div')
  div.classList.add('cui-chart')

  if (!Array.isArray(node.data)) {
    div.innerText = `(${chartType} chart)`
    return div
  }

  const { width, height } = node.bounds

  switch (chartType) {
    case 'line':
      renderLineChart(node.data, div, width, height)
      break
    case 'bar':
      renderBarChart(node.data, div, width, height)
      break
    case 'scatter':
      renderScatterChart(node.data, div, width, height)
      break
    case 'pie':
      div.innerText = '(pie chart)'
      break
  }

  return div
}

function createTable(node: LayoutNode): HTMLElement {
  const table = document.createElement('table')
  table.classList.add('cui-table')

  if (!Array.isArray(node.data) || node.data.length === 0) return table

  const rows = node.data as Record<string, unknown>[]
  const firstRow = rows[0]
  if (typeof firstRow !== 'object' || firstRow === null) return table

  const keys = Object.keys(firstRow)

  // Header row
  const thead = document.createElement('thead')
  const headerRow = document.createElement('tr')
  for (const key of keys) {
    const th = document.createElement('th')
    th.textContent = key
    headerRow.appendChild(th)
  }
  thead.appendChild(headerRow)
  table.appendChild(thead)

  // Data rows
  const tbody = document.createElement('tbody')
  for (const row of rows) {
    const tr = document.createElement('tr')
    const rowObj = row as Record<string, unknown>
    for (const key of keys) {
      const td = document.createElement('td')
      td.textContent = String(rowObj[key] ?? '')
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)

  return table
}

function createCard(node: LayoutNode): HTMLElement {
  const div = document.createElement('div')
  div.style.border = '1px solid #e0e0e0'
  div.style.borderRadius = '8px'
  div.style.padding = '16px'
  div.style.background = '#fff'
  return div
}

function createStatsCard(node: LayoutNode): HTMLElement {
  const div = document.createElement('div')

  let value: string
  let label: string | undefined

  if (typeof node.data === 'object' && node.data !== null) {
    const obj = node.data as Record<string, unknown>
    value =
      typeof obj['value'] === 'number'
        ? obj['value'].toLocaleString()
        : String(obj['value'] ?? '')
    label = typeof obj['label'] === 'string' ? obj['label'] : undefined
  } else if (typeof node.data === 'number') {
    value = node.data.toLocaleString()
  } else {
    value = String(node.data ?? '')
  }

  const valueEl = document.createElement('div')
  valueEl.className = 'cui-value'
  valueEl.textContent = value
  div.appendChild(valueEl)

  if (label) {
    const labelEl = document.createElement('div')
    labelEl.className = 'cui-label'
    labelEl.textContent = label
    div.appendChild(labelEl)
  }

  return div
}

function createDefinitionList(node: LayoutNode): HTMLElement {
  const dl = document.createElement('dl')

  if (typeof node.data !== 'object' || node.data === null) return dl

  const entries = Object.entries(node.data as Record<string, unknown>)
  for (const [key, val] of entries) {
    const dt = document.createElement('dt')
    dt.textContent = key
    dl.appendChild(dt)

    const dd = document.createElement('dd')
    dd.textContent = String(val ?? '')
    dl.appendChild(dd)
  }

  return dl
}

function createContainer(_node: LayoutNode): HTMLElement {
  const div = document.createElement('div')
  div.style.position = 'relative'
  return div
}

function createJsonViewer(node: LayoutNode): HTMLElement {
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  code.textContent = JSON.stringify(node.data, null, 2)
  pre.appendChild(code)
  return pre
}

function createImage(node: LayoutNode): HTMLElement {
  const img = document.createElement('img')
  if (typeof node.data === 'string') {
    img.src = node.data
  }
  img.style.maxWidth = '100%'
  img.style.maxHeight = '100%'
  return img
}

function applyStyle(el: HTMLElement, style: Style): void {
  if (style.font) el.style.fontFamily = style.font
  if (style.fontSize) el.style.fontSize = `${style.fontSize}px`
  if (style.fontWeight) el.style.fontWeight = String(style.fontWeight)
  if (style.color) el.style.color = style.color
  if (style.backgroundColor) el.style.backgroundColor = style.backgroundColor
  if (style.borderRadius) el.style.borderRadius = `${style.borderRadius}px`
  if (style.padding) el.style.padding = `${style.padding}px`
}
