import type {
  ComponentIntent,
  ComponentKind,
  DataShape,
  IntentType,
  LayoutIntent,
} from '@contextual-ui/core'
import { detectShape } from './detect'
import { normalizeIntent } from './intents'

// --- Label generation ---

function generateLabel(shape: DataShape, intent: IntentType): string {
  const shapeLabels: Record<DataShape, string> = {
    timeseries: 'Trend over time',
    categorical: 'Category breakdown',
    tabular: 'Data table',
    'single-record': 'Record details',
    'text-blob': 'Text content',
    comparison: 'Side-by-side comparison',
    hierarchical: 'Nested structure',
    'key-value': 'Key-value pairs',
    unknown: 'Raw data',
  }

  const intentLabels: Record<IntentType, string> = {
    visualization: 'Visualization',
    comparison: 'Comparison',
    detail: 'Details',
    list: 'List view',
    summary: 'Summary',
    exploration: 'Explorer',
  }

  return `${shapeLabels[shape]} — ${intentLabels[intent]}`
}

// --- Mapping tables ---

type MappingEntry = [ComponentKind, number][]

// Internal intent keys used for the mapping table (not the same as IntentType)
type MapIntent = 'visualize' | 'compare' | 'detail' | 'list' | 'summarize'

const INTENT_TO_MAP: Record<IntentType, MapIntent> = {
  visualization: 'visualize',
  comparison: 'compare',
  detail: 'detail',
  list: 'list',
  summary: 'summarize',
  exploration: 'detail', // exploration falls back to detail view
}

const MAPPING: Record<DataShape, Record<MapIntent, MappingEntry>> = {
  timeseries: {
    visualize: [['line-chart', 1.0]],
    compare: [['line-chart', 1.0], ['stats-card', 0.5]],
    detail: [['table', 1.0], ['line-chart', 0.5]],
    list: [['table', 1.0]],
    summarize: [['stats-card', 1.0], ['line-chart', 0.5]],
  },
  categorical: {
    visualize: [['bar-chart', 1.0]],
    compare: [['bar-chart', 1.0]],
    detail: [['table', 1.0], ['bar-chart', 0.5]],
    list: [['table', 1.0]],
    summarize: [['stats-card', 1.0], ['bar-chart', 0.5]],
  },
  tabular: {
    visualize: [['table', 1.0]],
    compare: [['split-view', 1.0]],
    detail: [['table', 1.0]],
    list: [['table', 1.0]],
    summarize: [['stats-card', 1.0], ['table', 0.5]],
  },
  'single-record': {
    visualize: [['card', 1.0]],
    compare: [['card', 1.0]],
    detail: [['definition-list', 1.0]],
    list: [['definition-list', 1.0]],
    summarize: [['card', 1.0]],
  },
  'text-blob': {
    visualize: [['text-block', 1.0]],
    compare: [['split-view', 1.0]],
    detail: [['text-block', 1.0]],
    list: [['text-block', 1.0]],
    summarize: [['text-block', 1.0]],
  },
  'key-value': {
    visualize: [['definition-list', 1.0]],
    compare: [['definition-list', 1.0]],
    detail: [['definition-list', 1.0]],
    list: [['definition-list', 1.0]],
    summarize: [['stats-card', 1.0]],
  },
  comparison: {
    visualize: [['split-view', 1.0]],
    compare: [['split-view', 1.0]],
    detail: [['split-view', 1.0]],
    list: [['table', 1.0]],
    summarize: [['stats-card', 1.0]],
  },
  hierarchical: {
    visualize: [['table', 1.0]],
    compare: [['split-view', 1.0]],
    detail: [['json-viewer', 1.0]],
    list: [['table', 1.0]],
    summarize: [['card', 1.0]],
  },
  unknown: {
    visualize: [['json-viewer', 1.0]],
    compare: [['json-viewer', 1.0]],
    detail: [['json-viewer', 1.0]],
    list: [['json-viewer', 1.0]],
    summarize: [['json-viewer', 1.0]],
  },
}

/**
 * Analyzes raw data + user intent and returns a LayoutIntent
 * describing which UI components to render.
 */
export function analyze(data: unknown, intent: string): LayoutIntent {
  const descriptor = detectShape(data)
  const intentType = normalizeIntent(intent)
  const mapKey = INTENT_TO_MAP[intentType]
  const entries = MAPPING[descriptor.shape][mapKey]

  const components: ComponentIntent[] = entries.map(([kind, priority]) => ({
    kind,
    dataSlice: data,
    priority,
    label: generateLabel(descriptor.shape, intentType),
  }))

  return {
    type: intentType,
    components,
  }
}
