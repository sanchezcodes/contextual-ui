import type { IntentType } from '@contextual-ui/core'

const INTENT_MAP: Record<string, IntentType> = {
  visualize: 'visualization',
  'show chart': 'visualization',
  chart: 'visualization',
  graph: 'visualization',
  plot: 'visualization',
  compare: 'comparison',
  diff: 'comparison',
  versus: 'comparison',
  detail: 'detail',
  show: 'detail',
  view: 'detail',
  list: 'list',
  table: 'list',
  enumerate: 'list',
  summarize: 'summary',
  summary: 'summary',
  overview: 'summary',
  stats: 'summary',
  explore: 'exploration',
  browse: 'exploration',
}

const DEFAULT_INTENT: IntentType = 'detail'

/**
 * Normalizes a natural-language intent string to a canonical IntentType.
 *
 * 1. Exact match (case-insensitive)
 * 2. Contains match — checks if the input contains any known key
 * 3. Fallback → 'detail'
 */
export function normalizeIntent(raw: string): IntentType {
  const input = raw.trim().toLowerCase()

  // Exact match
  const exact = INTENT_MAP[input]
  if (exact) return exact

  // Contains match — longer keys first to prefer "show chart" over "show"
  const keys = Object.keys(INTENT_MAP).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (input.includes(key)) {
      return INTENT_MAP[key]!
    }
  }

  return DEFAULT_INTENT
}
