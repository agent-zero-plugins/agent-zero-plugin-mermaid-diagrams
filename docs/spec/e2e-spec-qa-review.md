# QA Review — E2E Test Spec for `agent-zero-plugin-mermaid-diagrams`

**Reviewer:** Senior QA / E2E expert. **Method:** read-only clone (`/tmp/fan-mermaid-diagrams`) + testkit clone (`/tmp/testkit`) + live A0 at `/a0`, cross-checked every selector, seam, and harness assumption against actual code. **Verdict at end.**

The spec is unusually thorough on *behaviour* coverage and the hard-rules narrative is well-internalised. However, it is written against a **harness model that does not match the real testkit contract**, and it leans on two pieces of infrastructure (`dump_live`, same-origin CDN aliasing) that **do not exist** in the testkit and cannot exist for this plugin without contradicting the spec's own scope-negatives. Several DOM/selector assertions are wrong against the actual renderer source. Details below.

---

## CRITICAL

### C-1. `dump_live` does not exist — and cannot exist for this plugin without violating E2E-18.
The entire Tier-A Python-seam strategy (G9: E2E-14/14b/15; G10: E2E-18) is built on a "pure-helper `dump_live` endpoint added for e2e via `e2e_pod_env`." Verified facts:
- The testkit provides **no `dump_live`** anywhere (`grep -rn dump_live /tmp/testkit` → empty).
- `e2e_pod_env` (SPEC DEC-057, `e2e/harness/a0-up.sh`) only forwards **`-e KEY=VAL` env vars** into the nested A0 pod. It does **not** register API routes, mount probes, or alias network requests.
- A `dump_live` *endpoint* would have to be an A0 API handler shipped by the plugin under `api/` (or injected into core). But **the plugin ships no `api/`**, and the spec's own **E2E-18 hard-asserts there is no `api/` and no `hooks.py`**. So G9 and E2E-18 are mutually contradictory: you cannot both ship a `dump_live` API handler and assert the plugin has no API surface.
- **Fix:** Drop the `dump_live` framing entirely. The nudge (BEH-11) and skill front-matter (BEH-10) are **pure files / a pure Python class** — verify them with a **pytest** unit test using the testkit's Python layer (`/tmp/testkit/src/a0_plugin_testkit/`, which has `fakes.py` and `real/` helpers), instantiating `MermaidNudge` with a fake agent and asserting `system_prompt.append`. The skill triggers are a YAML front-matter read. Neither needs a live endpoint, an env seam, or Playwright. This also removes G9 from the webm budget. If you insist on an in-pod check, it must be a *file-listing assertion over the installed plugin tree* (which the harness can already reach via `kubectl exec`/container exec in `verify-installed`), not an HTTP probe.

