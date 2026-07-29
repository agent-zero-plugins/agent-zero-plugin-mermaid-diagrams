# Contributing

Thanks for improving the Mermaid Diagrams plugin! This repo follows the Agent Zero plugin devkit conventions — the gates below are machine-checked, so running them locally saves you a red CI round-trip.

## Setup

```bash
git clone --recurse-submodules https://github.com/agent-zero-plugins/agent-zero-plugin-mermaid-diagrams
cd agent-zero-plugin-mermaid-diagrams
python -m pip install pytest pytest-asyncio pyyaml
make install-hooks       # pre-commit hook that runs `make verify`
```

## Workflow

1. Branch off `main`.
2. Make your change. Plugin source lives under `usr/plugins/mermaid_diagrams/`.
3. **Behaviour first**: if you add/change user-visible behaviour, update `docs/spec/behaviour-spec.md` (add a `BEH-n`), cover it in `docs/spec/e2e.feature.md` and `tests/e2e/features/`, and implement the step. The traceability gate fails any documented behaviour that is neither tested nor tracked-skipped.
4. Run the gates locally:
   ```bash
   make verify              # static BDD gates (feature-purity, honesty, traceability)
   python -m pytest tests -q  # unit + L1 shape suite
   make e2e                 # full nested-A0 behaviour run (needs podman)
   ```
5. Open a PR against `main`. CI runs `unit` + `plugin-e2e` (including the seam-off red-proof). A red `plugin-e2e` converts the PR to draft.

## Test rules (the short version)

- **Assert end state, not transients** — e.g. the diagram container / error card, never the transient `data-mermaid-processed` marker.
- **No fake green** — every scenario must fail on an A0 without the plugin installed (the red-proof runs your suite plugin-less and demands 0 passes).
- **No swallowed failures** — empty `catch` blocks fail the honesty gate.
- **Feature files stay implementation-free** — selectors and DOM APIs live in `tests/e2e/steps/`, not in `.feature` files.

## Style

- Python: `from __future__ import annotations`, type hints, docstrings, `pathlib.Path`.
- Steps/TS: Playwright auto-waiting (`expect(...).toBeVisible()`), no sleep-and-hope.
- Keep the plugin dependency-free — it deliberately ships no server-side code.

## Releases

Maintainers tag `vX.Y.Z` after bumping `plugin.yaml` + `meta.yaml` versions (they must match). Publishing to the vendor gate requires `plugin-e2e` green on the exact source commit.
