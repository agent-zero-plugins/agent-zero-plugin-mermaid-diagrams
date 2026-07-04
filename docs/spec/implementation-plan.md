# mermaid-diagrams — Implementation plan

## Component
`extensions/webui/sidebar-end/mermaid-renderer.html` — a module that imports `mermaid` from a CDN,
installs a `MutationObserver` on `document.body`, and renders mermaid code blocks to SVG.

## Internals
- **Detection:** scans for `pre > code.language-mermaid:not([data-mermaid-processed])`; the observer
  re-scans on any subtree added to `document.body`.
- **Render:** `mermaid.render(id, source)` → inserts the SVG; walks up `code → pre → .code-block-wrapper →
  .markdown-block-wrap` to place it; marks the code `data-mermaid-processed`.
- **Errors:** a parse failure renders `.mermaid-error-source` with the escaped source (no throw).
- **Zoom:** clicking a rendered diagram opens `.mermaid-zoom-overlay` (scale/pan state).

## Dependencies
`mermaid` from `cdn.jsdelivr.net` at runtime (the plugin's design — the e2e needs network to the CDN).
No fork seam. The render trigger is a code block in the DOM (a rendered message); the e2e provides one
directly (documented in e2e-steps-spec).
