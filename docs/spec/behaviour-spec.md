# Behaviour & UI Specification — `agent-zero-plugin-mermaid-diagrams`

**Status:** After-the-fact, reverse-engineered from source at `agent-zero-plugins/agent-zero-plugin-mermaid-diagrams@main` (depth-1 clone), cross-checked against live A0 source at `/a0`.
**Plugin version:** `plugin.yaml` declares `0.1.1`; `meta.yaml` declares `0.1.0`; README OCI example pins `0.1.0`. **(Inconsistency I-1 — see §8.)**
**Plugin id / mount dir:** `mermaid_diagrams` (under `usr/plugins/`).
**Conformance language:** RFC 2119 (MUST/SHOULD/MAY) describes *observed* behaviour, not aspiration.

## 1. Scope & component inventory

The plugin adds three independent layers; none requires configuration (`default_config.yaml` is empty by design; `meta.yaml` `env: []`).

| Layer | Artifact | A0 seam |
|---|---|---|
| L1 WebUI renderer | `extensions/webui/sidebar-end/mermaid-renderer.html` | `sidebar-end` HTML extension point |
| L2 Agent skill | `skills/mermaid/SKILL.md` | A0 skills loader (trigger-matched) |
| L3 Behavioural nudge | `extensions/python/system_prompt/_15_mermaid_nudge.py` | `system_prompt` python extension point |

Manifest flags (`plugin.yaml`): `always_enabled: false`, `per_project_config: false`, `per_agent_config: false`. The plugin therefore has **no config screen** (see §4) and is enabled globally via the standard plugin toggle.

---

## 2. User-facing behaviours (BEH-n)

