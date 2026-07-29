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
- **BEH-3 — The rendered diagram can be zoomed.** Clicking a rendered diagram (or its zoom button) opens a
  zoom overlay (`.mermaid-zoom-overlay`) with a toolbar. Zoom-in/out change the zoom level, reset restores
  100%, and close (button or Escape) removes the overlay. Source: `openZoomModal` + toolbar handlers.
- **BEH-4 — The diagram source can be revealed and hidden.** The toggle-source action shows the original
  mermaid source under the rendered diagram and hides it again on a second activation. Source:
  `.mermaid-toggle-source` handler.
- **BEH-5 — The diagram source can be copied.** The copy action places the original mermaid source on the
  clipboard and gives visual feedback. Source: `.mermaid-copy-source` handler (clipboard API + execCommand
  fallback).
- **BEH-6 — All common diagram types render.** Not just flowcharts: sequence diagrams and state diagrams
  (representatives of the non-`graph` grammars) also render to SVG. Source: mermaid@11 grammar support
  through the same `render()` path.
- **BEH-7 — Only mermaid blocks are touched.** A non-mermaid fenced code block (e.g. `language-python`) is
  left untouched — never replaced, never marked processed. Source: the `code.language-mermaid` selector.
- **BEH-8 — The bundled mermaid skill is discoverable by the agent.** The plugin ships
  `skills/mermaid/SKILL.md` with valid front-matter (name/description/triggers) so A0's skill loader can
  surface it. Pytest-tier (file/front-matter contract; no UI surface).
- **BEH-9 — The agent is nudged to use diagrams.** The `system_prompt` extension appends the visual-
  explanations nudge; the `get_prompt_fragments` hook publishes the same nudge as an enumerable, UNBOUND
  PromptFragment. Pytest-tier (prompt seam; no UI surface).

## Not present (scope)
No config, tools, API, or server state.
