# contextual-ui

Data-driven UI layout engine. Give it data + intent, get a rendered interface.

Pure TypeScript. Framework-agnostic. Zero DOM dependency for layout. Powered by [@chenglou/pretext](https://github.com/chenglou/pretext) for text measurement.

## The idea

Traditional UI: developer defines components, user fills them with data.

**Contextual UI: data arrives, the system decides the best way to show it, UI materializes.**

```typescript
import { analyze, layout, render } from 'contextual-ui'

// 1. System decides what to show
const intent = analyze(salesData, 'compare quarterly performance')

// 2. Layout computed without DOM (pretext for text, arithmetic for everything else)
const tree = layout(intent, { width: 800, height: 600 })

// 3. Render however you want
render(tree, document.getElementById('root'))  // or canvas, SVG, terminal...
```

## Architecture

Three decoupled layers:

```
DATA + INTENT ──→ [Analyzer] ──→ ComponentTree (what to show)
                                        │
                                        ▼
              ──→ [Layout Engine] ──→ LayoutTree (where it goes, pixel-precise)
                    uses pretext         │
                                        ▼
              ──→ [Renderer] ──→ Pixels (DOM, Canvas, SVG, terminal)
                  bring your own
```

**Analyzer**: Heuristic-first (pure TS, zero API calls, microseconds). LLM-optional for complex decisions.

**Layout Engine**: pretext for text measurement, arithmetic for everything else. Pure math, no DOM, no reflow.

**Renderer**: Pluggable. Ship defaults for DOM and Canvas. The LayoutTree is the universal contract.

## Packages

```
packages/
  core/          — types, LayoutTree, ComponentTree (zero deps)
  analyzer/      — heuristic data→component analyzer (zero deps)
  layout/        — layout engine (dep: @chenglou/pretext)
  render-dom/    — DOM renderer (dep: none beyond browser APIs)
  render-canvas/ — Canvas renderer (zero deps)
```

## Status

Early development. See [implementation roadmap](https://github.com/sanchezcodes/contextual-ui/issues/1).

## License

MIT