**BEH-1 — Auto-render of `mermaid` fenced code blocks.**
*Trigger:* A chat message renders a `pre > code.language-mermaid` block (A0's markdown pipeline assigns the `language-mermaid` hljs class to a ` ```mermaid ` fence; confirmed at `/a0/webui/js/messages.js` `adjustMarkdownRender`).
*Effect:* The plugin replaces the **outermost** markdown wrapper (`.markdown-block-wrap`, else `.code-block-wrapper`, else the `<pre>`) with a `.mermaid-diagram-container` holding the rendered SVG. Detection is via a `MutationObserver` on `document.body` (`childList:true, subtree:true`), debounced 150 ms; a pre-existing-DOM sweep (`processMermaidBlocks()`) runs once at script load.
*Idempotency:* Each `code` element is stamped `data-mermaid-processed="true"` **before** async render begins, and the selector excludes `[data-mermaid-processed]`, so re-fired mutations never double-process. (See edge case EC-1.)

**BEH-2 — Inline syntax-error display.**
*Trigger:* `mermaid.render()` throws (invalid diagram source).
*Effect:* The container shows a `.mermaid-error` banner (`error` icon + `"Mermaid syntax error: <message>"`, HTML-escaped) above a `.mermaid-error-source` `<pre>` echoing the original (escaped) source. Any orphan render node Mermaid injected (`#d<wrapperId>`) is removed. The original code block is still replaced (the error block takes its place), so a bad diagram does not leave raw fence markup behind.

**BEH-3 — Open full-screen zoom/pan viewer.**
*Trigger:* Click the rendered diagram (`.mermaid-rendered`, cursor `zoom-in`) **or** click the `.mermaid-zoom-open` toolbar button.
*Effect:* A fixed `.mermaid-zoom-overlay` (z-index 10000, blurred backdrop) is appended to `document.body` with a fresh copy of the SVG. State resets each open (`scale=1, panX=0, panY=0`). The SVG gets an explicit pixel `width`/`height` derived from its `viewBox` (workaround for Mermaid emitting `width="100%"`/no height, which collapses to 0×0 inside the flex-centred modal); if no valid 4-tuple viewBox, falls back to `auto`/`auto`.

**BEH-4 — Zoom (wheel + buttons).**
*Trigger:* Mouse wheel inside `.mermaid-zoom-viewport` (×1.15 / ÷1.15, zooms toward pointer); `zoom-in` button (×1.3); `zoom-out` button (÷1.3).
*Effect:* `scale` clamped to **[0.1, 10]**; transform = `translate(panX,panY) scale(scale)`; live `%` label updated. Wheel handler is `passive:false` and calls `preventDefault` (page does not scroll while zooming).

**BEH-5 — Pan (drag).**
*Trigger:* Left-button (`button===0`) mousedown in viewport → mousemove. Cursor switches `grab`→`grabbing`→`grab`.
*Effect:* `panX/panY` track pointer delta from drag origin. `mousemove`/`mouseup` are bound to `window` (drag continues outside the viewport).

**BEH-6 — Reset zoom.**
*Trigger:* `zoom-reset` (`fit_screen`) button. *Effect:* `scale=1, pan=0,0`, transform + label updated.

**BEH-7 — Close zoom viewer.**
*Triggers (3):* `close` button; `Escape` key; click on overlay background (`e.target===overlay`, i.e. not on content/toolbar). *Effect:* Overlay removed, `modal.overlay=null`. The `Escape` keydown listener removes itself on fire. (See edge case EC-3 for listener-leak note.)

**BEH-8 — Toggle source visibility.**
*Trigger:* `.mermaid-toggle-source` button (hover toolbar). *Effect:* Toggles `.mermaid-source` `display` block/none; icon flips `code`↔`code_off`. Source is the original fence text, HTML-escaped, in a `<pre><code>`.

**BEH-9 — Copy source to clipboard.**
*Trigger:* `.mermaid-copy-source` button. *Effect:* Writes the **raw (un-escaped)** source via `navigator.clipboard.writeText`; on failure (non-HTTPS / no clipboard API) falls back to a hidden `<textarea>` + `document.execCommand('copy')`. Icon flips to `check` for 2000 ms then back to `content_copy`.

**BEH-10 — Agent-side Mermaid skill availability.**
*Trigger:* Agent encounters a skill trigger word (`mermaid`, `diagram`, `flowchart`, `visualize`, `draw`, `show me`, `sequence diagram`) — or is told by the nudge (BEH-11) to load it.
*Effect:* `skills/mermaid/SKILL.md` (10 diagram types, type-selection table, syntax reference, best practices, pitfalls) becomes available to the agent so it emits correct ` ```mermaid ` markup that BEH-1 then renders.

**BEH-11 — System-prompt behavioural nudge.**
*Trigger:* Every agent message-loop iteration that builds the system prompt (`system_prompt` extension point; ordered by the `_15_` filename prefix). *Effect:* `MermaidNudge.execute()` appends `MERMAID_BEHAVIORAL_NUDGE` to the `system_prompt` list, instructing the model to produce diagrams on cues like "show me/visualize/draw/diagram", to pick a diagram type by intent, to *not* overuse diagrams, and to load the mermaid skill for syntax. Guarded by `if not self.agent: return`.

---

## 3. Injected UI components (UI-n)

| UI | Selector | Location | Shows / does | Traces to |
|---|---|---|---|---|
| UI-1 | (host) `x-extension#sidebar-end` → injected `x-component[path*="mermaid_diagrams"][path*="mermaid-renderer"]` | Left sidebar end (`/a0/webui/components/sidebar/left-sidebar.html`) | Invisible mount (`<div style="display:none">`); carries the `<script type="module">` + `<style>`. Presence proves install+enable (the only CDN-independent signal — the e2e gate keys on exactly this). | BEH-1 |
| UI-2 | `.mermaid-diagram-container` | In-message, replaces the markdown block | Wrapper (rounded, subtle bg/border, `overflow:hidden`) for diagram + actions + source. | BEH-1 |
| UI-3 | `.mermaid-rendered` (contains `svg`, cursor `zoom-in`) | Inside UI-2 | Rendered SVG, centred, horizontally scrollable, `max-width:100%`. Click → BEH-3. | BEH-1, BEH-3 |
| UI-4 | `.mermaid-actions` (opacity 0 → 1 on container hover) | Top-right of UI-2 | Hover toolbar containing UI-5/6/7. | BEH-3/8/9 |
| UI-5 | `.mermaid-zoom-open` (`zoom_in` icon) | In UI-4 | Opens zoom viewer (BEH-3). | BEH-3 |
| UI-6 | `.mermaid-toggle-source` (`code`/`code_off`) | In UI-4 | Toggles UI-8 (BEH-8). | BEH-8 |
| UI-7 | `.mermaid-copy-source` (`content_copy`/`check`) | In UI-4 | Copies source (BEH-9). | BEH-9 |
| UI-8 | `.mermaid-source > pre > code` (hidden by default) | Bottom of UI-2 | Escaped original source. | BEH-8 |
| UI-9 | `.mermaid-error` + `.mermaid-error-source` | Replaces UI-3 on failure | Red error banner + escaped source. | BEH-2 |
| UI-10 | `.mermaid-zoom-overlay` (`position:fixed; inset:0; z-index:10000`) | `document.body` | Full-screen modal; background click closes (BEH-7). | BEH-3/7 |
| UI-11 | `.mermaid-zoom-toolbar` with `.mermaid-zoom-btn[data-action]` ×4 + `.mermaid-zoom-level` | Top of UI-10 | zoom-out / level% / zoom-in / reset / close. | BEH-4/6/7 |
| UI-12 | `.mermaid-zoom-viewport > .mermaid-zoom-content > svg` | Body of UI-10 | Pan/zoom surface (`cursor:grab`; transform on content). | BEH-4/5 |

All icons are Material Symbols Outlined (`<span class="material-symbols-outlined">`), relying on the font already loaded by core A0 (dependency D-3). **No `data-testid`s** are emitted; selectors are class/role/text only (consistent with core A0 conventions).

---

## 4. Config screen

**None.** No `webui/config.html`, no `webui/config.js`, no schema, and `default_config.yaml` is an empty comment. Manifest sets `per_project_config:false`, `per_agent_config:false`, so the A0 settings store's config-panel open path (`openConfig → loadProjects → _hasProject`) is never engaged for this plugin. There are **zero user-tunable controls**; theme, zoom limits (0.1–10), zoom steps (1.15/1.3), and debounce (150 ms) are hard-coded constants. *(Verifiability note: any future requirement to make these configurable is currently un-met by design and would need a config surface.)*

---

## 5. Backend / API surface & A0 extension seams

The plugin ships **no `api/` handlers, no `hooks.py`, no tools, and no `_functions` `@extensible` fork-seam hooks.** `__init__.py` is a docstring only. It is a pure consumer of three **existing upstream** seams:

- **S-1 `sidebar-end` HTML extension point (upstream).** A0 core renders `<x-extension id="sidebar-end">` in the left sidebar. `/a0/webui/js/extensions.js` calls `POST /api/load_webui_extensions {extension_point, filters:["*.html",...]}`, wraps each returned path in `<x-component path=...>`, and a `MutationObserver` in `extensions.js` mounts dynamically-inserted `x-extension`s too. **No fork dependency.**
- **S-2 `POST /api/load_webui_extensions` (upstream, `/a0/api/load_webui_extensions.py`).** Lists enabled plugins' files for an extension point; gated by A0 auth (frontend uses `callJsonApi`, credentialed). The plugin defines no endpoints of its own.
- **S-3 `system_prompt` python extension point (upstream).** `Extension` base + `LoopData` from `helpers.extension`/`agent`; invoked via A0's `call_extensions_*` during loop prompt assembly (`/a0/extensions/python/system_prompt/` is the live host dir). File-prefix `_15_` sets ordering. **No fork dependency.**
- **S-4 A0 skills loader (upstream).** `skills/mermaid/SKILL.md` front-matter `triggers:` are consumed by core skill matching.

**Fork-vs-upstream conclusion:** the plugin depends **only on upstream A0 extension points**; it touches **no `@extensible` fork seams**. (Stated explicitly because the task asked to flag fork dependence — there is none.)

**External runtime dependency D-1 (load-bearing):** the renderer ESM-imports `mermaid@11` from `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs` **at runtime**. No bundling, no SRI, no version pin beyond major `11`. In an offline/sandboxed pod the import hangs/rejects → the whole inline module never executes → **no observer, no styles, no rendering** (documented failure mode in `tests/e2e/behaviour.mjs`; this is why the e2e gates only on UI-1 injection, not on render). **D-2:** `securityLevel:'loose'` is set on `mermaid.initialize` — Mermaid will honour inline HTML/click directives in diagram source; combined with rendering **model-authored** content this is a stored-XSS-adjacent surface (see EC-5). **D-3:** Material Symbols font from core A0.

---

## 6. State & persistence

- **No persisted state.** No `localStorage`/`sessionStorage`/cookies/backend writes. Nothing survives reload; on reload BEH-1 re-renders from message DOM.
- **Transient module state:** `renderCounter` (monotonic id source), `modal` singleton (`scale/pan/isPanning/...`), `debounceTimer`. A single shared `modal` object means **only one zoom overlay exists at a time** (opening a new one removes the prior — BEH-3 first line).
- **Per-element marker:** `data-mermaid-processed` on the source `code` element is the only DOM-persisted state (lives until the node is replaced).
- **Frontend cache:** A0 caches the extension HTML list (`extensions.js` `HTML_CACHE_AREA`); enabling/disabling the plugin requires the standard cache-clear/reload to take effect.

---

## 7. Edge cases & config-dependent behaviour

- **EC-1 Streaming/incremental render.** During token streaming a `mermaid` block may mount partially. The observer fires on each mutation but each `code` is stamped processed on first sight and rendered from `textContent` **at that instant** — a block that grows after first detection renders its **partial** source (then errors via BEH-2 or shows a truncated diagram). No re-render on later content change. *(Latent defect L-2.)*
- **EC-2 Empty source.** `if (!source) return;` after stamping processed → an empty fence is left stamped but never rendered/replaced (raw empty block persists). 
- **EC-3 Global listener accumulation.** Each `openZoomModal` adds `window` `mousemove`/`mouseup` handlers that are **never removed** (only the `keydown` Escape handler self-removes). Repeated opens leak listeners closing over stale `modal`/overlay; functionally masked because handlers early-return when `!modal.isPanning` and `modal` is a shared singleton, but it is an unbounded listener leak. *(Latent defect L-3.)*
- **EC-4 Non-HTTPS clipboard.** BEH-9 falls back to `execCommand('copy')` — covered.
- **EC-5 Malicious/untrusted diagram source + `securityLevel:'loose'`.** Diagram text is model-authored and rendered with loose security; click-binding/HTML in labels is honoured. Risk surface; no sanitisation. *(Security finding SEC-1.)*
- **EC-6 CDN unavailable (D-1).** Entire L1 layer silently inert; L2/L3 (skill + nudge) still function (agent still emits fences, they just don't render). No user-visible error is shown for this case (distinct from BEH-2, which only covers parse errors). *(Gap G-1.)*
- **EC-7 viewBox-less SVG in modal.** Falls back to `auto/auto`, which can re-collapse to 0×0 for some diagram types — zoom then operates on an invisible box. *(Latent defect L-4.)*
- **EC-8 Wrapper-replacement breadth.** BEH-1 replaces the *outermost* `.markdown-block-wrap`, which also carries A0's core copy button (`.step-action-buttons`); that core action is removed along with it for mermaid blocks (acceptable — the plugin supplies its own copy via BEH-9).

---

## 8. Self-review findings (IEEE-29148) — folded into the spec above

- **I-1 Version inconsistency (consistency):** `plugin.yaml 0.1.1` vs `meta.yaml 0.1.0` vs README/OCI `0.1.0`. The published OCI artifact and gate metadata will disagree with the manifest. **Recommend** aligning all three.
- **I-2 README vs reality (completeness/accuracy):** README "Features" lists "Light/Dark mode support," but `mermaid.initialize` hard-codes `theme:'dark'` with a fixed Catppuccin palette and `darkMode:true`; there is **no** light-mode path or theme switch. README claim is unverifiable against code → **flagged**, behaviour documented as dark-only (BEH-1).
- **G-1 No offline/CDN-failure UX (completeness):** EC-6 produces silent no-op; spec now names it as a gap rather than implying graceful degradation.
- **SEC-1 (verifiable security req):** `securityLevel:'loose'` over model-authored content (EC-5) should be reconsidered (`'strict'`/`'antiscript'`) or documented as accepted risk.
- **Traceability:** every UI-n now maps to ≥1 BEH-n and vice-versa; every seam (S-1..S-4) and dependency (D-1..D-3) is referenced by the behaviour it enables. Ambiguity removed by pinning all magic numbers (zoom 0.1–10, steps 1.15/1.3, debounce 150 ms, copy-feedback 2000 ms) to their source lines.
- **Scope clarity:** explicitly recorded the *negative* facts the task probed for — **no** config screen, **no** API handlers, **no** `hooks.py`, **no** tools, **no** `_functions`/`@extensible` fork seams, **no** persistence — so absence is not mistaken for omission.

---
*Source paths:* plugin clone `/tmp/fan-mermaid-diagrams`; renderer `/tmp/fan-mermaid-diagrams/usr/plugins/mermaid_diagrams/extensions/webui/sidebar-end/mermaid-renderer.html`; nudge `.../extensions/python/system_prompt/_15_mermaid_nudge.py`; skill `.../skills/mermaid/SKILL.md`; e2e `/tmp/fan-mermaid-diagrams/tests/e2e/behaviour.mjs`. Live A0 seams `/a0/webui/js/extensions.js`, `/a0/webui/components/sidebar/left-sidebar.html`, `/a0/webui/js/messages.js`, `/a0/api/load_webui_extensions.py`, `/a0/extensions/python/system_prompt/`.