### C-2. Same-origin CDN aliasing (`e2e_pod_env` "request-route/alias for cdn.jsdelivr.net → local file") does not exist.
The Tier-B hermeticity plan ("mermaid@11 ESM is vendored... served from a same-origin path via the testkit's `e2e_pod_env`") is the load-bearing assumption that turns G3–G8 from best-effort into hard-assert. Verified: `e2e_pod_env` forwards env vars only; there is **no request-interception, no route alias, no static-file server for `cdn.jsdelivr.net`** in the testkit. The renderer's import is a hard-coded absolute URL (`mermaid-renderer.html:7`) — env vars cannot redirect it. Playwright `page.route()` *could* fulfil `https://cdn.jsdelivr.net/...` from a local file, but (a) that is a **per-spec Playwright capability inside the behaviour module**, not an `e2e_pod_env` feature, and (b) the import happens inside the A0-served page module at page load, so the route must be installed on `loggedInPage` **before navigation** — which the current harness invokes *after* login/navigation. **Fix:** Either (i) implement the alias as `await page.route('**/cdn.jsdelivr.net/npm/mermaid@11/**', r => r.fulfill({ path: vendoredEsm, contentType: 'text/javascript' }))` set up *before* the first `goto`, vendoring the ESM into the repo, and stop attributing it to `e2e_pod_env`; or (ii) honestly classify G3–G8 as best-effort/CDN-dependent exactly as the **existing `behaviour.mjs` already does** (try/catch, no gate). Do not claim hard-assert backed by infrastructure that isn't there.

### C-3. The spec's group/scenario/`@skip`/`[coverage]` model is not expressible in the harness.
The spec describes "≤10 grouped `.feature`-style **spec** modules," each with multiple sub-scenarios (E2E-3/3b/3c…), `@skip(reason=…)` tags, and a `[coverage] G#: N asserted, M skipped` tally. The real contract (`/tmp/testkit/e2e/lifecycle/lifecycle.spec.ts`): each behaviour group is a **plain async function** `export default async function ({ page, expect, baseURL })`, discovered via `BEHAVIOUR_SPECS` JSON `[{name,path}]`, and wrapped by the testkit in **one** `test(\`behaviour: ${name}\`)` = one video. Consequences:
- There is **no Playwright `test()`/`test.skip()` inside a behaviour module** → `@skip` annotations and per-scenario tallies have nowhere to live. A "skip" is just code you don't run; it cannot surface as a tracked Playwright skip.
- "Sub-cases each from a freshly opened overlay, all hard-asserted" (E2E-10, E2E-6) run as sequential statements in one function; a throw aborts the rest of the group (acceptable, but it's not N independent scenarios).
- **Fix:** Re-cast each group as one `behaviour-*.mjs` default-export function. Implement the `[coverage]` tally and tracked-skip as **explicit `console.log('[coverage] …')` and `console.log('::warning::SKIP …')`** lines (the harness already greps `::warning::` per `lifecycle.spec.ts:44`). State plainly that "group RED" = the function throws. This is a presentation rewrite, not a coverage loss — but as written the spec is not implementable.

### C-4. Provisioning via "standard plugin UI toggle / Settings → Plugins → enable" contradicts the harness install model.
G1 and G2 say to install+enable through "the standard plugin UI toggle (open Settings → Plugins, locate the row, enable)." The real harness (`PluginsPage.installFromZip`, `lifecycle.spec.ts`) **installs the plugin from the built ZIP and reloads once, before any behaviour group runs** — the plugin is already installed+enabled when your function receives `page`. There is no per-group "open Settings, find the row, toggle on." Worse, E2E-2 ("disable plugin via UI toggle, clear cache, reload … re-enable in afterAll") assumes a disable affordance and a cache-clear UI step that the harness neither performs nor exposes to a behaviour function; toggling the plugin off mid-suite would also break every later Tier-B group that depends on it being on, given there's one shared boot. **Fix:** Drop the manual enable steps. For E2E-2 (disabled→no injection), do it as a **separate `verify-uninstalled` hook** assertion (the lifecycle already runs uninstall→verify-uninstalled; `/tmp/testkit/examples/sample-plugin/tests/e2e/hooks/verify-uninstalled` is the seam), or as a dedicated negative case in the install/uninstall lifecycle — not as an in-page toggle in a behaviour group.

---

## MAJOR

### M-1. E2E-12 asserts a DOM shape the error path does not produce.
Spec: "`.mermaid-diagram-container` containing `.mermaid-error` … and `.mermaid-error-source > code`." Actual renderer (`mermaid-renderer.html:270–276`): on error the container's `innerHTML` is a `.mermaid-error` div **followed by** `<pre class="mermaid-error-source"><code>…`. So `.mermaid-error-source` **is the `<pre>` itself**, and the structure is `.mermaid-diagram-container > pre.mermaid-error-source > code` — the `.mermaid-error-source` is a **sibling** of `.mermaid-error`, not a wrapper, and the selector `.mermaid-error-source > code` is correct only because `.mermaid-error-source` *is* the pre. The spec's prose "red error banner + `.mermaid-error-source` `<pre>`" is right but E2E-12's earlier phrasing in the behaviour map (UI-9 "`.mermaid-error` + `.mermaid-error-source`") and the assertion that the error text "begins `Mermaid syntax error:`" must account for the message being `mermaid.render()`'s thrown `.message`, which for `graph TD; A -->` may not throw at all (mermaid is lenient). **Fix:** Use a source that *reliably* throws on mermaid@11 (e.g. `graph TD;\nA --` is often tolerated; prefer an explicitly invalid directive like `flowchart\n@@@bad@@@` validated against the pinned mermaid version). Assert exact structure: `container > .mermaid-error` AND `container > pre.mermaid-error-source > code`, and `container .mermaid-rendered` count === 0.

### M-2. G3/E2E-11 fixture mis-places `.step-action-buttons`, so the test cannot prove what it claims.
Spec fixture nests `.step-action-buttons` **inside** `.code-block-wrapper`. Real `adjustMarkdownRender` (`/a0/webui/js/messages.js:1774–1781`) appends `.step-action-buttons` to the **outer** `.markdown-block-wrap` (sibling of `.code-block-wrapper`), i.e. `markdown-block-wrap > [code-block-wrapper, step-action-buttons]`. Since the renderer replaces the outermost `.markdown-block-wrap` (`renderer:201, 283`), the core copy button *is* removed regardless — but E2E-11's assertion ("the `.step-action-buttons` that belonged to that block is gone") is only meaningful if the fixture reproduces the **real** nesting. With the fixture as written, you'd be proving removal of a misplaced node, not the real EC-8 trade-off. **Fix:** Correct the fixture to `<div class="markdown-block-wrap"><div class="code-block-wrapper"><pre><code class="language-mermaid">…</code></pre></div><div class="step-action-buttons">…</div></div>`.

### M-3. Fixtures injected via `page.evaluate` bypass the real `marked → sanitizeHtml` pipeline — a coverage gap the spec calls "UI-shaped."
The spec defends direct DOM injection as "a UI-shaped fixture, not a backend call." But the **real** render path is `marked.parse` → `sanitizeHtml` (DOMPurify, `/a0/webui/js/safe-markdown.js:29` — note `FORBID_TAGS` includes `svg`) → `innerHTML` → `adjustMarkdownRender` (`messages.js:711–732`). Two real-world risks your injected fixture will never catch: (a) whether `marked`'s emitted `class="language-mermaid"` (`marked.esm.js:1444`) actually survives to the observer (it does — class is allowed — but you're asserting it without exercising it); (b) the renderer's injected `<svg>` lives in a `container` it builds itself and is **never** passed through `sanitizeHtml`, so it survives — but if A0 ever re-sanitises message bodies, the plugin breaks, and a hand-injected fixture would hide that. **Fix:** Add at least **one** end-to-end fixture that feeds a real ` ```mermaid ` fence through A0's actual markdown renderer (call the same `marked.parse`+`sanitizeHtml` the page uses, or render a real message), so the contract with the live pipeline is tested, not just the plugin's observer in isolation. Keep the hand-injected fixtures for the cheap variants.

### M-4. Project-fixture selector `input.projects-form-input` is ambiguous (matches 4 inputs).
E2E-2a types the title into `input.projects-form-input`. On the create screen that class matches **four** inputs: the disabled `name` (`project-edit-basic-data.html:22`), the `title` (line 35), `git_url` (`project-create.html:22`), and conditionally `git_token` (line 32). A bare `input.projects-form-input` resolves to the first match (the disabled name field) → fill fails or types nothing. **Fix:** Target the title precisely, e.g. `input.projects-form-input[x-model="$store.projects.selectedProject.title"]` or scope within the basic-data component and exclude `.projects-disabled`. Also note the create button label is `Create and continue` only when `git_url` is empty (`project-create.html:50`) — assert the empty-git path explicitly so the button text matches.

### M-5. Whole project-fixture lifecycle (G2) is provisioning the suite doesn't need.
E2E-2a/2b create+delete a real A0 project "used by E2E-17 (`_hasProject` path)." But E2E-17 only needs to prove the plugin **has no config panel** — and per `plugin.yaml` (`per_project_config:false`, `per_agent_config:false`) and the absence of `webui/config.html` (confirmed: `webui/` holds only `.gitkeep` + `thumbnail.png`), the config-open path is *never engaged regardless of whether a project exists*. The project is not a precondition for proving the negative. Building and tearing down a real project (with its own flakiness surface) to assert a static absence is over-provisioning. **Fix:** Reduce E2E-17 to a file-listing assertion (no `config.html`/`config.js` served for `mermaid_diagrams`) plus a manifest read; drop the project lifecycle unless a *different* scenario genuinely needs an active project (none here does).

---

## MINOR

### m-1. Version-inconsistency assertion (E2E-20) encodes a *defect* as a passing test.
E2E-20 hard-asserts `plugin.yaml === "0.1.1"` while `meta.yaml === "0.1.0"` and asserts they **differ**. Confirmed both values. But making "the versions disagree" a green test institutionalises the bug (I-1) and will go RED the moment someone *fixes* it — inverting the meaning of green. **Fix:** This belongs in a static lint / manifest-contract check that **fails** on mismatch (the gate repo's `plugin-manifest-contract` already cares about this), not an e2e scenario that passes *because* they differ. At most, log it as a `::warning::`.

### m-2. E2E-16b (theme assertion) is brittle against mermaid internals.
Asserting the rendered SVG contains literal `#1e1e2e`/`#89b4fa` couples the test to mermaid@11's internal color emission, which varies by diagram type and version (mermaid often emits CSS classes / computed styles, not raw hex on nodes). **Fix:** Assert the plugin's `initialize` config is dark (read it from the module/source) rather than scraping output colors; or assert a coarse signal (dark background on a known element) tolerant to mermaid versioning.

### m-3. E2E-7 "page did not scroll" check needs a scrollable page.
Asserting `window.scrollY` unchanged after wheel-over-viewport only proves `preventDefault` if the page is actually scrollable at that moment. In the modal (fixed, `inset:0`) the document often isn't scrollable, so the assertion passes vacuously. **Fix:** Force document scrollability (tall spacer) before the wheel, or assert via a `wheel` listener spy that `defaultPrevented === true`.

### m-4. E2E-5b clipboard contents — order of spy installation.
The fallback path spies on `navigator.clipboard.writeText` / `document.execCommand`. These must be wrapped **before** the click and the renderer caches no references, so it's fine — but note the handler calls `writeText` first and only hits `execCommand` in the `catch`. In a context where `writeText` *succeeds*, `execCommand` is never called; asserting "exactly one of them" is correct, but the test should also force the fallback (revoke clipboard permission / stub `writeText` to reject) to actually exercise EC-4, otherwise EC-4 is never really covered. **Fix:** Add a sub-case that makes `writeText` reject and asserts the `execCommand` path ran.

### m-5. E2E-6c viewBox sizing assertion will fail for the chosen fixture's actual SVG.
E2E-6c asserts overlay SVG `width`/`height` attributes are **removed** and inline style equals `vb[2]`/`vb[3]`. Correct per `renderer:90–98` — but mermaid does not always emit a 4-tuple `viewBox` with `vb[2]>0 && vb[3]>0` for every diagram; for the `graph TD` fixture it does, so pin the assertion to that fixture and don't generalise. Minor, but state the dependency.

### m-6. "no `data-testid`" is restated but one selector relies on `data-action`.
Fine (those are real attributes on the zoom buttons, `renderer:55–66`), just note `.mermaid-zoom-close` also carries `data-action="close"` so E2E-10(a)'s `.mermaid-zoom-close` and `[data-action="close"]` are the same element — no contradiction, but avoid implying two distinct affordances.

---

## GAPS (missing coverage)

### G-A. No coverage of the real CDN-failure UX path (EC-6 as a *positive* assertion).
EC-6 is mapped to E2E-2 (disabled→no injection), which is a *different* condition. The actual EC-6 (plugin enabled, CDN blocked → L1 silently inert, no error shown, L2/L3 still work) is the **single most important real-world behaviour** of this plugin (it's why the original test failed). The spec aliases the CDN away to avoid it, but never asserts the documented silent-inert behaviour. **Add:** a group that, with the CDN **blocked** (`page.route(... cdn.jsdelivr.net ...).abort()`), asserts (a) UI-1 still injected, (b) no `.mermaid-diagram-container` ever appears, (c) no console error surfaced to the user — i.e. prove the degradation is graceful-but-silent (G-1).

### G-B. EC-3 (listener leak) is mapped to E2E-13c but no E2E-13c exists.
The coverage map says `EC-3→E2E-13c`, but G8 lists E2E-13a/13b/13d — **no 13c**. The window `mousemove`/`mouseup` listener leak (`renderer:144–156`, never removed) is unasserted. **Add** E2E-13c, or remove the dangling mapping. A bounded falsifiable check: open/close the overlay N times, then assert a single drag still pans correctly (proving the shared-singleton guard masks the leak) — encoding L-3 as the spec claims to.

### G-C. No assertion that the observer/style actually attaches (the gate's deeper signal).
The whole Tier-B suite presupposes the inline module executed (observer attached, `<style>` injected). G3 `beforeAll` says "verified once by asserting the module ran (a known mermaid global / first render)" but never specifies a deterministic signal. mermaid's ESM does **not** set a global by default. **Add** a concrete readiness probe (e.g. inject a fixture and wait for `.mermaid-diagram-container`, or check that the plugin's `<style>` rule `.mermaid-zoom-overlay` is present in `document.styleSheets`), so the group's precondition is itself falsifiable rather than assumed.

### G-D. No test that re-enabling/cache-clear actually re-mounts (S-2 `HTML_CACHE_AREA`).
The spec mentions the extensions HTML cache (`extensions.js:22`) repeatedly as a provisioning step but never asserts the cache behaviour. Given the harness installs+reloads once, this is low priority, but the spec's own E2E-2 "clear cache, reload, re-enable" is unimplementable without it (see C-4). Either cover it or stop relying on it.

### G-E. Streaming/partial render (EC-1 / E2E-13b) cannot be reproduced by the chosen fixture method.
E2E-13b mutates `textContent` after first render and expects no re-render. But the renderer stamps `data-mermaid-processed` on the `code` **then replaces the whole wrapper** (`renderer:191, 283`) — after replacement the original `code` no longer exists in the tree, so "mutate its textContent and fire the observer" mutates a detached node. The test as described won't exercise the real streaming path (where A0 re-renders the *message body*, creating a *new* `code` element each token). **Fix:** Reproduce streaming faithfully — replace the message body's innerHTML with growing content (new `code` nodes) the way A0's `smoothRender` does — or downgrade EC-1 to a documented, explicitly-skipped gap rather than a hard assertion that tests a detached node.

---

## VERIFIABILITY / HARD-RULES NOTES (positive + caveats)

- **Good:** Magic numbers are correctly pinned to source (zoom clamp [0.1,10] `renderer:32–33`; wheel ×1.15 `:128`; button ×1.3 `:163–164`; debounce 150 `:297`; copy-feedback 2000 `:265`; z-index 10000 `:441`). Reset transform string `translate(0px, 0px) scale(1)` matches `:102`/`:165`. Singleton-overlay (E2E-6b) matches `:44`. Escape self-removal (E2E-10) matches `:174`. Background-click-closes / content-click-doesn't (E2E-10c) matches `:180–182`. Right-button-no-pan (E2E-8) matches `:134`. These are correct and falsifiable.
- **Caveat (fake-green risk):** E2E-20 (m-1) and E2E-16/16b assert *current defects* as green — per the no-fake-green rule these should fail-on-fix (lint), not pass-on-defect.
- **Caveat (silent-swallow boundary):** The spec correctly limits try/catch to clipboard-read and the skipped LLM turn. But because C-1/C-2 remove the infrastructure that made G3–G9 "hard," the spec as written would, in a real pod, **silently degrade the entire render + seam suite to nothing** — the exact failure mode of the old test it set out to fix. The honesty rule is satisfied *on paper* and violated *in practice* until C-1/C-2 are resolved.
- **LLM-less:** Correctly keeps the real agent turn (E2E-15b) as the only skip. Good — but its substitute (E2E-14/15 via `dump_live`) is unbuildable (C-1); the substitute must become a pytest unit test.

---

## VERDICT

**REJECT — major rework required before implementation.**

The behavioural *intent* and coverage breadth are excellent and the hard-rules reasoning is sincere, but the spec is **not implementable against the real testkit** and contains internal contradictions:

1. It depends on a `dump_live` endpoint and CDN request-aliasing that **do not exist** in the testkit and that `e2e_pod_env` cannot provide (C-1, C-2).
2. The `dump_live` API approach **contradicts the plugin's own no-API scope-negative** it also tests (C-1 vs E2E-18).
3. The group/scenario/`@skip`/coverage-tally model **doesn't map onto** the harness's "one default-export async function per group = one video" contract (C-3).
4. The "enable via Settings toggle / disable mid-suite" provisioning **fights the install-once-from-ZIP lifecycle** (C-4).
5. Multiple concrete **DOM/selector errors** (error-path structure M-1, fixture nesting M-2/M-3, ambiguous project input M-4) would fail or pass-vacuously against real code.
6. The plugin's defining real-world behaviour — **silent CDN-failure degradation (EC-6)** — is engineered around rather than asserted (G-A), and EC-1/EC-3 are mis-mapped or untested (G-B, G-E).

**To reach acceptance:** rebuild Python-seam checks as pytest units (drop `dump_live`); implement Tier-B hermeticity via in-spec `page.route()` (vendored mermaid ESM, installed pre-navigation) **or** honestly mark the render pipeline CDN-dependent/best-effort like the existing `behaviour.mjs`; recast each group as a single default-export `behaviour-*.mjs` with `console.log` coverage/skip lines; fix the error-path and fixture-nesting assertions; precise project-title selector (or drop the project fixture); add a real CDN-blocked degradation group; and convert the version/theme "assert-the-defect" cases to fail-on-fix lints. After those, the coverage map itself is strong and worth keeping.