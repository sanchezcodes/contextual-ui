import { describe, it, expect } from 'vitest'
import { measureText, clearTextCache } from '../measure'

describe('measureText', () => {
  it('returns positive height for non-empty text', () => {
    const result = measureText('Hello world', '16px Inter', 300, 24)
    expect(result.height).toBeGreaterThan(0)
    expect(result.lineCount).toBeGreaterThanOrEqual(1)
  })

  it('returns more lines for narrow width than wide width', () => {
    const longText = 'This is a fairly long piece of text that should wrap across multiple lines when the width is narrow enough to require it.'
    const narrow = measureText(longText, '16px Inter', 100, 24)
    const wide = measureText(longText, '16px Inter', 1000, 24)
    expect(narrow.lineCount).toBeGreaterThan(wide.lineCount)
  })

  it('returns same result for same input (cache)', () => {
    clearTextCache()
    const a = measureText('Cached text', '16px Inter', 300, 24)
    const b = measureText('Cached text', '16px Inter', 300, 24)
    expect(a).toEqual(b)
  })

  it('handles empty text gracefully', () => {
    const result = measureText('', '16px Inter', 300, 24)
    expect(result.height).toBeGreaterThanOrEqual(0)
    expect(result.lineCount).toBeGreaterThanOrEqual(1)
  })

  it('clearTextCache does not throw', () => {
    measureText('some text', '16px Inter', 200, 24)
    expect(() => clearTextCache()).not.toThrow()
  })
})
