import type { Viewport } from '@contextual-ui/core'
import type { SizedComponent } from './size'

export type Direction = 'vertical' | 'horizontal' | 'grid'

const GAP = 16
const GRID_CELL_MIN_WIDTH = 250

export interface PositionedRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Chooses a layout direction based on components and viewport.
 */
export function chooseDirection(children: SizedComponent[]): Direction {
  if (children.length <= 1) return 'vertical'

  // 4+ small components → grid
  if (children.length >= 4) {
    const allSmall = children.every((c) => c.height <= 120)
    if (allSmall) return 'grid'
  }

  // 2 components with similar priority → horizontal
  if (children.length === 2) {
    const p0 = children[0]!.intent.priority
    const p1 = children[1]!.intent.priority
    if (Math.abs(p0 - p1) < 0.3) return 'horizontal'
  }

  // Default: stack by priority
  return 'vertical'
}

/**
 * Positions sized children within a viewport according to the given direction.
 * Returns pixel-precise bounding rects for each child (same order as input).
 */
export function layoutContainer(
  children: SizedComponent[],
  viewport: Viewport,
  direction: Direction,
): PositionedRect[] {
  if (children.length === 0) return []

  switch (direction) {
    case 'vertical':
      return layoutVertical(children, viewport)
    case 'horizontal':
      return layoutHorizontal(children, viewport)
    case 'grid':
      return layoutGrid(children, viewport)
  }
}

// === Vertical (stack) ===

function layoutVertical(
  children: SizedComponent[],
  viewport: Viewport,
): PositionedRect[] {
  const rects: PositionedRect[] = []
  let y = 0

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!
    rects.push({
      x: 0,
      y,
      width: viewport.width,
      height: child.height,
    })
    y += child.height
    if (i < children.length - 1) y += GAP
  }

  return rects
}

// === Horizontal (split by priority weight) ===

function layoutHorizontal(
  children: SizedComponent[],
  viewport: Viewport,
): PositionedRect[] {
  const rects: PositionedRect[] = []
  const totalGap = GAP * (children.length - 1)
  const availableWidth = viewport.width - totalGap

  // Distribute width by priority weight
  const totalPriority = children.reduce(
    (sum, c) => sum + c.intent.priority,
    0,
  )

  // All children share the max height
  const maxHeight = Math.max(...children.map((c) => c.height))

  let x = 0
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!
    const widthShare =
      totalPriority > 0
        ? (child.intent.priority / totalPriority) * availableWidth
        : availableWidth / children.length

    rects.push({
      x,
      y: 0,
      width: Math.round(widthShare),
      height: maxHeight,
    })

    x += Math.round(widthShare)
    if (i < children.length - 1) x += GAP
  }

  return rects
}

// === Grid (auto-columns) ===

function layoutGrid(
  children: SizedComponent[],
  viewport: Viewport,
): PositionedRect[] {
  const rects: PositionedRect[] = []

  // Auto-compute columns: each cell at least GRID_CELL_MIN_WIDTH
  const cols = Math.max(
    1,
    Math.floor((viewport.width + GAP) / (GRID_CELL_MIN_WIDTH + GAP)),
  )
  const totalGap = GAP * (cols - 1)
  const cellWidth = (viewport.width - totalGap) / cols

  let x = 0
  let y = 0
  let rowMaxHeight = 0

  for (let i = 0; i < children.length; i++) {
    const col = i % cols
    if (col === 0 && i > 0) {
      // New row
      y += rowMaxHeight + GAP
      rowMaxHeight = 0
      x = 0
    }

    const child = children[i]!
    rects.push({
      x,
      y,
      width: Math.round(cellWidth),
      height: child.height,
    })

    rowMaxHeight = Math.max(rowMaxHeight, child.height)
    x += Math.round(cellWidth) + GAP
  }

  return rects
}
