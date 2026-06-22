# E2E Test Spec — `agent-zero-plugin-mermaid-diagrams`

**Target:** `agent-zero-plugins/agent-zero-plugin-mermaid-diagrams@main` (plugin id / mount `mermaid_diagrams`, `usr/plugins/`).
**Harness contract (corrected per C-3/C-4):** the testkit installs the built plugin ZIP and reloads **once** before any behaviour runs (`PluginsPage.installFromZip` + lifecycle). Each behaviour group is **one plain async default-export function** `export default async function ({ page, expect, baseURL }) { … }` in a `behaviour-*.mjs` module, discovered via `BEHAVIOUR_SPECS` JSON and wrapped by the testkit in **one** `test(\`behaviour: ${name}\`)` = **one webm video**. There is **no** Playwright `test()`/`test.skip()` inside a behaviour module. "Group RED" = the function throws. The `[coverage]` tally and tracked skips are emitted as `console.log('[coverage] …')` and `console.log('::warning::SKIP …')` (the harness greps `::warning::`).
**Two seam layers:**
- **Browser seams** exercised in-spec via Playwright (`page.route`, `page.evaluate`, real markdown pipeline).
- **Python/file seams** (nudge class, skill front-matter, scope-negatives) exercised as **pytest unit/contract tests** against the cloned + built plugin tree — **not** via any in-pod HTTP probe (see C-1). These live in `tests/pytest/` and run in CI alongside e2e; they are **not** part of the ≤10 webm budget.
**Source of truth inspected:** renderer `extensions/webui/sidebar-end/mermaid-renderer.html`; nudge `extensions/python/system_prompt/_15_mermaid_nudge.py`; skill `skills/mermaid/SKILL.md`; manifest `plugin.yaml` (`0.1.1`, `always_enabled:false`, `per_project_config:false`, `per_agent_config:false`); `meta.yaml` (`0.1.0`, `env:[]`); empty `default_config.yaml`; `__init__.py` docstring-only; `webui/` holds only `.gitkeep` + `thumbnail.png` (no `config.html`); shared testkit submodule `tests/_testkit`. Live A0 seams (read-only, for selector/shape fidelity): `/a0/webui/js/extensions.js`, `/a0/webui/components/sidebar/left-sidebar.html` (`<x-extension id="sidebar-end">` @ line 35), `/a0/webui/js/messages.js` `adjustMarkdownRender` (`.markdown-block-wrap > [.code-block-wrapper, .step-action-buttons]`; lines 711–732, 1774–1781), `/a0/webui/js/safe-markdown.js` (`marked.parse` → `sanitizeHtml`/DOMPurify @ line 29, `FORBID_TAGS` includes `svg`), `/a0/api/load_webui_extensions.py`, `/a0/extensions/python/system_prompt/`, project UI (`/a0/webui/components/projects/project-create.html`, `project-edit-basic-data.html`), `/a0/webui/js/initFw.js` (`$confirmClick`).

---

## PREAMBLE — Hard rules (binding; reproduced verbatim at the top of every `behaviour-*.mjs` and `tests/pytest/`)

> 1. **No silent swallow.** Every check is a real, falsifiable assertion. Failures throw and turn the group RED — never caught-and-ignored. Each group emits a `[coverage]` tally on completion.
> 2. **No fake green.** A check is either genuinely asserted or an explicit tracked skip (`console.log('::warning::SKIP <id> — <issue url>')`) — never a bare pass for an untested case. **Known defects are encoded as fail-on-fix pytest/lint contract tests, never as e2e scenarios that pass *because* the defect exists** (m-1).
> 3. **Self-provisioning fixtures, through the real pipeline.** App state is created by driving the REAL UI or the REAL markdown renderer (`marked.parse` + `sanitizeHtml`), not backend/"magic" API calls. Hand-injected DOM is used only for cheap variant coverage *in addition to* at least one true end-to-end pipeline fixture (M-3).
> 4. **LLM-less & hermetic.** Browser render is made deterministic by serving mermaid same-origin via in-spec `page.route()` over a **vendored** ESM (no public CDN, no `e2e_pod_env` request-aliasing — that infra does not exist; C-2). Python seams are pure unit tests. No API key, no live MCP pod.
> 5. **≤10 grouped behaviour modules, one webm each** (no GIF). Pytest seam tests are out-of-band (no video).
> 6. **Best-effort try/catch reserved** for genuinely un-enableable env only (OS clipboard *contents* read, a real agent turn) — anything reachable via a seam MUST hard-assert.
> 7. **Validated on the local fast loop** (disposable A0) before pushing; CI is the final gate.

