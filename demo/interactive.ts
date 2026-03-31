import { analyze, detectShape } from '../packages/analyzer/src'
import { layout } from '../packages/layout/src'
import { AnimatedCanvasRenderer } from './animator'
import type { LayoutNode, LayoutTree } from '../packages/core/src'

// ═══════════════════════════════════════════════════════════════════════════
// Scenarios
// ═══════════════════════════════════════════════════════════════════════════

interface Scenario { id: string; data: unknown; intent: string }

const SCENARIOS: Record<string, Scenario> = {
  sales: {
    id: 'sales', intent: 'visualize',
    data: [
      { month: '2026-01', value: 45000 }, { month: '2026-02', value: 48000 },
      { month: '2026-03', value: 52000 }, { month: '2026-04', value: 49000 },
      { month: '2026-05', value: 55000 }, { month: '2026-06', value: 61000 },
      { month: '2026-07', value: 58000 }, { month: '2026-08', value: 63000 },
      { month: '2026-09', value: 67000 }, { month: '2026-10', value: 71000 },
      { month: '2026-11', value: 74000 }, { month: '2026-12', value: 80000 },
    ],
  },
  products: {
    id: 'products', intent: 'visualize',
    data: [
      { category: 'Electronics', value: 42000 }, { category: 'Electronics', value: 45200 },
      { category: 'Clothing', value: 28900 },    { category: 'Clothing', value: 31200 },
      { category: 'Home & Garden', value: 18400 },{ category: 'Home & Garden', value: 19800 },
      { category: 'Sports', value: 15300 },       { category: 'Sports', value: 14100 },
      { category: 'Books', value: 9100 },         { category: 'Books', value: 10200 },
    ],
  },
  team: {
    id: 'team', intent: 'list',
    data: [
      { name: 'Alice', role: 'Engineer', age: 30, city: 'NYC' },
      { name: 'Bob', role: 'Designer', age: 28, city: 'SF' },
      { name: 'Carol', role: 'PM', age: 35, city: 'Chicago' },
      { name: 'Dave', role: 'Engineer', age: 32, city: 'Austin' },
      { name: 'Eve', role: 'Data Scientist', age: 27, city: 'Seattle' },
    ],
  },
  server: {
    id: 'server', intent: 'detail',
    data: { cpu: 72, memory: 85, disk: 45, uptime: '99.97%', requests: 12450 },
  },
  article: {
    id: 'article', intent: 'detail',
    data: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// DOM refs & state
// ═══════════════════════════════════════════════════════════════════════════

const pipelineFill = document.getElementById('pipeline-fill')!
const canvasFrame = document.getElementById('canvas-frame')!
const canvas = document.getElementById('output-canvas') as HTMLCanvasElement
const outputEmpty = document.getElementById('output-empty')!
const scenarioButtons = document.querySelectorAll<HTMLButtonElement>('.scenario')

let controller: AbortController | null = null
const renderer = new AnimatedCanvasRenderer(canvas)

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('', 'AbortError')) }, { once: true })
  })
}

function describeData(data: unknown): string {
  if (Array.isArray(data)) return `${data.length} records`
  if (typeof data === 'string') return `${data.length} chars`
  if (typeof data === 'object' && data !== null) return `${Object.keys(data).length} fields`
  return 'raw'
}

function getLeafNodes(node: LayoutNode): LayoutNode[] {
  if (!node.children || !node.children.length) return [node]
  return node.children.flatMap(c => getLeafNodes(c))
}

// ═══════════════════════════════════════════════════════════════════════════
// Pipeline UI
// ═══════════════════════════════════════════════════════════════════════════

function resetPipeline() {
  for (let i = 0; i < 4; i++) {
    document.getElementById(`step-${i}`)!.classList.remove('active', 'complete')
    document.getElementById(`detail-${i}`)!.textContent = ''
  }
  pipelineFill.style.width = '0%'
}

function activateStep(i: number) {
  document.getElementById(`step-${i}`)!.classList.add('active')
}

function completeStep(i: number, detail: string) {
  const step = document.getElementById(`step-${i}`)!
  step.classList.remove('active')
  step.classList.add('complete')
  document.getElementById(`detail-${i}`)!.textContent = detail
  if (i > 0) pipelineFill.style.width = `${(i / 3) * 100}%`
}

// ═══════════════════════════════════════════════════════════════════════════
// Main pipeline
// ═══════════════════════════════════════════════════════════════════════════

async function runScenario(scenario: Scenario): Promise<void> {
  if (controller) controller.abort()
  controller = new AbortController()
  const signal = controller.signal

  try {
    resetPipeline()
    renderer.clear()
    outputEmpty.classList.add('hidden')

    // Resize canvas to frame
    const w = canvasFrame.clientWidth
    const h = 460
    renderer.resize(w, h)

    // ── Step 1: Data ──
    activateStep(0)
    await wait(400, signal)
    completeStep(0, describeData(scenario.data))

    // ── Step 2: Analyze ──
    activateStep(1)
    await wait(350, signal)
    const shape = detectShape(scenario.data)
    const analyzed = analyze(scenario.data, scenario.intent)
    const kinds = analyzed.components.map(c => c.kind).join(', ')
    completeStep(1, `${shape.shape} → ${kinds}`)

    // ── Step 3: Layout ──
    activateStep(2)
    await wait(300, signal)
    const tree = layout(analyzed, { width: w, height: h })
    const n = getLeafNodes(tree).length
    completeStep(2, `${n} element${n !== 1 ? 's' : ''}`)

    // ── Step 4: Render (animated canvas) ──
    activateStep(3)
    await wait(200, signal)

    await new Promise<void>((resolve, reject) => {
      const abort = () => { renderer.stop(); reject(new DOMException('', 'AbortError')) }
      signal.addEventListener('abort', abort, { once: true })
      renderer.render(tree, () => { signal.removeEventListener('abort', abort); resolve() })
    })

    completeStep(3, 'done ✓')
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    console.error('Pipeline error:', e)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════════════════

scenarioButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.id!
    const scenario = SCENARIOS[id]
    if (!scenario) return
    scenarioButtons.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    runScenario(scenario)
  })
})

// Initial canvas
renderer.resize(canvasFrame.clientWidth, 460)
renderer.clear()
