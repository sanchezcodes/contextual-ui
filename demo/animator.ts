import type { LayoutNode, LayoutTree } from '../packages/core/src'

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function extractValues(data: unknown[]): number[] {
  return data.map(d => {
    if (typeof d === 'number') return d
    if (typeof d === 'object' && d !== null) {
      const obj = d as Record<string, unknown>
      for (const key of ['value', 'y', 'count', 'amount']) {
        if (typeof obj[key] === 'number') return obj[key] as number
      }
    }
    return 0
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Palette
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  bg:       '#0c0c14',
  surface:  'rgba(22, 22, 34, 0.7)',
  border:   'rgba(58, 58, 78, 0.5)',
  text:     '#e4ddd0',
  muted:    '#8a8490',
  accent:   '#4a9ef5',
  green:    '#4abe6a',
  grid:     'rgba(255,255,255,0.04)',
}

// ═══════════════════════════════════════════════════════════════════════════
// Timing
// ═══════════════════════════════════════════════════════════════════════════

const STAGGER      = 120   // ms between nodes
const BORDER_DUR   = 500
const FILL_START   = 150
const FILL_DUR     = 250
const CONTENT_START = 280
const CHAR_RATE    = 35    // chars per 100ms
const CHART_DUR    = 1000
const ROW_STAGGER  = 80
const DL_STAGGER   = 100

// ═══════════════════════════════════════════════════════════════════════════
// Renderer
// ═══════════════════════════════════════════════════════════════════════════

export class AnimatedCanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private dpr: number
  private w = 0
  private h = 0
  private tree: LayoutTree | null = null
  private leaves: LayoutNode[] = []
  private t0 = 0
  private raf = 0
  private done?: () => void

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.dpr = window.devicePixelRatio || 1
  }

  resize(w: number, h: number) {
    this.w = w; this.h = h
    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  render(tree: LayoutTree, onDone?: () => void) {
    this.stop()
    this.tree = tree
    this.leaves = flatLeaves(tree)
    this.done = onDone
    this.t0 = performance.now()
    this.tick()
  }

  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0 }

  clear() {
    this.stop(); this.tree = null
    this.ctx.clearRect(0, 0, this.w, this.h)
    this.paintBg()
  }

  // ─────────────────────── frame loop ───────────────────────

  private tick = () => {
    const el = performance.now() - this.t0
    const ctx = this.ctx

    ctx.clearRect(0, 0, this.w, this.h)
    this.paintBg()

    let allDone = true
    this.leaves.forEach((node, i) => {
      const ne = el - i * STAGGER
      if (ne <= 0) { allDone = false; return }
      if (!this.paintNode(ctx, node, ne)) allDone = false
    })

    if (!allDone) this.raf = requestAnimationFrame(this.tick)
    else this.done?.()
  }

  private paintBg() {
    this.ctx.fillStyle = C.bg
    this.ctx.fillRect(0, 0, this.w, this.h)
  }

  // ─────────────────────── per-node ───────────────────────

  private paintNode(ctx: CanvasRenderingContext2D, n: LayoutNode, el: number): boolean {
    const { x, y, width: w, height: h } = n.bounds

    // border
    const bP = clamp(el / BORDER_DUR, 0, 1)
    if (bP > 0) this.strokeBorder(ctx, x, y, w, h, easeOut(bP))

    // fill
    const fP = clamp((el - FILL_START) / FILL_DUR, 0, 1)
    if (fP > 0) {
      ctx.save(); ctx.globalAlpha = easeOut(fP)
      ctx.fillStyle = C.surface
      ctx.beginPath(); this.rr(ctx, x, y, w, h, 6); ctx.fill()
      ctx.restore()
    }

    // content
    const ce = el - CONTENT_START
    const cDone = ce > 0 ? this.paintContent(ctx, n, ce) : false

    return bP >= 1 && fP >= 1 && cDone
  }

  // ─────────────────────── border draw ───────────────────────

  private strokeBorder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: number) {
    const perim = 2 * (w + h)
    ctx.save()
    ctx.strokeStyle = C.border; ctx.lineWidth = 1
    ctx.setLineDash([perim * p, perim])
    ctx.beginPath(); this.rr(ctx, x, y, w, h, 6); ctx.stroke()
    ctx.restore()
  }

  // ─────────────────────── content dispatch ───────────────────────

  private paintContent(ctx: CanvasRenderingContext2D, n: LayoutNode, el: number): boolean {
    switch (n.type) {
      case 'text-block':      return this.pText(ctx, n, el)
      case 'line-chart':      return this.pLine(ctx, n, el)
      case 'bar-chart':       return this.pBar(ctx, n, el)
      case 'table':           return this.pTable(ctx, n, el)
      case 'definition-list': return this.pDL(ctx, n, el)
      case 'stats-card':      return this.pStats(ctx, n, el)
      case 'json-viewer':     return this.pText(ctx, n, el)
      default:                return true
    }
  }

  // ─────────────────────── text-block ───────────────────────

  private pText(ctx: CanvasRenderingContext2D, n: LayoutNode, el: number): boolean {
    const text = typeof n.data === 'string' ? n.data : JSON.stringify(n.data, null, 2)
    const { x, y, width } = n.bounds
    const total = text.length
    const visible = Math.min(Math.floor(el / 100 * CHAR_RATE), total)

    ctx.save()
    ctx.fillStyle = C.text
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif'
    const cur = this.wrap(ctx, text.slice(0, visible), x + 12, y + 22, width - 24, 20)

    if (visible < total) {
      ctx.fillStyle = C.accent
      ctx.shadowColor = C.accent; ctx.shadowBlur = 8
      ctx.fillRect(cur.x, cur.y - 12, 2, 16)
      ctx.shadowBlur = 0
    }
    ctx.restore()
    return visible >= total
  }

  // ─────────────────────── line-chart ───────────────────────

  private pLine(ctx: CanvasRenderingContext2D, n: LayoutNode, el: number): boolean {
    if (!Array.isArray(n.data)) return true
    const vals = extractValues(n.data)
    if (!vals.length) return true

    const { x, y, width, height } = n.bounds
    const pad = 16, cw = width - pad * 2, ch = height - pad * 2
    const mx = Math.max(...vals, 1)
    const p = clamp(el / CHART_DUR, 0, 1)
    const num = Math.ceil(vals.length * easeOut(p))

    const pts = vals.slice(0, num).map((v, i) => ({
      x: x + pad + (i / Math.max(vals.length - 1, 1)) * cw,
      y: y + pad + ch - (v / mx) * ch,
    }))

    ctx.save()

    // area
    if (pts.length > 1) {
      ctx.globalAlpha = 0.08; ctx.fillStyle = C.accent
      ctx.beginPath()
      ctx.moveTo(pts[0].x, y + pad + ch)
      pts.forEach(pt => ctx.lineTo(pt.x, pt.y))
      ctx.lineTo(pts[pts.length - 1].x, y + pad + ch)
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1
    }

    // line
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y))
    ctx.stroke()

    // dots
    ctx.fillStyle = C.accent
    pts.forEach(pt => { ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2); ctx.fill() })

    // glow on tip
    if (p < 1 && pts.length) {
      const last = pts[pts.length - 1]
      ctx.shadowColor = C.accent; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(last.x, last.y, 5, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }

    ctx.restore()
    return p >= 1
  }

  // ─────────────────────── bar-chart ───────────────────────

  private pBar(ctx: CanvasRenderingContext2D, n: LayoutNode, el: number): boolean {
    if (!Array.isArray(n.data)) return true
    const vals = extractValues(n.data)
    if (!vals.length) return true

    const { x, y, width, height } = n.bounds
    const pad = 16, cw = width - pad * 2, ch = height - pad * 2
    const mx = Math.max(...vals, 1)
    const gap = 4
    const bw = Math.max((cw - gap * (vals.length - 1)) / vals.length, 2)
    const p = clamp(el / CHART_DUR, 0, 1)

    ctx.save()
    ctx.fillStyle = C.green
    vals.forEach((v, i) => {
      const bp = easeOut(clamp((p - i / vals.length * 0.4) / 0.6, 0, 1))
      const bh = (v / mx) * ch * bp
      const bx = x + pad + i * (bw + gap)
      const by = y + pad + ch - bh
      ctx.beginPath(); this.rr(ctx, bx, by, bw, bh, 2); ctx.fill()

      if (bp > 0 && bp < 1) {
        ctx.shadowColor = C.green; ctx.shadowBlur = 10
        ctx.fillRect(bx, by, bw, 2)
        ctx.shadowBlur = 0
      }
    })
    ctx.restore()
    return p >= 1
  }

  // ─────────────────────── table ───────────────────────

  private pTable(ctx: CanvasRenderingContext2D, n: LayoutNode, el: number): boolean {
    if (!Array.isArray(n.data) || !n.data.length) return true
    const rows = n.data as Record<string, unknown>[]
    const keys = Object.keys(rows[0])
    const { x, y, width } = n.bounds
    const rh = 30, cw = (width - 24) / keys.length

    // header
    const hP = easeOut(clamp(el / 200, 0, 1))
    ctx.save(); ctx.globalAlpha = hP
    ctx.fillStyle = C.text
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif'
    keys.forEach((k, ci) => ctx.fillText(k, x + 12 + ci * cw, y + 22))
    ctx.strokeStyle = C.border; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x + 12, y + rh); ctx.lineTo(x + width - 12, y + rh); ctx.stroke()
    ctx.restore()

    // rows
    let done = hP >= 1
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif'
    rows.forEach((row, ri) => {
      const rP = easeOut(clamp((el - 200 - ri * ROW_STAGGER) / 300, 0, 1))
      if (rP <= 0) { done = false; return }
      if (rP < 1) done = false
      const off = (1 - rP) * 16

      ctx.save(); ctx.globalAlpha = rP; ctx.fillStyle = C.muted
      keys.forEach((k, ci) => ctx.fillText(String(row[k] ?? ''), x + 12 + ci * cw - off, y + rh * (ri + 1) + 22))
      ctx.strokeStyle = C.grid; ctx.beginPath()
      ctx.moveTo(x + 12, y + rh * (ri + 2)); ctx.lineTo(x + width - 12, y + rh * (ri + 2)); ctx.stroke()
      ctx.restore()
    })
    return done
  }

  // ─────────────────────── definition-list ───────────────────────

  private pDL(ctx: CanvasRenderingContext2D, n: LayoutNode, el: number): boolean {
    if (!n.data || typeof n.data !== 'object') return true
    const entries = Object.entries(n.data as Record<string, unknown>)
    const { x, y } = n.bounds
    const ih = 42

    let done = true
    entries.forEach(([k, v], i) => {
      const p = easeOut(clamp((el - i * DL_STAGGER) / 300, 0, 1))
      if (p <= 0) { done = false; return }
      if (p < 1) done = false
      const off = (1 - p) * 6

      ctx.save(); ctx.globalAlpha = p
      ctx.fillStyle = C.text; ctx.font = 'bold 14px -apple-system, sans-serif'
      ctx.fillText(k, x + 12, y + 22 + i * ih - off)
      ctx.fillStyle = C.muted; ctx.font = '14px -apple-system, sans-serif'
      ctx.fillText(String(v ?? ''), x + 12, y + 38 + i * ih - off)
      ctx.restore()
    })
    return done
  }

  // ─────────────────────── stats-card ───────────────────────

  private pStats(ctx: CanvasRenderingContext2D, n: LayoutNode, el: number): boolean {
    const { x, y, width, height } = n.bounds
    const p = easeOut(clamp(el / 600, 0, 1))

    let value = '', label = ''
    if (typeof n.data === 'object' && n.data !== null) {
      const o = n.data as Record<string, unknown>
      value = typeof o.value === 'number' ? o.value.toLocaleString() : String(o.value ?? '')
      label = typeof o.label === 'string' ? o.label : ''
    } else { value = String(n.data ?? '') }

    ctx.save(); ctx.globalAlpha = p; ctx.textAlign = 'center'
    ctx.fillStyle = C.text; ctx.font = `bold 24px -apple-system, sans-serif`
    ctx.fillText(value, x + width / 2, y + height / 2 + 4)
    if (label) {
      ctx.fillStyle = C.muted; ctx.font = '12px -apple-system, sans-serif'
      ctx.fillText(label, x + width / 2, y + height / 2 + 24)
    }
    ctx.textAlign = 'start'; ctx.restore()
    return p >= 1
  }

  // ─────────────────────── geometry ───────────────────────

  private rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    r = Math.min(r, w / 2, h / 2)
    if (r <= 0) { ctx.rect(x, y, w, h); return }
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }

  private wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): { x: number; y: number } {
    const words = text.split(' ')
    let line = '', cy = y, lw = 0

    for (const w of words) {
      const test = line + (line ? ' ' : '') + w
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, cy); line = w; cy += lh
      } else { line = test }
    }
    if (line) { ctx.fillText(line, x, cy); lw = ctx.measureText(line).width }
    return { x: x + lw, y: cy }
  }
}

// ═══════════════════════════════════════════════════════════════════════════

function flatLeaves(node: LayoutNode): LayoutNode[] {
  if (!node.children || !node.children.length) return [node]
  return node.children.flatMap(c => flatLeaves(c))
}
