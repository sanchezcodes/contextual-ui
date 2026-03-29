import type {
  LayoutIntent,
  LayoutNode,
  LayoutTree,
  Viewport,
} from '@contextual-ui/core'
import { chooseDirection, layoutContainer } from './container'
import { sizeComponent } from './size'

/**
 * Full layout pipeline: LayoutIntent → LayoutTree
 *
 * 1. Size each component
 * 2. Choose direction based on component count and priorities
 * 3. Run container layout to get positions
 * 4. Build LayoutTree with root node and positioned children
 */
export function layout(intent: LayoutIntent, viewport: Viewport): LayoutTree {
  // Step 1: Size each component
  const sized = intent.components.map((c) =>
    sizeComponent(c, viewport.width),
  )

  // Step 2: Choose direction
  const direction = chooseDirection(sized)

  // Step 3: Compute positions
  const positions = layoutContainer(sized, viewport, direction)

  // Step 4: Build LayoutTree
  const children: LayoutNode[] = sized.map((sc, i) => {
    const pos = positions[i]!
    return {
      type: sc.intent.kind,
      bounds: {
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
      },
      data: sc.intent.dataSlice,
      meta: {
        priority: sc.intent.priority,
        ...(sc.intent.label ? { label: sc.intent.label } : {}),
      },
    } satisfies LayoutNode
  })

  // Root container type
  const rootType = direction === 'grid' ? 'grid' : 'stack'

  // Calculate total height from children positions
  let totalHeight = 0
  for (const pos of positions) {
    const bottom = pos.y + pos.height
    if (bottom > totalHeight) totalHeight = bottom
  }

  const root: LayoutTree = {
    type: rootType,
    bounds: {
      x: 0,
      y: 0,
      width: viewport.width,
      height: Math.min(totalHeight, viewport.height),
    },
    children,
    meta: {
      direction,
      intentType: intent.type,
    },
  }

  return root
}
