import { analyze } from '../packages/analyzer/src'
import { layout } from '../packages/layout/src'
import { render } from '../packages/render-dom/src'
import { injectStyles } from '../packages/render-dom/src'
import { renderCanvas } from '../packages/render-canvas/src'

// ---------------------------------------------------------------------------
// Sample datasets
// ---------------------------------------------------------------------------

const SAMPLES: Record<string, unknown> = {
  sales: [
    { month: '2026-01', revenue: 45000, cost: 32000 },
    { month: '2026-02', revenue: 48000, cost: 33000 },
    { month: '2026-03', revenue: 52000, cost: 34500 },
    { month: '2026-04', revenue: 49000, cost: 33800 },
    { month: '2026-05', revenue: 55000, cost: 35000 },
    { month: '2026-06', revenue: 61000, cost: 37000 },
    { month: '2026-07', revenue: 58000, cost: 36200 },
    { month: '2026-08', revenue: 63000, cost: 38000 },
    { month: '2026-09', revenue: 67000, cost: 39500 },
    { month: '2026-10', revenue: 71000, cost: 41000 },
    { month: '2026-11', revenue: 74000, cost: 42500 },
    { month: '2026-12', revenue: 80000, cost: 44000 },
  ],
  categories: [
    { category: 'Electronics', value: 45 },
    { category: 'Clothing', value: 28 },
    { category: 'Clothing', value: 30 },
    { category: 'Electronics', value: 42 },
    { category: 'Home & Garden', value: 18 },
    { category: 'Home & Garden', value: 20 },
    { category: 'Sports', value: 15 },
    { category: 'Sports', value: 12 },
    { category: 'Books', value: 9 },
    { category: 'Books', value: 11 },
  ],
  team: [
    { name: 'Alice', role: 'Engineer', age: 30, city: 'NYC' },
    { name: 'Bob', role: 'Designer', age: 28, city: 'SF' },
    { name: 'Carol', role: 'PM', age: 35, city: 'Chicago' },
    { name: 'Dave', role: 'Engineer', age: 32, city: 'Austin' },
    { name: 'Eve', role: 'Data Scientist', age: 27, city: 'Seattle' },
  ],
  server: {
    cpu: 72,
    memory: 85,
    disk: 45,
    uptime: '99.97%',
    requests: 12450,
  },
  article:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.',
}

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const textarea = document.getElementById('data-input') as HTMLTextAreaElement
const intentSelect = document.getElementById('intent-select') as HTMLSelectElement
const renderBtn = document.getElementById('render-btn') as HTMLButtonElement
const domOutput = document.getElementById('dom-output') as HTMLDivElement
const canvasEl = document.getElementById('canvas-output') as HTMLCanvasElement
const errorEl = document.getElementById('error-output') as HTMLDivElement

// ---------------------------------------------------------------------------
// Render pipeline
// ---------------------------------------------------------------------------

function doRender(): void {
  errorEl.textContent = ''
  errorEl.style.display = 'none'

  let data: unknown
  try {
    data = JSON.parse(textarea.value)
  } catch (e) {
    errorEl.textContent = `JSON parse error: ${(e as Error).message}`
    errorEl.style.display = 'block'
    return
  }

  const intent = intentSelect.value

  try {
    // 1. Analyze
    const analyzed = analyze(data, intent)

    // 2. Layout — use DOM output container width
    const width = domOutput.clientWidth || 500
    const height = 500
    const tree = layout(analyzed, { width, height })

    // 3. DOM render
    injectStyles()
    render(tree, domOutput)

    // 4. Canvas render
    canvasEl.width = width
    canvasEl.height = height
    const ctx = canvasEl.getContext('2d')!
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
    renderCanvas(tree, ctx)
  } catch (e) {
    errorEl.textContent = `Render error: ${(e as Error).message}`
    errorEl.style.display = 'block'
  }
}

// ---------------------------------------------------------------------------
// Wire up events
// ---------------------------------------------------------------------------

renderBtn.addEventListener('click', doRender)

// Sample data buttons
document.querySelectorAll<HTMLButtonElement>('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.sample!
    textarea.value = JSON.stringify(SAMPLES[key], null, 2)
    doRender()
  })
})

// Auto-render on load with sales sample
textarea.value = JSON.stringify(SAMPLES.sales, null, 2)
doRender()