### Preamble — how the hard rules bind THIS plugin (decisions baked into the suite)

- **The CDN problem is the central design constraint AND a first-class behaviour to assert (not engineer away).** The renderer's first statement is `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/...'` (`mermaid-renderer.html:7`). Two real behaviours both matter and are BOTH asserted:
  - **CDN-available render pipeline (Tier-B):** made hermetic by `page.route('**/cdn.jsdelivr.net/npm/mermaid@11/**', r => r.fulfill({ path: vendoredEsm, contentType: 'text/javascript' }))` installed **before the first `goto`** (the import runs at page-module load), backed by a mermaid@11 ESM **vendored into the repo**. This turns the render pipeline into a deterministic seam we HARD-assert. If a given env cannot install the route before navigation, the whole render tier degrades to a tracked `::warning::SKIP` (issue NN) — honest, never faked, exactly like the existing `behaviour.mjs` is CDN-dependent.
  - **CDN-blocked graceful degradation (G-A / G11):** with `page.route('**/cdn.jsdelivr.net/npm/mermaid@11/**', r => r.abort())` installed before `goto`, we assert the documented silent-inert behaviour: injection still present, no container ever renders, no user-facing error. This is the single most important real-world behaviour of the plugin and is now a positive, falsifiable group.
- **Python/skill seams are pytest, not `dump_live` (C-1).** The plugin ships **no `api/`, no `hooks.py`, no `tools/`, no `_functions`/`@extensible` fork hooks** — confirmed, and E2E-18 hard-asserts this. A `dump_live` HTTP probe would itself be an `api/` handler and directly contradict E2E-18. Therefore: (a) BEH-11 nudge is a **pytest unit** that imports `MermaidNudge`, constructs it with a fake agent (testkit `fakes.py`), and asserts `system_prompt.append` semantics; (b) BEH-10 skill is a **pytest** front-matter read of the installed `SKILL.md`; (c) scope-negatives are **pytest file-listing/contract** assertions over the built plugin tree (reachable via container exec / the built ZIP). No live endpoint, no env seam, no Playwright.
- **A real agent turn (BEH-10/11 end-to-end through the model) is the ONLY try/catch-permitted runtime path** (Rule 6) and is a tracked `::warning::SKIP` with an issue link; the pytest checks are the asserted substitute.
- **OS clipboard *contents* read (BEH-9) is the second Rule-6 path:** granted `clipboard-read` when the browser allows (hard-assert contents), else asserted via a pre-installed spy on `navigator.clipboard.writeText` + `document.execCommand` (still hard, no swallow), with a forced-fallback sub-case (m-4).
- **Self-provisioning (Rule 3):** the render groups feed at least one ` ```mermaid ` fence through A0's **actual** `marked.parse` + `sanitizeHtml` (M-3) so the live-pipeline contract is tested, plus hand-injected variants for cheap coverage. The project-fixture lifecycle is **dropped** (M-5): E2E-17 proves the no-config negative by file-listing + manifest read, which needs no project.
- **Determinism (Rule 1):** all magic numbers pinned to source — zoom clamp **[0.1, 10]** (`:32–33`), wheel step **×1.15 / ÷1.15** (`:128`), button step **×1.3 / ÷1.3** (`:163–164`), debounce **150 ms** (`:297`), copy-feedback **2000 ms** (`:265`), overlay **z-index 10000** (`:441`), reset transform `translate(0px, 0px) scale(1)` (`:102`/`:165`). Assertions read computed values, never sleep-and-hope.

### Coverage map (every BEH/UI/EC → ≥1 id; ⟲ = closed/changed-by finding)

BEH-1→E2E-3/4; BEH-2→E2E-12 (⟲M-1); BEH-3→E2E-6; BEH-4→E2E-7; BEH-5→E2E-8; BEH-6→E2E-9; BEH-7→E2E-10; BEH-8→E2E-5a; BEH-9→E2E-5b; BEH-10→PYT-15 (⟲C-1); BEH-11→PYT-14 (⟲C-1).
UI-1→E2E-1; UI-2→E2E-3/E2E-11 (⟲M-2); UI-3→E2E-4; UI-4→E2E-5; UI-5→E2E-6; UI-6→E2E-5a; UI-7→E2E-5b; UI-8→E2E-5a; UI-9→E2E-12 (⟲M-1); UI-10→E2E-6/10; UI-11→E2E-7/9/10; UI-12→E2E-7/8.
EC-1→E2E-13b (⟲G-E); EC-2→E2E-13a; EC-3→E2E-13c (⟲G-B, newly added); EC-4→E2E-5b (⟲m-4); EC-5→E2E-16; EC-6→**E2E-21 CDN-blocked degradation** (⟲G-A — re-pointed off the wrong E2E-2 mapping); EC-7→E2E-13d; EC-8→E2E-11 (⟲M-2).
Scope-negatives → PYT-18 (no API/hooks/tools/fork seams), E2E-19 (no persisted browser state), E2E-17 (no config panel; ⟲M-5).
Known-defect contracts (fail-on-fix, NOT e2e green) → LINT-20 version mismatch (⟲m-1), and theme assertion moved to source-config read (⟲m-2).

