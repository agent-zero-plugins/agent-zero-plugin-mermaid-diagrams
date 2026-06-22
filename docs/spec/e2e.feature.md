# mermaid-diagrams — E2E behaviour, in BDD

Generated from the final e2e spec for `agent-zero-plugin-mermaid-diagrams` (plugin id / mount
`mermaid_diagrams`, `usr/plugins/`). Each `Scenario` is one falsifiable assertion. Browser scenarios
drive the **real** browser against a freshly-booted Agent Zero with the plugin installed-once from
its built ZIP (the renderer is served same-origin via in-spec `page.route()` over a **vendored**
mermaid@11 ESM — no public CDN, no `e2e_pod_env`). Python/skill seams are exercised as **pytest**
unit/contract tests against the cloned + built plugin tree (no HTTP probe, no `dump_live`, no agent
turn). Each behaviour group is **one** `behaviour-*.mjs` default-export wrapped in **one** `test()` =
**one webm** video; `[coverage]` tallies and tracked skips are emitted via `console.log` /
`::warning::`. `<P>` is the project under test (none is needed — see G2).

## Hard rules (binding for this and every e2e/BDD spec in the fleet)

1. **No silent swallow.** Every scenario is a real, falsifiable assertion. Failures are recorded
   and turn the group RED — never caught-and-ignored. Each group emits a `[coverage]` tally.
2. **No fake green.** A scenario is either genuinely asserted or an explicit `@skip` with a tracked
   reason (issue link) — never a bare pass for an untested case.
3. **Self-provisioning fixtures, through the UI.** The suite creates whatever app state it needs
   (e.g. A0 projects) by driving the **real UI**, not backend/"magic" API calls. Skips for
   "needs a fixture" are not allowed once the fixture is buildable.
4. **LLM-less & hermetic.** Runtime/fork-seam behaviours are exercised via a deterministic
   pure-helper probe (`dump_live`), enabled for e2e only via `.devkit.yml e2e_pod_env`. No API key,
   no live MCP pod. A deterministic LLM stub is added only if a plugin truly needs an agent turn.
5. **≤10 grouped specs, one video each** (webm; no GIF conversion).
6. **Best-effort `try/catch` is reserved** for genuinely un-enableable env only (a real agent turn,
   OS clipboard) — anything reachable via a seam MUST hard-assert.
7. **Validated on the local fast loop** (disposable A0) before pushing; CI is the final gate.

> **Plugin-specific binding decisions** (how rules 3–4–6 are honoured here, given this plugin ships
> no `api/`, no `hooks.py`, no `tools/`, and a CDN-import renderer):
> - **Rule 4 here:** the renderer's first statement is a public-CDN ESM import. Hermeticity is
>   provided by in-spec `page.route('**/cdn.jsdelivr.net/npm/mermaid@11/**', …fulfill vendored ESM)`
>   installed **before the first `goto`** — explicitly NOT `e2e_pod_env` (that infra does not exist).
> - **Rule 4 here:** Python/skill seams (nudge, skill front-matter, scope-negatives) are **pytest**
>   units, not an in-pod `dump_live` — a `dump_live` would itself be an `api/` handler and contradict
>   the no-API scope-negative (PYT-18). They carry no webm.
> - **Rule 6 here:** the only `try/catch`-permitted paths are OS clipboard *contents* read (E2E-5b)
>   and a real LLM agent turn (PYT-15b, tracked `@skip`).
> - **Known defects** are encoded as **fail-on-fix** contracts (LINT-20 version mismatch, LINT-16b
>   hard-coded dark theme), never as e2e scenarios that pass *because* the defect exists.

---

## Feature: Injection gate (Tier-A, CDN-independent)  *(group 01)*

