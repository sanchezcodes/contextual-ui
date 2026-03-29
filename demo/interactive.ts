import { analyze, detectShape } from '../packages/analyzer/src'
import { layout } from '../packages/layout/src'
import { render, injectStyles } from '../packages/render-dom/src'
import type { LayoutNode, LayoutTree } from '../packages/core/src'

// ═══════════════════════════════════════════════════════════════════════════
// Scenarios — each one is a question the user asks by clicking
// ═══════════════════════════════════════════════════════════════════════════

interface Scenario {
  id: string
  data: unknown
  intent: string
}

const SCENARIOS: Record<string, Scenario> = {
  sales: {
    id: 'sales',
    intent: 'visualize',
    data: [
      { month: '2026-01', revenue: 45000 },
      { month: '2026-02', revenue: 48000 },
      { month: '2026-03', revenue: 52000 },
      { month: '2026-04', revenue: 49000 },
      { month: '2026-05', revenue: 55000 },
      { month: '2026-06', revenue: 61000 },
      { month: '2026-07', revenue: 58000 },
      { month: '2026-08', revenue: 63000 },
      { month: '2026-09', revenue: 67000 },
      { month: '2026-10', revenue: 71000 },
      { month: '2026-11', revenue: 74000 },
      { month: '2026-12', revenue: 80000 },
    ],
  },
  products: {
    id: 'products',
    intent: 'visualize',
    data: [
      { category: 'Electronics', value: 45200 },
      { category: 'Clothing', value: 28900 },
      { category: 'Home & Garden', value: 18400 },
      { category: 'Sports', value: 15300 },
      { category: 'Books', value: 9100 },
    ],
  },
  team: {
    id: 'team',
    intent: 'list',
    data: [
      { name: 'Alice', role: 'Engineer', age: 30, city: 'NYC' },
      { name: 'Bob', role: 'Designer', age: 28, city: 'SF' },
      { name: 'Carol', role: 'PM', age: 35, city: 'Chicago' },
      { name: 'Dave', role: 'Engineer', age: 32, city: 'Austin' },
      { name: 'Eve', role: 'Data Scientist', age: 27, city: 'Seattle' },
    ],
  },
  server: {
    id: 'server',
    intent: 'detail',
    data: { cpu: 72, memory: 85, disk: 45, uptime: '99.97%', requests: 12450 },
  },
  article: {
    id: 'article',
    intent: 'detail',
    data: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// DOM references
// ═══════════════════════════════════════════════════════════════════════════

const pipelineFill = document.getElementById('pipeline-fill')!
const outputPane = document.getElementById('output-pane')!
const skeletonEl = document.getElementById('skeleton')!
const outputEmpty = document.getElementById('output-empty')!
const scenarioButtons = document.querySelectorAll<HTMLButtonElement>('.scenario')

// ═══════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════

let controller: AbortController | null = null

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

/** Double-rAF to guarantee the browser has painted the initial state */
function nextFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
}

function describeData(data: unknown): string {
  if (Array.isArray(data)) return `${data.length} records`
  if (typeof data === 'string') return `${data.length} chars`
  if (typeof data === 'object' && data !== null) return `${Object.keys(data).length} fields`
  return 'raw data'
}

// ═══════════════════════════════════════════════════════════════════════════
// Pipeline UI
// ═══════════════════════════════════════════════════════════════════════════

function resetPipeline(): void {
  for (let i = 0; i < 4; i++) {
    const step = document.getElementById(`step-${i}`)!
    step.classList.remove('active', 'complete')
    document.getElementById(`detail-${i}`)!.textContent = ''
  }
  pipelineFill.style.width = '0%'
}

function activateStep(i: number): void {
  document.getElementById(`step-${i}`)!.classList.add('active')
}

function completeStep(i: number, detail: string): void {
  const step = document.getElementById(`step-${i}`)!
  step.classList.remove('active')
  step.classList.add('complete')
  document.getElementById(`detail-${i}`)!.textContent = detail
  if (i > 0) pipelineFill.style.width = `${(i / 3) * 100}%`
}

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton rendering — wireframe boxes from the LayoutTree
// ═══════════════════════════════════════════════════════════════════════════

function getLeafNodes(node: LayoutNode): LayoutNode[] {
  if (!node.children || node.children.length === 0) return [node]
  return node.children.flatMap(c => getLeafNodes(c))
}

function showSkeleton(tree: LayoutTree): void {
  skeletonEl.innerHTML = ''
  skeletonEl.style.opacity = '1'
  skeletonEl.classList.remove('fade-out')

  const leaves = getLeafNodes(tree)
  leaves.forEach((node, i) => {
    const box = document.createElement('div')
    box.className = 'skeleton-box'
    box.style.left = `${node.bounds.x}px`
    box.style.top = `${node.bounds.y}px`
    box.style.width = `${node.bounds.width}px`
    box.style.height = `${node.bounds.height}px`
    box.style.animationDelay = `${i * 100}ms`

    const label = document.createElement('span')
    label.className = 'skeleton-label'
    label.textContent = node.type
    box.appendChild(label)

    skeletonEl.appendChild(box)
  })
}

function fadeSkeleton(): void {
  skeletonEl.classList.add('fade-out')
}

// ═══════════════════════════════════════════════════════════════════════════
// Content animations — morph the rendered DOM elements
// ═══════════════════════════════════════════════════════════════════════════

function animateLineCharts(container: HTMLElement): void {
  container.querySelectorAll('.cui-line-chart svg polyline').forEach(el => {
    const p = el as SVGPolylineElement
    const len = p.getTotalLength?.() ?? 1000
    p.style.strokeDasharray = `${len}`
    p.style.strokeDashoffset = `${len}`
    p.style.transition = 'stroke-dashoffset 1s ease-out'
  })
  container.querySelectorAll('.cui-line-chart svg circle').forEach(el => {
    ;(el as SVGElement).style.opacity = '0'
    ;(el as SVGElement).style.transition = 'opacity 0.3s ease-out'
  })
}

function animateBarCharts(container: HTMLElement): void {
  container.querySelectorAll('.cui-bar-chart svg rect').forEach(el => {
    const r = el as SVGRectElement
    r.style.transformBox = 'fill-box'
    r.style.transformOrigin = 'center bottom'
    r.style.transform = 'scaleY(0)'
    r.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)'
  })
}

