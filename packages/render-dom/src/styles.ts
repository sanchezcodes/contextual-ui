export const BASE_STYLES = `
.cui-node { box-sizing: border-box; }
.cui-card { border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; }
.cui-stats-card { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 8px; }
.cui-stats-card .cui-value { font-size: 2em; font-weight: 700; }
.cui-stats-card .cui-label { font-size: 0.875em; color: #666; }
.cui-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.cui-table th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #e0e0e0; font-weight: 600; }
.cui-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
.cui-table tr:hover { background: #f8f9fa; }
.cui-text-block { line-height: 1.5; }
.cui-definition-list dt { font-weight: 600; margin-top: 8px; }
.cui-definition-list dd { margin-left: 0; color: #444; }
.cui-json-viewer { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow: auto; font-size: 13px; }
.cui-chart svg { width: 100%; height: 100%; }
`

export function injectStyles(): void {
  if (document.getElementById('cui-styles')) return
  const style = document.createElement('style')
  style.id = 'cui-styles'
  style.textContent = BASE_STYLES
  document.head.appendChild(style)
}
