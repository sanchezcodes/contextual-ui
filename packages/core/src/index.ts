// === Layout Tree (the output) ===

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Style {
  font?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  backgroundColor?: string
  borderRadius?: number
  padding?: number
  gap?: number
}

export type LayoutNodeType =
  | 'text-block'
  | 'number-display'
  | 'line-chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'scatter-chart'
  | 'table'
  | 'card'
  | 'stats-card'
  | 'image'
  | 'definition-list'
  | 'grid'
  | 'stack'
  | 'split-view'

export interface LayoutNode {
  type: LayoutNodeType
  bounds: Bounds
  style?: Style
  children?: LayoutNode[]
  data?: unknown
  meta?: Record<string, unknown>
}

export type LayoutTree = LayoutNode

// === Component Intent (analyzer output) ===

export type IntentType =
  | 'visualization'
  | 'comparison'
  | 'detail'
  | 'list'
  | 'summary'
  | 'exploration'

export interface ComponentConstraints {
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  aspectRatio?: number
}

export type ComponentKind =
  | 'line-chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'scatter-chart'
  | 'table'
  | 'card'
  | 'stats-card'
  | 'text-block'
  | 'definition-list'
  | 'split-view'
  | 'image'
  | 'json-viewer'

export interface ComponentIntent {
  kind: ComponentKind
  dataSlice: unknown
  priority: number  // 1.0 = primary, 0.5 = secondary, 0.1 = supplementary
  constraints?: ComponentConstraints
  label?: string  // optional title for the component
}

export interface LayoutIntent {
  type: IntentType
  components: ComponentIntent[]
}

// === Data Shape (analyzer internal) ===

export type DataShape =
  | 'timeseries'
  | 'categorical'
  | 'tabular'
  | 'single-record'
  | 'text-blob'
  | 'comparison'
  | 'hierarchical'
  | 'key-value'
  | 'unknown'

export interface DataShapeDescriptor {
  shape: DataShape
  fields?: string[]
  dateField?: string
  valueFields?: string[]
  categoryField?: string
  rowCount?: number
}

// === Function signatures (contracts) ===

export interface Viewport {
  width: number
  height: number
}

export type AnalyzerFn = (data: unknown, intent: string, constraints?: Viewport) => LayoutIntent
export type LayoutFn = (intent: LayoutIntent, viewport: Viewport) => LayoutTree
export type RendererFn = (tree: LayoutTree, target: unknown) => void