---

## PYTEST SEAM TESTS — `tests/pytest/` (out-of-band, no webm; closes C-1)

Run against the cloned + built plugin tree. Uses the testkit Python layer (`tests/_testkit/src/a0_plugin_testkit/`: `fakes.py`, `real/`). No HTTP, no `dump_live`, no agent turn.

**PYT-14 — System-prompt nudge appends `MERMAID_BEHAVIORAL_NUDGE` (BEH-11; closes C-1 for G9 nudge).**
- Import `MermaidNudge` from the installed `extensions/python/system_prompt/_15_mermaid_nudge.py`; construct with a **fake non-None agent** (`fakes.py`); `await execute(system_prompt=[], loop_data=LoopData())`.
- *ASSERT (hard):* list length increased by 1; appended string starts with `## Visual explanations` and contains cue tokens `"show me"`, `visualize`, `draw`, `diagram`, the type-selection guidance (`flowcharts for processes`, `sequence diagrams for interactions`), the "Do not overuse" and "Load the mermaid skill" lines; equals `MERMAID_BEHAVIORAL_NUDGE` exactly.

**PYT-14b — Nudge guard: falsy agent → no-op (BEH-11 guard).**
- Construct `MermaidNudge` with `self.agent` falsy; `await execute(system_prompt=[], …)`.
- *ASSERT (hard):* `system_prompt` unchanged (len 0).

**PYT-15 — Skill availability: file + triggers (BEH-10; closes C-1 for G9 skill).**
- Read built `skills/mermaid/SKILL.md`; parse YAML front-matter.
- *ASSERT (hard):* file exists; `name === 'mermaid'`; `triggers` is exactly `[mermaid, diagram, flowchart, visualize, draw, "show me", "sequence diagram"]`; body contains the diagram-type selection table (≥10 type rows incl. Flowchart/Sequence/Class/State/ER/Gantt/Pie/Mindmap/Timeline/Git Graph) and the ` ```mermaid ` output-format instruction.

**PYT-18 — Scope-negatives: no backend/API/hooks/tools/fork seams (§5; closes C-1, replaces old E2E-18).**
- Walk the built plugin tree.
- *ASSERT (hard):* no `api/` dir/handlers; no `hooks.py`; no `tools/`; no `extensions/python/**/_functions*` (no `@extensible` fork hooks); `__init__.py` is docstring-only; the only `system_prompt` extension is `_15_mermaid_nudge.py`. Confirms "depends only on upstream seams, no fork dependency."

**PYT-15b — End-to-end agent turn (BEH-10/11 through the model).** `console.log('::warning::SKIP PYT-15b — https://github.com/agent-zero-plugins/agent-zero-plugin-mermaid-diagrams/issues/NN — requires a real LLM turn (Rule 6); asserted deterministically via PYT-14/PYT-15')`. Tracked, not faked.

`[coverage] PYTEST: 4 asserted, 1 skip(tracked)`

---

## STATIC / LINT CONTRACTS — `tests/contracts/` (fail-on-fix; closes m-1, m-2)

These **fail** when the defect is fixed (the inverse of fake-green); they document current reality without institutionalising it as e2e green.

**LINT-20 — Manifest version consistency (I-1; closes m-1).**
- *ASSERT (hard, fail-on-mismatch):* `plugin.yaml.version === meta.yaml.version`. Currently `0.1.1` vs `0.1.0` → this **FAILS today**, surfaced as the tracked, fixable signal (issue NN). When aligned, it goes green. (Replaces the old E2E-20 "assert they differ," which inverted green.)

**LINT-16b — Theme config is hard-coded dark (I-2; closes m-2).**
- *ASSERT (hard, source read — not SVG color scraping):* the renderer's `mermaid.initialize` config sets the dark Catppuccin palette (`theme:'base'` with `background #1e1e2e` / `primaryColor #89b4fa` in the source), and there is **no** light-mode branch despite the README's "Light/Dark mode" claim. Tracked to I-2; coupled to source, not mermaid@11 output internals.

`[coverage] CONTRACTS: 2 asserted (1 fail-on-fix documenting I-1, 1 documenting I-2)`

---

