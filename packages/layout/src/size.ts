import type { ComponentIntent } from '@contextual-ui/core'
import { measureText } from './measure'

export interface SizedComponent {
  intent: ComponentIntent
  width: number
  height: number
}

const DEFAULT_FONT = '16px Inter'
const DEFAULT_LINE_HEIGHT = 24
const CHART_DEFAULT_HEIGHT = 300
const TABLE_ROW_HEIGHT = 36
const TABLE_HEADER_HEIGHT = 40
const CARD_PADDING = 16
const STATS_CARD_HEIGHT = 100
const JSON_LINE_HEIGHT = 20
const IMAGE_DEFAULT_WIDTH = 300
const IMAGE_DEFAULT_HEIGHT = 200

function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  return JSON.stringify(value, null, 2)
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  return []
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

export function sizeComponent(
  intent: ComponentIntent,
  availableWidth: number,
  font?: string,
): SizedComponent {
  const f = font ?? DEFAULT_FONT
  const constraints = intent.constraints

  switch (intent.kind) {
    case 'text-block': {
      const text = asString(intent.dataSlice)
      const { height } = measureText(
        text,
        f,
        availableWidth,
        DEFAULT_LINE_HEIGHT,
      )
      return {
        intent,
        width: availableWidth,
        height: Math.max(height, DEFAULT_LINE_HEIGHT),
      }
    }

    case 'line-chart':
    case 'bar-chart':
    case 'pie-chart':
    case 'scatter-chart': {
      const height = constraints?.maxHeight ?? CHART_DEFAULT_HEIGHT
      return { intent, width: availableWidth, height }
    }

    case 'table': {
      const rows = asArray(intent.dataSlice)
      const visibleRows = Math.min(rows.length, 20)
      const height =
        TABLE_HEADER_HEIGHT + visibleRows * TABLE_ROW_HEIGHT
      return { intent, width: availableWidth, height }
    }

    case 'card': {
      const data = asRecord(intent.dataSlice)
      const title = asString(data['title'] ?? intent.label ?? '')
      const content = asString(
        data['content'] ?? data['description'] ?? data['body'] ?? '',
      )

      const { height: titleHeight } = measureText(
        title,
        f,
        availableWidth - CARD_PADDING * 2,
        DEFAULT_LINE_HEIGHT,
      )
      const { height: contentHeight } = measureText(
        content,
        f,
        availableWidth - CARD_PADDING * 2,
        DEFAULT_LINE_HEIGHT,
      )

      const totalHeight =
        CARD_PADDING * 2 +
        titleHeight +
        (content ? 8 + contentHeight : 0) // 8px gap between title and content

      return {
        intent,
        width: availableWidth,
        height: Math.max(totalHeight, CARD_PADDING * 2 + DEFAULT_LINE_HEIGHT),
      }
    }

    case 'stats-card': {
      const width = Math.min(availableWidth, 250)
      return { intent, width, height: STATS_CARD_HEIGHT }
    }

    case 'definition-list': {
      const data = asRecord(intent.dataSlice)
      const rowCount = Object.keys(data).length
      const height = Math.max(rowCount, 1) * TABLE_ROW_HEIGHT
      return { intent, width: availableWidth, height }
    }

    case 'split-view': {
      // Split-view: estimate based on two halves
      const halfWidth = (availableWidth - 16) / 2 // 16px gap
      const leftHeight = measureText(
        asString(intent.dataSlice),
        f,
        halfWidth,
        DEFAULT_LINE_HEIGHT,
      ).height
      // Use a reasonable minimum height for split views
      const height = Math.max(leftHeight, CHART_DEFAULT_HEIGHT)
      return { intent, width: availableWidth, height }
    }

    case 'json-viewer': {
      const json = JSON.stringify(intent.dataSlice, null, 2)
      const lineCount = json.split('\n').length
      const height = Math.max(lineCount * JSON_LINE_HEIGHT, JSON_LINE_HEIGHT)
      return { intent, width: availableWidth, height }
    }

    case 'image': {
      const width = constraints?.maxWidth ?? IMAGE_DEFAULT_WIDTH
      const height = constraints?.maxHeight ?? IMAGE_DEFAULT_HEIGHT
      return {
        intent,
        width: Math.min(width, availableWidth),
        height,
      }
    }

    default: {
      // Fallback for any unknown kind
      return { intent, width: availableWidth, height: DEFAULT_LINE_HEIGHT }
    }
  }
}
