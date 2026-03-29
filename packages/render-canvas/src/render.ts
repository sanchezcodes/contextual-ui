import type { LayoutTree, LayoutNode, Style } from '@contextual-ui/core'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_FONT = '14px sans-serif'
const DEFAULT_COLOR = '#000000'
const DEFAULT_LINE_HEIGHT = 1.4

/** Draw a rounded rectangle path (does NOT stroke/fill — caller decides). */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/** Apply a Style to the context. */
function applyStyle(ctx: CanvasRenderingContext2D, style?: Style): void {
  const font = style?.font ?? DEFAULT_FONT
  const color = style?.color ?? DEFAULT_COLOR

  ctx.font = font
  ctx.fillStyle = color
  ctx.strokeStyle = color
}

/** Split text into lines that fit within maxWidth. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    if (paragraph === '') {
      lines.push('')
      continue
    }
    const words = paragraph.split(/\s+/)
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

/** Resolve font size from Style, falling back to 14. */
function fontSize(style?: Style): number {
  return style?.fontSize ?? 14
}

/** Compute line height from font size. */
function lineHeight(style?: Style): number {
  return fontSize(style) * DEFAULT_LINE_HEIGHT
}

// ---------------------------------------------------------------------------
// Per-type renderers
// ---------------------------------------------------------------------------

function renderTextBlock(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  applyStyle(ctx, node.style)
  const text = typeof node.data === 'string' ? node.data : String(node.data ?? '')
  const { x, y, width } = node.bounds
  const lh = lineHeight(node.style)
  const lines = wrapText(ctx, text, width)
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i]!, x, y + lh * (i + 1))
  }
}

function renderNumberDisplay(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const value = String(node.data ?? '')
  const size = Math.min(node.bounds.width / (value.length * 0.6), node.bounds.height * 0.6)
  ctx.font = `bold ${Math.round(size)}px sans-serif`
  ctx.fillStyle = node.style?.color ?? DEFAULT_COLOR
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    value,
    node.bounds.x + node.bounds.width / 2,
    node.bounds.y + node.bounds.height / 2,
  )
  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
}

function renderLineChart(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width, height } = node.bounds
  const pad = 30
  applyStyle(ctx, node.style)

  // Axes
  ctx.beginPath()
  ctx.moveTo(x + pad, y)
  ctx.lineTo(x + pad, y + height - pad)
  ctx.lineTo(x + width, y + height - pad)
  ctx.stroke()

  // Data points
  const points = Array.isArray(node.data) ? (node.data as { x: number; y: number }[]) : []
  if (points.length === 0) return

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1

  const chartW = width - pad
  const chartH = height - pad

  ctx.beginPath()
  for (let i = 0; i < points.length; i++) {
    const px = x + pad + ((points[i]!.x - minX) / rangeX) * chartW
    const py = y + chartH - ((points[i]!.y - minY) / rangeY) * chartH
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
}

function renderBarChart(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width, height } = node.bounds
  const pad = 30
  applyStyle(ctx, node.style)

  const items = Array.isArray(node.data)
    ? (node.data as { label?: string; value: number }[])
    : []
  if (items.length === 0) return

  const maxVal = Math.max(...items.map((d) => d.value), 1)
  const barW = (width - pad) / items.length
  const chartH = height - pad

  for (let i = 0; i < items.length; i++) {
    const barH = (items[i]!.value / maxVal) * chartH
    const bx = x + pad + i * barW
    const by = y + chartH - barH

    ctx.fillStyle = node.style?.color ?? '#4A90D9'
    ctx.fillRect(bx + 2, by, barW - 4, barH)

    // Label below
    if (items[i]!.label) {
      ctx.fillStyle = node.style?.color ?? DEFAULT_COLOR
      ctx.font = `${Math.min(12, barW - 4)}px sans-serif`
      ctx.fillText(items[i]!.label!, bx + 2, y + height - 4)
    }
  }
}

function renderPieChart(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width, height } = node.bounds
  const cx = x + width / 2
  const cy = y + height / 2
  const radius = Math.min(width, height) / 2 - 4

  const slices = Array.isArray(node.data) ? (node.data as { value: number; color?: string }[]) : []
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1

  const colors = ['#4A90D9', '#E87040', '#50B83C', '#9C6ADE', '#F5C542', '#47C1BF']
  let startAngle = -Math.PI / 2

  for (let i = 0; i < slices.length; i++) {
    const sweep = (slices[i]!.value / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, startAngle, startAngle + sweep)
    ctx.closePath()
    ctx.fillStyle = slices[i]!.color ?? colors[i % colors.length]!
    ctx.fill()
    startAngle += sweep
  }
}