```gherkin
Background:
  Given a freshly booted Agent Zero with the mermaid_diagrams plugin installed once from its ZIP
  And the install-once lifecycle has enabled and reloaded the plugin (no manual toggle)
  And I am on an authenticated, credentialed session

Scenario: Sidebar-end x-component injection is present (E2E-1)
  When I wait for an x-component whose path matches mermaid_diagrams + mermaid-renderer
  Then the locator is attached
  And its path attr contains extensions/webui/sidebar-end/mermaid-renderer.html
  And its closest x-extension has id "sidebar-end"

Scenario: Backend lists the extension when enabled (E2E-1b)
  When I call /api/load_webui_extensions for extension_point sidebar-end with filter *.html
  Then the response contains a path matching /mermaid_diagrams/.*mermaid-renderer\.html
```

> Closes C-4 / former E2E-2: the *disabled → no injection* negative is NOT an in-page toggle. It
> lives in the `verify-uninstalled` lifecycle hook — after the uninstall step it asserts zero
> `x-component[path*="mermaid_diagrams"]` and that `/api/load_webui_extensions` returns no
> `mermaid_diagrams` path. Toggling the plugin off mid-suite would break every later Tier-B group on
> the shared boot, so it is deliberately moved out of this group.

---

## Feature: Readiness probe + no-config negative (Tier-A)  *(group 02)*

```gherkin
Scenario: Render-pipeline readiness is itself falsifiable (E2E-22)
  Given the mermaid route is installed before goto over the vendored ESM
  When the page loads
  Then the plugin's injected .mermaid-zoom-overlay style rule is present in document.styleSheets
  And a minimal injected fence yields a .mermaid-diagram-container (the observer attached)

Scenario: Readiness failure degrades honestly, never fakes (E2E-22-skip)
  Given neither readiness signal appears in this environment
  Then the render tier (G3–G8) emits a tracked ::warning::SKIP with an issue link
  And no render scenario is reported as passing

Scenario: This plugin ships no config panel (E2E-17)
  When I read the served file list for mermaid_diagrams
  Then it contains no webui/config.html, config.js, or schema (webui/ is .gitkeep + thumbnail.png)
  And the manifest has per_project_config:false and per_agent_config:false
```

---

## Feature: Auto-render of a valid mermaid block (Tier-B)  *(group 03)*

```gherkin
Background:
  Given the mermaid route is installed before goto and readiness was verified (E2E-22)
  And if the route cannot be installed pre-navigation the group emits ::warning::SKIP and returns

Scenario: Outermost wrapper is replaced by .mermaid-diagram-container (E2E-3)
  Given a ```mermaid fence "graph TD; A[Start] --> B[End];" injected as a markdown block
  When the observer processes it
  Then a .mermaid-diagram-container appears
  And the original .markdown-block-wrap probe is gone
  And the container is not nested inside any residual .markdown-block-wrap or .code-block-wrapper

Scenario: Live-pipeline contract through A0's real renderer (E2E-3-real)
  Given the fence is rendered via the real marked.parse + sanitizeHtml + adjustMarkdownRender path
  Then code.language-mermaid survives sanitisation (class allowed)
  And the observer renders a .mermaid-diagram-container .mermaid-rendered svg

Scenario: Rendered SVG is present and sized (E2E-4)
  Then .mermaid-diagram-container .mermaid-rendered svg is visible
  And the computed cursor of .mermaid-rendered is "zoom-in"
  And the SVG max-width is <= 100% of its container

Scenario: Idempotency — re-fired mutations don't double-process (E2E-3b)
  When an unrelated body node is appended to re-fire the observer and I wait > the 150ms debounce
  Then there is exactly one .mermaid-diagram-container for the probe
  And any surviving source code carries data-mermaid-processed="true"
  And the container count is stable

Scenario: Pre-existing-DOM sweep at load consumes the block (E2E-3c)
  Given the fixture is injected before a reload that re-mounts the extension (route re-installed)
  When the page reloads
  Then the block is rendered by the load-time processMermaidBlocks() sweep with no new mutation