function animateTableRows(container: HTMLElement): void {
  container.querySelectorAll('.cui-table tbody tr').forEach(el => {
    const r = el as HTMLElement
    r.style.opacity = '0'
    r.style.transform = 'translateX(-16px)'
    r.style.transition = 'all 0.3s ease-out'
  })
  const thead = container.querySelector('.cui-table thead') as HTMLElement | null
  if (thead) {
    thead.style.opacity = '0'
    thead.style.transition = 'opacity 0.3s ease-out'
  }
}

function animateDLItems(container: HTMLElement): void {
  container.querySelectorAll('.cui-definition-list dt, .cui-definition-list dd').forEach(el => {
    const e = el as HTMLElement
    e.style.opacity = '0'
    e.style.transform = 'translateY(6px)'
    e.style.transition = 'all 0.25s ease-out'
  })
}

function animateTextBlocks(container: HTMLElement): void {
  container.querySelectorAll('.cui-text-block').forEach(el => {
    const e = el as HTMLElement
    e.style.opacity = '0'
    e.style.transition = 'opacity 0.6s ease-out'
  })
}

/**
 * Set all animated elements to their initial (hidden) state.
 * Called right after render(), before skeleton fades.
 */
function prepareAnimations(container: HTMLElement): void {
  animateLineCharts(container)
  animateBarCharts(container)
  animateTableRows(container)
  animateDLItems(container)
  animateTextBlocks(container)
}

/**
 * Trigger all animations — set elements to their final state,
 * letting CSS transitions do the work.
 */
function triggerAnimations(container: HTMLElement): void {
  // Line charts — draw the line
  container.querySelectorAll('.cui-line-chart svg polyline').forEach(el => {
    ;(el as SVGPolylineElement).style.strokeDashoffset = '0'
  })
  // Line chart dots — stagger them in
  container.querySelectorAll('.cui-line-chart svg circle').forEach((el, i) => {
    ;(el as SVGElement).style.transitionDelay = `${0.6 + i * 0.06}s`
    ;(el as SVGElement).style.opacity = '1'
  })

  // Bar charts — grow bars up, staggered
  container.querySelectorAll('.cui-bar-chart svg rect').forEach((el, i) => {
    const r = el as SVGRectElement
    r.style.transitionDelay = `${i * 0.07}s`
    r.style.transform = 'scaleY(1)'
  })

  // Table rows — slide in staggered
  const thead = container.querySelector('.cui-table thead') as HTMLElement | null
  if (thead) thead.style.opacity = '1'
  container.querySelectorAll('.cui-table tbody tr').forEach((el, i) => {
    const r = el as HTMLElement
    r.style.transitionDelay = `${0.1 + i * 0.06}s`
    r.style.opacity = '1'
    r.style.transform = 'translateX(0)'
  })

  // Definition list items — fade in staggered
  container.querySelectorAll('.cui-definition-list dt, .cui-definition-list dd').forEach((el, i) => {
    const e = el as HTMLElement
    e.style.transitionDelay = `${i * 0.05}s`
    e.style.opacity = '1'
    e.style.transform = 'translateY(0)'
  })

  // Text blocks — fade in
  container.querySelectorAll('.cui-text-block').forEach(el => {
    ;(el as HTMLElement).style.opacity = '1'
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Main pipeline — orchestrates the full animated flow
// ═══════════════════════════════════════════════════════════════════════════

async function runScenario(scenario: Scenario): Promise<void> {
  // Cancel any in-flight animation
  if (controller) controller.abort()
  controller = new AbortController()
  const signal = controller.signal

  try {
    // Reset UI
    resetPipeline()
    outputPane.innerHTML = ''
    skeletonEl.innerHTML = ''
    skeletonEl.style.opacity = '1'
    skeletonEl.classList.remove('fade-out')
    outputEmpty.classList.add('hidden')

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
    const width = outputPane.clientWidth || 600
    const height = 460
    const tree = layout(analyzed, { width, height })
    const leafCount = getLeafNodes(tree).length
    completeStep(2, `${leafCount} element${leafCount !== 1 ? 's' : ''}`)

    // Show skeleton wireframe
    showSkeleton(tree)
    await wait(500, signal)

    // ── Step 4: Render ──
    activateStep(3)
    await wait(200, signal)

    // Render real content behind the skeleton
    injectStyles()
    render(tree, outputPane)

    // Prepare animations (set initial hidden states)
    prepareAnimations(outputPane)
    await nextFrame()

    // Fade skeleton out to reveal content
    fadeSkeleton()
    await wait(250, signal)

    // Trigger content animations
    triggerAnimations(outputPane)
    await wait(300, signal)

    completeStep(3, 'done ✓')
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    console.error('Pipeline error:', e)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Init — wire up scenario cards
// ═══════════════════════════════════════════════════════════════════════════

scenarioButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.id!
    const scenario = SCENARIOS[id]
    if (!scenario) return

    // Toggle active card
    scenarioButtons.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')

    runScenario(scenario)
  })
})