## GROUP G1 — Injection gate (Tier-A, CDN-independent) · `behaviour-injection.mjs` · 1 webm

Plugin is already installed+enabled by the install-once lifecycle (no manual toggle; C-4). Auth via credentialed session.

**E2E-1 — `<x-component>` sidebar-end injection present (UI-1, BEH-1; THE gate).**
- *Steps:* `await page.waitForFunction(() => !!document.querySelector('x-component[path*="mermaid_diagrams"][path*="mermaid-renderer"]'), {timeout:20000})`.
- *ASSERT (hard):* locator `x-component[path*="mermaid_diagrams"][path*="mermaid-renderer"]` `toBeAttached()`; `path` attr contains `extensions/webui/sidebar-end/mermaid-renderer.html`; `closest('x-extension')?.id === 'sidebar-end'`. No try/catch.

**E2E-1b — Backend lists the extension when enabled (S-2).**
- *ASSERT (hard):* `callJsonApi('/api/load_webui_extensions',{extension_point:'sidebar-end',filters:['*.html']})` returns a path matching `/mermaid_diagrams/.*mermaid-renderer\.html`. Confirms the gate's backend dependency without the CDN.

`[coverage] G1: 2 asserted, 0 skipped`

> **Note (closes C-4 / old E2E-2):** the *disabled→no injection* negative is **not** an in-page toggle. It moves to the **`verify-uninstalled` lifecycle hook** (`tests/e2e/hooks/verify-uninstalled`): after the lifecycle's uninstall step, assert `document.querySelectorAll('x-component[path*="mermaid_diagrams"]').length === 0` **and** `/api/load_webui_extensions {extension_point:"sidebar-end"}` returns no `mermaid_diagrams` path. This avoids toggling the plugin off mid-suite (which would break every later Tier-B group on the shared boot).

---

## GROUP G2 — Readiness probe + no-config negative (Tier-A) · `behaviour-readiness-noconfig.mjs` · 1 webm

> **Closes M-5 / G-C:** project-fixture lifecycle dropped (not a precondition for any negative here). Adds the concrete render-readiness probe the whole Tier-B presupposed.

**E2E-22 — Render pipeline readiness is itself falsifiable (closes G-C).**
- *Pre:* mermaid route installed before `goto` (vendored ESM).
- *ASSERT (hard):* the plugin's injected `<style>` rule for `.mermaid-zoom-overlay` is present in `document.styleSheets` (proves the inline module executed and styles injected), **and** a minimal injected fence yields a `.mermaid-diagram-container` (proves the observer attached). If neither signal appears → `console.log('::warning::SKIP G3–G8,G2-render — issue NN — mermaid route not installable pre-navigation in this env')` and skip the render tier honestly. (mermaid ESM sets no global by default, so we never assert a phantom global.)

**E2E-17 — No config panel for this plugin (UI / §4; closes M-5).**
- *ASSERT (hard):* the served file list for `mermaid_diagrams` contains **no** `webui/config.html` / `config.js` / schema (confirmed: `webui/` is `.gitkeep` + `thumbnail.png`); manifest `per_project_config:false` & `per_agent_config:false`. Pure file-listing + manifest read — no project needed.

`[coverage] G2: 2 asserted, 0 skipped`

---

## GROUP G3 — Auto-render of a valid mermaid block (Tier-B) · `behaviour-render-valid.mjs` · 1 webm

Pre (all of G3–G8): mermaid route installed before `goto`; readiness verified per E2E-22. If unavailable → group emits `::warning::SKIP` (issue NN) and returns, never faked.

**Real-pipeline fixture (M-3, primary):** feed a real fence through A0's renderer:
```js
await page.evaluate(async () => {
  const { marked } = await import('/webui/js/marked.esm.js');
  const { sanitizeHtml } = await import('/webui/js/safe-markdown.js');
  const md = '```mermaid\ngraph TD; A[Start] --> B[End];\n```';
  const host = document.querySelector('#test-msg-host');
  host.innerHTML = sanitizeHtml(marked.parse(md));
  window.adjustMarkdownRender?.(host); // same call messages.js makes
});
```
**Hand-injected variant (cheap coverage, correct nesting per M-2):**
```
<div class="markdown-block-wrap">
  <div class="code-block-wrapper"><pre><code class="language-mermaid">graph TD; A[Start] --> B[End];</code></pre></div>
  <div class="step-action-buttons">…core copy…</div>
</div>
```

**E2E-3 — Outermost wrapper replaced by `.mermaid-diagram-container` (BEH-1, UI-2).**
- *ASSERT (hard):* `.mermaid-diagram-container` appears; original `.markdown-block-wrap` (probe id) is gone; container is not nested inside any residual `.markdown-block-wrap`/`.code-block-wrapper`.