```

---

## Feature: Hover toolbar — toggle-source & copy (Tier-B)  *(group 04)*

```gherkin
Scenario: Action toolbar attached; opacity gated by hover (E2E-5)
  Then .mermaid-actions is attached with computed opacity "0" initially
  And after hovering the container the computed opacity is "1"
  And it contains .mermaid-zoom-open, .mermaid-toggle-source, .mermaid-copy-source

Scenario: Toggle source visibility and icon flip (E2E-5a)
  When I click .mermaid-toggle-source
  Then .mermaid-source computed display is "block" and the icon span reads "code_off"
  And clicking again returns display "none" and icon "code"
  And .mermaid-source pre > code decodes to "graph TD; A[Start] --> B[End];"
  And its innerHTML shows &lt;/&gt; escapes where present

Scenario: Copy source writes raw text and flips icon for 2000ms (E2E-5b)
  Given a spy is installed on navigator.clipboard.writeText and document.execCommand before the click
  When I click .mermaid-copy-source
  Then the icon flips to "check" and after ~2000ms (polled) returns to "content_copy"
  And if clipboard-read is granted, navigator.clipboard.readText equals the raw un-escaped source
  And otherwise exactly one of writeText/execCommand was called with the raw source

Scenario: Copy falls back to execCommand when clipboard API rejects (E2E-5b-fallback)
  Given navigator.clipboard.writeText is stubbed to reject
  When I click .mermaid-copy-source
  Then the document.execCommand('copy') branch ran (EC-4 actually exercised, not merely reachable)
```

---

## Feature: Zoom viewer — open & SVG sizing (Tier-B)  *(group 05)*

```gherkin
Scenario: Overlay opens via diagram click and via zoom button (E2E-6)
  When I click .mermaid-rendered, then close, then click .mermaid-zoom-open
  Then in each case a .mermaid-zoom-overlay is appended to document.body
  And its computed position is "fixed" and z-index is "10000"
  And it gains .active within a frame
  And it contains a fresh-copy svg distinct from the in-message SVG node
  And on open the % label reads "100%" and the transform is "translate(0px, 0px) scale(1)"

Scenario: Overlay is a singleton — opening again removes the prior (E2E-6b)
  When I open the overlay a second time without closing
  Then there is exactly one .mermaid-zoom-overlay

Scenario: Modal SVG gets explicit pixel sizing from viewBox (E2E-6c)
  Given the graph TD fixture whose SVG emits a 4-tuple viewBox
  When the overlay opens
  Then the SVG width/height attributes are removed
  And inline style width/height equal viewBox[2]/viewBox[3] in pixels
  And style.maxWidth is "none"
```

---

## Feature: Zoom math — wheel, buttons, clamp, reset (Tier-B)  *(group 06)*

```gherkin
Scenario: Wheel zoom toward pointer with preventDefault (E2E-7)
  Given the overlay is open
  When I dispatch a wheel event with deltaY<0 over a known clientX/Y
  Then the parsed scale is ~1.15 and the label is ~"115%"
  And the pan offset moved toward the pointer (panX/panY non-zero)
  And the wheel event's defaultPrevented is true (asserted via a spy, not window.scrollY)
  And a deltaY>0 wheel divides the scale by 1.15

Scenario: Button zoom steps and clamp bounds (E2E-7)
  When I click [data-action="zoom-in"] from reset then [data-action="zoom-out"]
  Then scale goes x1.3 (label "130%") then /1.3
  And spamming zoom-out floors scale at 0.1 (label "10%"), never below
  And spamming zoom-in caps scale at 10 (label "1000%"), never above

Scenario: Reset zoom restores identity transform (E2E-9)
  Given the overlay is zoomed and panned to a non-default state
  When I click [data-action="zoom-reset"]
  Then the transform is "translate(0px, 0px) scale(1)" and the label is "100%"
```

---

## Feature: Pan + close behaviours (Tier-B)  *(group 07)*

```gherkin
Scenario: Pan with left-button drag and cursor states (E2E-8)
  Given the overlay is open
  When I mousedown {button:0} on the viewport, mousemove on window by (dx,dy), then mouseup
  Then during the drag the viewport computed cursor is "grabbing"
  And the transform panX/panY equal dx/dy within rounding
  And after mouseup the cursor is "grab"
  And panning still tracks when mousemove is dispatched outside the viewport (on window)

