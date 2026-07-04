# mermaid-diagrams — Behaviour spec

Behaviour-first, reverse-engineered. A **UI extension** (`sidebar-end/mermaid-renderer.html`) that watches
the chat DOM and renders fenced ```mermaid code blocks as interactive SVG diagrams. Loads the `mermaid`
library from a CDN. No tools/API/agent behaviour of its own.

## Behaviours
- **BEH-1 — A mermaid code block renders as a diagram.** A `pre > code.language-mermaid` in the chat (what
  A0's markdown renderer emits for a ```mermaid fence) is rendered to an SVG diagram; the source block is
  marked processed. Source: the MutationObserver + `render()` (`data-mermaid-processed`).
- **BEH-2 — An invalid diagram shows an error, not a crash.** If mermaid can't parse the source, the block
  is replaced with an error view showing the offending source (`.mermaid-error-source`), and the page
  keeps working. Source: the `catch` around `mermaid.render`.
- **BEH-3 — The rendered diagram can be zoomed.** Clicking a rendered diagram opens a zoom overlay
  (`.mermaid-zoom-overlay`) with zoom/pan controls. Source: `openZoomModal`.

## Not present (scope)
No config, tools, API, or server state. Ships a skill that teaches the agent Mermaid syntax (not e2e-tested here).