**E2E-3-real — Live-pipeline contract (closes M-3).**
- *ASSERT (hard):* using the real `marked.parse`+`sanitizeHtml` fixture above, `code.language-mermaid` survives sanitisation (class allowed) AND the observer renders a `.mermaid-diagram-container .mermaid-rendered svg`. Proves the contract with A0's actual pipeline (not just the observer in isolation).

**E2E-4 — Rendered SVG present & sized (BEH-1, UI-3).**
- *ASSERT (hard):* `.mermaid-diagram-container .mermaid-rendered svg` `toBeVisible()`; computed `cursor` of `.mermaid-rendered === 'zoom-in'`; SVG `max-width` ≤ 100% of container.

**E2E-3b — Idempotency: re-fired mutations don't double-process (BEH-1, stamp).**
- *Steps:* after render, append an unrelated body node to re-fire the observer; wait 300 ms (>debounce).
- *ASSERT (hard):* exactly **one** `.mermaid-diagram-container` for the probe; any surviving source `code` carries `data-mermaid-processed="true"`; container count stable.

**E2E-3c — Pre-existing-DOM sweep (BEH-1, `processMermaidBlocks()` at load).**
- *Steps:* inject fixture before a reload that re-mounts the extension (route re-installed pre-`goto`); reload.
- *ASSERT (hard):* block rendered with no new mutation (load-time sweep consumed it) — container present after `domcontentloaded` + module init.

`[coverage] G3: 5 asserted, 0 skipped (or 0 asserted + SKIP if route unavailable)`

---

## GROUP G4 — Hover toolbar: toggle-source & copy (Tier-B) · `behaviour-toolbar.mjs` · 1 webm

**E2E-5 — Action toolbar attached; opacity gated by hover (UI-4).**
- *ASSERT (hard):* `.mermaid-actions` `toBeAttached()`; computed `opacity === '0'` initially; after `container.hover()`, `opacity === '1'`; contains `.mermaid-zoom-open`, `.mermaid-toggle-source`, `.mermaid-copy-source`.

**E2E-5a — Toggle source visibility + icon flip (BEH-8, UI-6, UI-8).**
- *Steps:* click `.mermaid-toggle-source`.
- *ASSERT (hard):* `.mermaid-source` computed `display === 'block'`; icon span text `=== 'code_off'`; click again → `display === 'none'`, icon `=== 'code'`. `.mermaid-source pre > code` `textContent` decodes to the raw source `graph TD; A[Start] --> B[End];`; `innerHTML` shows `&lt;`/`&gt;` escapes where present.

**E2E-5b — Copy source: raw text to clipboard, icon→check for 2000 ms (BEH-9, UI-7, EC-4).**
- *Setup:* **before** the click, install a spy on `navigator.clipboard.writeText` and `document.execCommand` (renderer caches no references, so wrapping pre-click is sound — m-4). Grant `clipboard-read`/`write` if the browser allows.
- *ASSERT (hard, primary):* icon flips to `check`; after 2000 ms (poll up to ~2.3 s) flips back to `content_copy`.
- *ASSERT (hard, contents):* if `clipboard-read` granted → `navigator.clipboard.readText()` equals the **raw, un-escaped** source (no `&lt;`). Else (only Rule-6 try/catch path here) → hard-assert exactly one of `writeText`/`execCommand` was called with the raw source.
- **E2E-5b-fallback (closes m-4):** force the fallback by stubbing `navigator.clipboard.writeText` to **reject**; click; *ASSERT (hard)* the `document.execCommand('copy')` branch ran (EC-4 actually exercised, not merely reachable).

`[coverage] G4: 4 asserted, 0 skipped`

---

## GROUP G5 — Zoom viewer: open & SVG sizing (Tier-B) · `behaviour-zoom-open.mjs` · 1 webm

**E2E-6 — Open overlay via diagram click AND via zoom button (BEH-3, UI-5, UI-10).**
- *Sub-cases (sequential statements, each hard-asserted):* (a) click `.mermaid-rendered` → overlay; close. (b) click `.mermaid-zoom-open` → overlay.
- *ASSERT (hard):* `.mermaid-zoom-overlay` appended to `document.body`; computed `position==='fixed'`, `z-index==='10000'`; gains `.active` within a frame; contains a **fresh copy** SVG (`.mermaid-zoom-content svg` attached, distinct node from in-message SVG); on open the `%` label reads `100%` and content transform is `translate(0px, 0px) scale(1)`.

**E2E-6b — Singleton overlay: opening again removes prior (state §6, `:44`).**
- *ASSERT (hard):* exactly **one** `.mermaid-zoom-overlay` after a second open without closing.