Scenario: Right-button drag does not pan (E2E-8)
  When I mousedown {button:2} on the viewport and move
  Then the transform is unchanged

Scenario: Close via close button, Escape, and background click (E2E-10)
  When from a freshly opened overlay I click .mermaid-zoom-close
  Then the overlay is removed
  And pressing Escape from a fresh overlay removes it
  And clicking the overlay background (e.target===overlay) removes it
  And clicking on .mermaid-zoom-content does NOT close it (overlay persists)

Scenario: Escape listener self-removes — no stale double-fire (E2E-10)
  Given an overlay was closed via Escape
  When I open a new overlay
  Then no stale Escape handler double-fires (one close works, a no-op survives)
```

---

## Feature: Error path, edge cases, wrapper breadth, listener leak (Tier-B)  *(group 08)*

```gherkin
Scenario: Inline syntax-error display structure (E2E-12)
  Given a source that reliably throws on the pinned mermaid@11 ("flowchart\n@@@bad@@@")
  When the observer processes it
  Then the original wrapper is replaced by .mermaid-diagram-container
  And container > .mermaid-error has an error icon and text beginning "Mermaid syntax error:"
  And container > pre.mermaid-error-source > code is a sibling of .mermaid-error echoing escaped source
  And container .mermaid-rendered count is 0
  And the original <pre><code> raw markup is gone
  And any #d<wrapperId> orphan node mermaid injected is absent from the DOM

Scenario: Wrapper replacement removes the core copy button (E2E-11)
  Given a fixture where .step-action-buttons is a sibling of .code-block-wrapper inside .markdown-block-wrap
  When the block renders
  Then that block's .step-action-buttons is gone (replaced with the outer wrapper)
  And the plugin's own .mermaid-copy-source is present instead

Scenario: Empty fence is stamped, not replaced (E2E-13a)
  Given a code.language-mermaid that is whitespace-only
  When the observer runs
  Then there is no .mermaid-diagram-container for it
  And the code carries data-mermaid-processed="true" and the raw block persists

Scenario: Streaming/partial render via real message-body re-render (E2E-13b)
  Given a partial fence rendered first, then the host innerHTML replaced with a fuller fence (new code node)
  When the observer fires on the rewritten body
  Then the originally-rendered container reflects the first-sight content
  And the same logical block is not re-rendered (encodes latent defect L-2 as a falsifiable fact)

Scenario: Window listener leak is masked by the singleton (E2E-13c)
  Given the overlay is opened and closed 5 times, then opened once more
  When I perform a single drag
  Then it pans correctly and exactly once (no multiplied pan from leaked window listeners — encodes L-3)

Scenario: viewBox-less SVG modal falls back to auto/auto (E2E-13d)
  Given an SVG lacking a valid 4-tuple viewBox stubbed before open
  When the overlay opens
  Then the overlay SVG inline style width is "auto" and height is "auto" (documents L-4 collapse-risk)
```

---

## Feature: Persistence & security (Tier-A/B mixed)  *(group 09)*

```gherkin
Scenario: No persisted browser state across reload (E2E-19)
  Given a diagram is rendered and the zoom overlay is open
  When I reload the page
  Then localStorage and sessionStorage contain no mermaid* keys and there is no plugin cookie
  And the overlay is gone and the diagram re-renders only from re-injected message DOM

Scenario: securityLevel 'loose' honours inline HTML/click in diagram source (E2E-16)
  Given a diagram whose label embeds a click/HTML directive with a benign observable marker
  When it renders
  Then the rendered SVG contains the honoured directive output (click-bound element / unescaped node)
  And this pins SEC-1 (issue NN); if the plugin moves to strict/antiscript this scenario flips
