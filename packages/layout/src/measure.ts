import type { LayoutResult, PreparedText } from '@chenglou/pretext'

// === Pretext integration with fallback ===

// Try to use pretext if canvas is available, otherwise fall back to estimation
let pretextAvailable = false
let pretextPrepare: ((text: string, font: string) => PreparedText) | null = null
let pretextLayout: ((prepared: PreparedText, maxWidth: number, lineHeight: number) => LayoutResult) | null = null

try {
  // Dynamic import would be cleaner but we need synchronous access.
  // pretext throws at prepare() time when no canvas is available,
  // so we detect at module load by attempting a probe call.
  const mod = await import('@chenglou/pretext')
  const probe = mod.prepare('x', '16px sans-serif')
  mod.layout(probe, 100, 20)
  pretextAvailable = true
  pretextPrepare = mod.prepare
  pretextLayout = mod.layout
} catch {
  // Canvas not available (Node/Bun without DOM) — fall through to fallback
}

// === Font size parser ===

export function parseFontSize(font: string): number {
  const match = font.match(/(\d+(?:\.\d+)?)\s*px/)
  return match ? parseFloat(match[1]!) : 16
}

// === Fallback estimator ===

function estimateTextHeight(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number,
): { height: number; lineCount: number } {
  const fontSize = parseFontSize(font)
  const avgCharWidth = fontSize * 0.6 // rough heuristic
  const charsPerLine = Math.max(1, Math.floor(maxWidth / avgCharWidth))
  const lineCount = Math.max(1, Math.ceil(text.length / charsPerLine))
  return { height: lineCount * lineHeight, lineCount }
}

// === Cache (keyed by font::text) ===

const cache = new Map<string, { height: number; lineCount: number }>()

// === Public API ===

export function measureText(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number,
): { height: number; lineCount: number } {
  const key = `${font}::${text}::${maxWidth}::${lineHeight}`
  const cached = cache.get(key)
  if (cached) return cached

  let result: { height: number; lineCount: number }

  if (pretextAvailable && pretextPrepare && pretextLayout) {
    const prepared = pretextPrepare(text, font)
    result = pretextLayout(prepared, maxWidth, lineHeight)
  } else {
    result = estimateTextHeight(text, font, maxWidth, lineHeight)
  }

  cache.set(key, result)
  return result
}

export function clearTextCache(): void {
  cache.clear()
}

export function isUsingPretext(): boolean {
  return pretextAvailable
}