**E2E-6c — Explicit pixel sizing from viewBox (BEH-3, `:90–98`; pinned to the `graph TD` fixture per m-5).**
- *ASSERT (hard):* overlay SVG `width`/`height` **attributes removed**; inline style `width`/`height` are pixel values equal to `viewBox[2]`/`viewBox[3]` (read viewBox, compute, compare); `style.maxWidth === 'none'`. Dependency on the `graph TD` fixture (which emits a 4-tuple viewBox) is stated explicitly; viewBox-less fallback covered in E2E-13d.

`[coverage] G5: 3 asserted, 0 skipped`

---

## GROUP G6 — Zoom math: wheel, buttons, clamp, reset (Tier-B) · `behaviour-zoom-math.mjs` · 1 webm

**E2E-7 — Wheel zoom toward pointer + buttons + clamp (BEH-4, UI-11, UI-12).**
- *Steps:* open overlay; dispatch `wheel` `deltaY<0` once over the viewport at known clientX/Y.
- *ASSERT (hard):* parsed `scale ≈ 1.15`; label `≈ '115%'`; pan offset moved toward pointer (panX/panY non-zero). `deltaY>0` once → `÷1.15`.
- *preventDefault (closes m-3):* before the wheel, force document scrollability (append a tall spacer) **or** spy a `wheel` listener and assert `event.defaultPrevented === true`; do **not** rely on `window.scrollY` in a fixed modal (vacuous).
- *Buttons:* `[data-action="zoom-in"]` → `scale ×1.3` (label `130%` from reset); `[data-action="zoom-out"]` → `÷1.3`.
- *Clamp:* spam zoom-out → floored at **0.1** (label `10%`), never below; spam zoom-in → capped at **10** (label `1000%`), never above.

**E2E-9 — Reset zoom (BEH-6, UI-11).**
- *Steps:* zoom/pan to a non-default state; click `[data-action="zoom-reset"]`.
- *ASSERT (hard):* transform `=== 'translate(0px, 0px) scale(1)'`; label `=== '100%'`.

`[coverage] G6: 2 asserted, 0 skipped`

---

## GROUP G7 — Pan + close behaviours (Tier-B) · `behaviour-pan-close.mjs` · 1 webm

**E2E-8 — Pan with left-button drag; cursor states; window-bound drag (BEH-5, UI-12; `:134`).**
- *Steps:* open overlay; on `.mermaid-zoom-viewport` dispatch `mousedown {button:0}` at (x0,y0) → `mousemove` on **window** to (x0+Δx, y0+Δy) → `mouseup`.
- *ASSERT (hard):* during drag viewport computed `cursor === 'grabbing'`; transform panX/panY equal Δx/Δy (within rounding); after `mouseup`, `cursor === 'grab'`; pan still tracks when mousemove is outside the viewport (dispatched on window). Right-button (`button:2`) mousedown → **no** panning (transform unchanged).

**E2E-10 — Close via 3 triggers (BEH-7, UI-10/11; `:174,180–182`).**
- *Sub-cases, each from a freshly opened overlay, all hard-asserted:*
  - (a) click `.mermaid-zoom-close` (same element as `[data-action="close"]` — m-6) → overlay removed; no `.mermaid-zoom-overlay`.
  - (b) press `Escape` → overlay removed.
  - (c) click overlay background (`e.target===overlay`) → removed; clicking **on** `.mermaid-zoom-content` does **not** close (overlay persists).
- *ASSERT (hard) Escape-listener self-removal:* after Escape-close, open a new overlay and verify no stale Escape handler double-fires (a no-op survives; one close works) — bounded, deterministic.

`[coverage] G7: 2 asserted, 0 skipped`

---

## GROUP G8 — Error path, edge cases, wrapper breadth, listener leak (Tier-B) · `behaviour-errors-edges.mjs` · 1 webm

**E2E-12 — Inline syntax-error display (BEH-2, UI-9; closes M-1).**
- *Fixture:* a source that **reliably throws** on the pinned mermaid@11 (e.g. `flowchart\n@@@bad@@@`, validated against the vendored ESM — **not** the lenient `graph TD; A -->`).
- *ASSERT (hard, exact structure per renderer `:270–276`):* original wrapper replaced by `.mermaid-diagram-container`; `container > .mermaid-error` (with `error` icon + text beginning `Mermaid syntax error:`, taken from the thrown `.message`) **and** `container > pre.mermaid-error-source > code` (the `.mermaid-error-source` **is** the `<pre>`, a **sibling** of `.mermaid-error`, not a wrapper) echoing the **escaped** source; `container .mermaid-rendered` count `=== 0`; original `<pre><code>` raw markup gone; any `#d<wrapperId>` orphan node mermaid injected is absent from DOM.