function renderScatterChart(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width, height } = node.bounds
  const pad = 30
  applyStyle(ctx, node.style)

  // Axes
  ctx.beginPath()
  ctx.moveTo(x + pad, y)
  ctx.lineTo(x + pad, y + height - pad)
  ctx.lineTo(x + width, y + height - pad)
  ctx.stroke()

  const points = Array.isArray(node.data) ? (node.data as { x: number; y: number }[]) : []
  if (points.length === 0) return

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const chartW = width - pad
  const chartH = height - pad

  for (const pt of points) {
    const px = x + pad + ((pt.x - minX) / rangeX) * chartW
    const py = y + chartH - ((pt.y - minY) / rangeY) * chartH
    ctx.beginPath()
    ctx.arc(px, py, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function renderTable(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width, height } = node.bounds
  applyStyle(ctx, node.style)

  const tableData = node.data as { headers?: string[]; rows?: unknown[][] } | undefined
  const headers = tableData?.headers ?? []
  const rows = tableData?.rows ?? []

  const totalRows = rows.length + (headers.length ? 1 : 0)
  const rowH = totalRows > 0 ? Math.min(height / totalRows, 28) : 28
  const colW = headers.length > 0 ? width / headers.length : width

  let curY = y

  // Header row
  if (headers.length > 0) {
    ctx.font = `bold ${fontSize(node.style)}px sans-serif`
    for (let c = 0; c < headers.length; c++) {
      ctx.strokeRect(x + c * colW, curY, colW, rowH)
      ctx.fillText(headers[c]!, x + c * colW + 4, curY + rowH - 6)
    }
    curY += rowH
  }

  // Data rows
  ctx.font = `${fontSize(node.style)}px sans-serif`
  for (const row of rows) {
    for (let c = 0; c < (row as unknown[]).length; c++) {
      ctx.strokeRect(x + c * colW, curY, colW, rowH)
      ctx.fillText(String((row as unknown[])[c] ?? ''), x + c * colW + 4, curY + rowH - 6)
    }
    curY += rowH
  }
}

function renderCard(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width, height } = node.bounds
  const radius = node.style?.borderRadius ?? 8
  applyStyle(ctx, node.style)

  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.strokeStyle = node.style?.color ?? '#cccccc'
  ctx.stroke()

  // Render children
  if (node.children) {
    for (const child of node.children) {
      renderNode(ctx, child)
    }
  }
}

function renderStatsCard(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width, height } = node.bounds
  const radius = node.style?.borderRadius ?? 8

  // Background
  ctx.fillStyle = node.style?.backgroundColor ?? '#F4F6F8'
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.fill()

  const stats = node.data as { value?: string | number; label?: string } | undefined
  const value = String(stats?.value ?? '')
  const label = String(stats?.label ?? '')

  // Large centered value
  const valueFontSize = Math.min(height * 0.35, width / (value.length * 0.6 || 1))
  ctx.font = `bold ${Math.round(valueFontSize)}px sans-serif`
  ctx.fillStyle = node.style?.color ?? DEFAULT_COLOR
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(value, x + width / 2, y + height * 0.4)

  // Smaller label below
  ctx.font = `${Math.round(valueFontSize * 0.45)}px sans-serif`
  ctx.fillStyle = node.style?.color ?? '#666666'
  ctx.fillText(label, x + width / 2, y + height * 0.7)

  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
}

function renderDefinitionList(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width } = node.bounds
  applyStyle(ctx, node.style)
  const lh = lineHeight(node.style)

  const entries = Array.isArray(node.data)
    ? (node.data as { key: string; value: string }[])
    : Object.entries((node.data as Record<string, unknown>) ?? {}).map(([k, v]) => ({
        key: k,
        value: String(v),
      }))

  const keyColW = width * 0.35

  for (let i = 0; i < entries.length; i++) {
    const rowY = y + lh * (i + 1)
    ctx.font = `bold ${fontSize(node.style)}px sans-serif`
    ctx.fillText(entries[i]!.key, x, rowY)
    ctx.font = `${fontSize(node.style)}px sans-serif`
    ctx.fillText(entries[i]!.value, x + keyColW, rowY)
  }
}

function renderJsonViewer(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width } = node.bounds
  const json = JSON.stringify(node.data, null, 2)
  const lines = json.split('\n')

  ctx.font = node.style?.font ?? '12px monospace'
  ctx.fillStyle = node.style?.color ?? DEFAULT_COLOR

  const lh = 16
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i]!, x + 4, y + lh * (i + 1))
  }
}

function renderImage(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width, height } = node.bounds
  applyStyle(ctx, node.style)

  ctx.strokeStyle = '#cccccc'
  ctx.strokeRect(x, y, width, height)

  ctx.fillStyle = '#999999'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('image', x + width / 2, y + height / 2)
  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
}

// ---------------------------------------------------------------------------
// Node dispatcher
// ---------------------------------------------------------------------------

function renderNode(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  switch (node.type) {
    case 'text-block':
      renderTextBlock(ctx, node)
      break
    case 'number-display':
      renderNumberDisplay(ctx, node)
      break
    case 'line-chart':
      renderLineChart(ctx, node)
      break
    case 'bar-chart':
      renderBarChart(ctx, node)
      break
    case 'pie-chart':
      renderPieChart(ctx, node)
      break
    case 'scatter-chart':
      renderScatterChart(ctx, node)
      break
    case 'table':
      renderTable(ctx, node)
      break
    case 'card':
      renderCard(ctx, node)
      break
    case 'stats-card':
      renderStatsCard(ctx, node)
      break
    case 'definition-list':
      renderDefinitionList(ctx, node)
      break
    case 'image':
      renderImage(ctx, node)
      break
    // Container types — just render children
    case 'grid':
    case 'stack':
    case 'split-view':
      if (node.children) {
        for (const child of node.children) {
          renderNode(ctx, child)
        }
      }
      break
    default: {
      // Unknown type — attempt to render children if present
      if (node.children) {
        for (const child of node.children) {
          renderNode(ctx, child)
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walk a LayoutTree recursively and draw each node to a Canvas2D context.
 */
export function renderCanvas(tree: LayoutTree, ctx: CanvasRenderingContext2D): void {
  renderNode(ctx, tree)
}