```

---

## Feature: CDN-blocked graceful degradation (Tier-A)  *(group 10)*

```gherkin
Scenario: Enabled + CDN blocked → injection present, no render, no user-facing error (E2E-21)
  Given page.route('**/cdn.jsdelivr.net/npm/mermaid@11/**', r => r.abort()) installed before goto
  And the plugin is enabled (install-once)
  When I inject a valid ```mermaid fence through the real pipeline and wait > (debounce + render budget)
  Then the UI-1 injection is still attached (the x-component host is independent of the import)
  And no .mermaid-diagram-container ever appears (polled then asserted absent)
  And no user-facing error surfaces — no .mermaid-error, no toast, no visible error element
  And the import failure does not bubble as a UI error (it may log; it must not render)
```

---

## Out-of-band seam tests (no webm) — pytest & contracts

These run in CI alongside the e2e groups. They are NOT part of the ≤10 webm budget. They close C-1
(no `dump_live`/HTTP probe, which would contradict PYT-18's no-API scope-negative).

```gherkin
# --- tests/pytest/ : Python/skill seams against the cloned + built plugin tree ---

@pytest-tier  PYT-14   System-prompt nudge appends MERMAID_BEHAVIORAL_NUDGE
  Given MermaidNudge constructed with a fake non-None agent
  When execute(system_prompt=[], loop_data=LoopData()) is awaited
  Then the list grew by 1 and the appended string equals MERMAID_BEHAVIORAL_NUDGE exactly
  And it contains the cue tokens, type-selection guidance, "Do not overuse" and "Load the mermaid skill"

@pytest-tier  PYT-14b  Nudge guard — falsy agent is a no-op
  Given MermaidNudge with self.agent falsy
  When execute(system_prompt=[], …) is awaited
  Then system_prompt is unchanged (len 0)

@pytest-tier  PYT-15   Skill availability — file + triggers
  When skills/mermaid/SKILL.md front-matter is parsed
  Then name == "mermaid"
  And triggers == [mermaid, diagram, flowchart, visualize, draw, "show me", "sequence diagram"]
  And the body has the diagram-type table (>=10 rows) and the ```mermaid output-format instruction

@pytest-tier  PYT-18   Scope-negatives — no API/hooks/tools/fork seams
  When the built plugin tree is walked
  Then there is no api/ dir, no hooks.py, no tools/, no extensions/python/**/_functions* (@extensible)
  And __init__.py is docstring-only and the only system_prompt extension is _15_mermaid_nudge.py

# --- tests/contracts/ : fail-on-fix lints documenting known defects ---

@contract-tier  LINT-20  Manifest version consistency (fail-on-mismatch)
  Then plugin.yaml.version == meta.yaml.version
  # currently 0.1.1 vs 0.1.0 → FAILS today as the tracked fixable signal (I-1, issue NN)

@contract-tier  LINT-16b Theme config is hard-coded dark (source read, not SVG scraping)
  Then mermaid.initialize sets theme:'base' with the dark Catppuccin palette
  And there is no light-mode branch despite the README "Light/Dark mode" claim (I-2)
```

---

## Tracked skips (explicitly not-covered, not silently passed)

```gherkin
@needs-real-llm  PYT-15b  end-to-end agent turn (BEH-10/11 through the model)
  -> https://github.com/agent-zero-plugins/agent-zero-plugin-mermaid-diagrams/issues/NN
     Rule 6: requires a real LLM turn; asserted deterministically via PYT-14/PYT-15 instead.

@needs-env  G3–G8 / G10-render  mermaid route not installable pre-navigation
  -> issue NN: group-level ::warning::SKIP only when page.route() cannot be installed before goto;
     issue-linked, never faked. Mirrors the existing CDN-dependent behaviour.mjs.

@os-boundary  E2E-5b clipboard *contents* read
  -> Rule-6 try/catch path: when the browser denies clipboard-read, contents are not read; the
     write/execCommand spy still hard-asserts (no swallow) and E2E-5b-fallback forces the execCommand path.
```