**E2E-11 — Wrapper-replacement breadth removes core copy button (EC-8, UI-2; closes M-2).**
- *Pre:* fixture uses the **correct** nesting — `.step-action-buttons` is a **sibling** of `.code-block-wrapper` inside `.markdown-block-wrap` (per `messages.js:1774–1781`), not nested inside `.code-block-wrapper`.
- *ASSERT (hard):* after render, that block's `.step-action-buttons` is **gone** (replaced with the outer wrapper); the plugin's own `.mermaid-copy-source` is present instead. Now proves the real EC-8 trade-off, not removal of a misplaced node.

**E2E-13a — Empty fence left stamped, not replaced (EC-2).**
- *Fixture:* `code.language-mermaid` whitespace-only.
- *ASSERT (hard):* no `.mermaid-diagram-container` for it; `code` carries `data-mermaid-processed="true"`; raw block persists.

**E2E-13b — Streaming/partial render via real message-body re-render (EC-1, latent L-2; closes G-E).**
- *Steps (faithful streaming, NOT a detached-node mutation):* set the message host `innerHTML` to a growing body the way A0's `smoothRender` does — first a partial fence (new `code` node), let it render, then **replace** the host `innerHTML` with the fuller fence (a **new** `code` node), and fire the observer.
- *ASSERT (hard):* the originally-rendered container reflects the **first-sight** content; the renderer stamps the first `code`, replaces its wrapper, and does **not** re-render the same logical block when the message body is rewritten with a new node carrying fuller content (encodes the documented L-2 latent defect as a falsifiable fact, exercised through the real re-render shape rather than a detached node).

**E2E-13c — Window mousemove/mouseup listener leak masked by singleton (EC-3, latent L-3; closes G-B — newly added, was a dangling map).**
- *Steps:* open and close the overlay N times (e.g. 5), then open once more and perform a drag.
- *ASSERT (hard):* a single drag after N open/close cycles still pans **correctly and once** (no multiplied pan from leaked `:144–156` window listeners) — proving the shared-singleton guard masks the never-removed listeners; bounded, deterministic. Encodes L-3 exactly as the spec claims.

**E2E-13d — viewBox-less SVG modal fallback to auto/auto (EC-7, latent L-4; `:90–98`).**
- *Steps:* open overlay for an SVG lacking a valid 4-tuple viewBox (stub the SVG node to drop viewBox before open).
- *ASSERT (hard):* overlay SVG inline style `width === 'auto'` and `height === 'auto'` (fallback branch taken); documents the collapse-risk without asserting visual size.

`[coverage] G8: 6 asserted, 0 skipped`

---

## GROUP G9 — Persistence & security (Tier-A/B mixed) · `behaviour-persistence-security.mjs` · 1 webm

> Python-seam group is gone (moved to PYTEST). This group keeps the browser-observable negatives/security.

**E2E-19 — No persisted browser state across reload (§6).**
- *Steps:* render a diagram, open the zoom overlay, reload.
- *ASSERT (hard):* `localStorage`/`sessionStorage` contain **no** `mermaid*` keys; no plugin cookie; after reload the overlay is gone and the diagram re-renders **only** from re-injected message DOM (nothing persisted).

**E2E-16 — `securityLevel:'loose'` honours inline HTML/click in diagram source (EC-5 / SEC-1).**
- *Steps:* render a diagram whose label embeds a click/HTML directive mermaid-loose honours; use a benign observable marker (a DOM data-attribute set by an inline handler), NOT real script against the harness.
- *ASSERT (hard):* the rendered SVG contains the honoured directive output (click-bound element / unescaped HTML node), proving loose security is active on model-authored content. The verifiable security finding (SEC-1, issue NN); if the plugin later moves to `'strict'`/`'antiscript'`, this scenario flips and must be updated. No silent pass.

`[coverage] G9: 2 asserted, 0 skipped`

---

## GROUP G11 — CDN-blocked graceful degradation (Tier-A; closes G-A) · `behaviour-cdn-blocked.mjs` · 1 webm

> The plugin's defining real-world behaviour (EC-6), now asserted as a positive rather than engineered away. EC-6 is **re-mapped here** off the old, wrong E2E-2 (disabled-plugin) mapping.

