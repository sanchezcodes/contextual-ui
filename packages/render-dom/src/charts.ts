const SVG_NS = 'http://www.w3.org/2000/svg'

function createSvg(width: number, height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  return svg
}

function extractNumbers(data: unknown[]): number[] {
  return data.map((d) => {
    if (typeof d === 'number') return d
    if (typeof d === 'object' && d !== null) {
      const obj = d as Record<string, unknown>
      // Try common value keys
      for (const key of ['value', 'y', 'count', 'amount']) {
        if (typeof obj[key] === 'number') return obj[key] as number
      }
    }
    return 0
  })
}

export function renderLineChart(
  data: unknown[],
  container: HTMLElement,
  width: number,
  height: number,
): void {
  if (data.length === 0) return

  const values = extractNumbers(data)
  const max = Math.max(...values, 1)
  const padding = 10
  const chartW = width - padding * 2
  const chartH = height - padding * 2

  const svg = createSvg(width, height)

  const points = values
    .map((v, i) => {
      const x = padding + (i / Math.max(values.length - 1, 1)) * chartW
      const y = padding + chartH - (v / max) * chartH
      return `${x},${y}`
    })
    .join(' ')

  const polyline = document.createElementNS(SVG_NS, 'polyline')
  polyline.setAttribute('points', points)
  polyline.setAttribute('fill', 'none')
  polyline.setAttribute('stroke', '#4285f4')
  polyline.setAttribute('stroke-width', '2')
  svg.appendChild(polyline)

  // Draw dots at each point
  values.forEach((v, i) => {
    const x = padding + (i / Math.max(values.length - 1, 1)) * chartW
    const y = padding + chartH - (v / max) * chartH
    const circle = document.createElementNS(SVG_NS, 'circle')
    circle.setAttribute('cx', String(x))
    circle.setAttribute('cy', String(y))
    circle.setAttribute('r', '3')
    circle.setAttribute('fill', '#4285f4')
    svg.appendChild(circle)
  })

  container.appendChild(svg)
}

export function renderBarChart(
  data: unknown[],
  container: HTMLElement,
  width: number,
  height: number,
): void {
  if (data.length === 0) return

  const values = extractNumbers(data)
  const max = Math.max(...values, 1)
  const padding = 10
  const chartW = width - padding * 2
  const chartH = height - padding * 2
  const barGap = 4
  const barWidth = Math.max(
    (chartW - barGap * (values.length - 1)) / values.length,
    2,
  )

  const svg = createSvg(width, height)

  values.forEach((v, i) => {
    const barH = (v / max) * chartH
    const x = padding + i * (barWidth + barGap)
    const y = padding + chartH - barH
    const rect = document.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('x', String(x))
    rect.setAttribute('y', String(y))
    rect.setAttribute('width', String(barWidth))
    rect.setAttribute('height', String(barH))
    rect.setAttribute('fill', '#34a853')
    rect.setAttribute('rx', '2')
    svg.appendChild(rect)
  })

  container.appendChild(svg)
}

export function renderScatterChart(
  data: unknown[],
  container: HTMLElement,
  width: number,
  height: number,
): void {
  if (data.length === 0) return

  const padding = 10
  const chartW = width - padding * 2
  const chartH = height - padding * 2

  // Extract x/y pairs
  const points = data.map((d) => {
    if (typeof d === 'object' && d !== null) {
      const obj = d as Record<string, unknown>
      return {
        x: typeof obj['x'] === 'number' ? obj['x'] : 0,
        y: typeof obj['y'] === 'number' ? obj['y'] : 0,
      }
    }
    return { x: 0, y: 0 }
  })

  const maxX = Math.max(...points.map((p) => p.x), 1)
  const maxY = Math.max(...points.map((p) => p.y), 1)

  const svg = createSvg(width, height)

  points.forEach((p) => {
    const cx = padding + (p.x / maxX) * chartW
    const cy = padding + chartH - (p.y / maxY) * chartH
    const circle = document.createElementNS(SVG_NS, 'circle')
    circle.setAttribute('cx', String(cx))
    circle.setAttribute('cy', String(cy))
    circle.setAttribute('r', '4')
    circle.setAttribute('fill', '#ea4335')
    circle.setAttribute('opacity', '0.7')
    svg.appendChild(circle)
  })

  container.appendChild(svg)
}