**E2E-21 — Enabled + CDN blocked → injection present, no render, no user-facing error (EC-6 / G-1).**
- *Pre:* `await page.route('**/cdn.jsdelivr.net/npm/mermaid@11/**', r => r.abort())` installed **before** the first `goto`; plugin enabled (install-once).
- *Steps:* inject a valid ` ```mermaid ` fence through the real pipeline; wait > (debounce + reasonable render budget).
- *ASSERT (hard):* (a) UI-1 injection still attached (the inline module's import rejected, but the `<x-component>` host is independent); (b) **no** `.mermaid-diagram-container` ever appears (poll then assert absent); (c) no user-facing error surfaced — assert no `.mermaid-error` rendered into the message and no toast/visible error element; capture console and assert the import-failure does not bubble as a UI error (it may log; it must not render). Proves the degradation is graceful-but-silent — the exact failure mode the original test missed.

`[coverage] G11: 1 asserted, 0 skipped`

---

### Suite roll-up
- **10 behaviour webm groups:** G1, G2, G3, G4, G5, G6, G7, G8, G9, G11 (within the ≤10 budget; the former G9 Python-seam group and G10 scope/version content moved to **PYTEST**/**CONTRACTS**, which carry no video).
- **Tier-A (always hard, CDN-independent):** G1 (injection gate + verify-uninstalled negative), G2 (readiness probe + no-config), G9 (persistence/security observable parts), G11 (CDN-blocked degradation), plus all PYTEST and CONTRACTS. Never try/catch.
- **Tier-B (hard when mermaid route installs pre-navigation; else group-level tracked `::warning::SKIP` issue NN):** G3–G8. Hermeticity via in-spec `page.route()` over a **vendored** mermaid ESM installed **before `goto`** — explicitly NOT `e2e_pod_env` (that infra does not exist; C-2). Readiness is itself asserted (E2E-22; closes G-C).
- **Python/skill seams:** PYTEST (PYT-14/14b/15/18), not Playwright, not `dump_live` — resolves the C-1 contradiction with the no-API scope-negative.
- **Known defects:** encoded as **fail-on-fix** CONTRACTS (LINT-20 version mismatch; LINT-16b theme via source read), never as e2e scenarios that pass because the defect exists (closes m-1, m-2).
- **Tracked skips (Rule 2):** PYT-15b (real LLM turn); possible group-level skip for G3–G8/G11-render only if the mermaid route cannot be installed pre-navigation — issue-linked, never faked.
- **Rule-6 try/catch (only places):** clipboard-*contents* read in E2E-5b (with pre-installed write/execCommand spy + forced-fallback E2E-5b-fallback) and the skipped real agent turn PYT-15b.
- **Coverage/skip surfacing:** each behaviour function ends with `console.log('[coverage] G#: N asserted, M skip(tracked)')`; skips via `console.log('::warning::SKIP …')` (harness greps `::warning::`); any unhandled throw turns the group RED.

**Key source paths (absolute):** plugin clone `/tmp/fan-mermaid-diagrams`; renderer `/tmp/fan-mermaid-diagrams/usr/plugins/mermaid_diagrams/extensions/webui/sidebar-end/mermaid-renderer.html`; nudge `/tmp/fan-mermaid-diagrams/usr/plugins/mermaid_diagrams/extensions/python/system_prompt/_15_mermaid_nudge.py`; skill `/tmp/fan-mermaid-diagrams/usr/plugins/mermaid_diagrams/skills/mermaid/SKILL.md`; vendored mermaid ESM (to add) `/tmp/fan-mermaid-diagrams/tests/vendor/mermaid@11.esm.js`; behaviour modules `/tmp/fan-mermaid-diagrams/tests/e2e/behaviour-*.mjs`; pytest seams `/tmp/fan-mermaid-diagrams/tests/pytest/`; contracts `/tmp/fan-mermaid-diagrams/tests/contracts/`; verify-uninstalled hook `/tmp/fan-mermaid-diagrams/tests/e2e/hooks/verify-uninstalled`; testkit submodule `/tmp/fan-mermaid-diagrams/tests/_testkit` (Python layer `tests/_testkit/src/a0_plugin_testkit/{fakes.py,real/}`). Live A0 seams (read-only): `/a0/webui/js/extensions.js`, `/a0/webui/components/sidebar/left-sidebar.html` (`x-extension#sidebar-end` @ line 35), `/a0/webui/js/messages.js` (`adjustMarkdownRender` @ 711–732, `.step-action-buttons` append @ 1774–1781), `/a0/webui/js/safe-markdown.js` (`sanitizeHtml` @ 29), `/a0/api/load_webui_extensions.py`, `/a0/extensions/python/system_prompt/`, `/a0/webui/components/projects/project-create.html`, `/a0/webui/components/projects/project-edit-basic-data.html`, `/a0/webui/js/initFw.js` (`$confirmClick`).