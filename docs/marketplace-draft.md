# Marketplace draft — a0-plugins index submission (DO NOT SUBMIT YET)

Prepared assets for the Plugin Index PR (`agent0ai/a0-plugins`). The PR itself is
a final step coordinated by the parent context, **after** the repo is flipped
public (screenshot raw URLs 404 while the repo is private).

## Index folder

`plugins/mermaid_diagrams/` — matches `plugin.yaml` `name: mermaid_diagrams`
(`^[a-z0-9_]+$`, no hyphens).

## Draft `index.yaml`

```yaml
title: Mermaid Diagrams
description: >-
  Renders fenced mermaid code blocks in chat as interactive SVG diagrams —
  flowcharts, sequence, state, class, ER and more. Zoom viewer with pan and
  wheel zoom, source toggle, one-click copy, and graceful inline errors for
  invalid syntax. Bundles a Mermaid syntax skill plus a behavioral nudge so
  the agent visualizes architectures, flows, and state machines instead of
  describing them in prose. No configuration, no server-side code.
github: https://github.com/agent-zero-plugins/agent-zero-plugin-mermaid-diagrams
tags:
  - tools
  - development
  - workflow
  - agents
screenshots:
  - https://raw.githubusercontent.com/agent-zero-plugins/agent-zero-plugin-mermaid-diagrams/main/docs/screenshot-flowchart.png
  - https://raw.githubusercontent.com/agent-zero-plugins/agent-zero-plugin-mermaid-diagrams/main/docs/screenshot-sequence.png
  - https://raw.githubusercontent.com/agent-zero-plugins/agent-zero-plugin-mermaid-diagrams/main/docs/screenshot-zoom-modal.png
  - https://raw.githubusercontent.com/agent-zero-plugins/agent-zero-plugin-mermaid-diagrams/main/docs/screenshot-error.png
```

Validation vs index CI rules:

| Rule | Status |
|---|---|
| title ≤ 50 chars | 16 chars ✓ |
| description ≤ 500 chars | ~470 chars ✓ |
| index.yaml ≤ 2000 chars | ~1.2k ✓ |
| tags ≤ 5, from TAGS.md | 4 ✓ |
| screenshots ≤ 5, reachable | 4 — reachable only once repo is public ⚠ |
| remote plugin.yaml `name` matches folder | `mermaid_diagrams` ✓ |
| LICENSE at repo root | Apache-2.0 ✓ |

## Thumbnail

Copy `usr/plugins/mermaid_diagrams/webui/thumbnail.png` (256×256 square,
~1.5 KB — under the 20 KB index cap) to `plugins/mermaid_diagrams/thumbnail.png`
in the index PR.

## Pre-flight checklist for the parent context

1. Flip repo public (enables raw screenshot URLs + free branch protection).
2. Verify screenshot URLs return 200.
3. Confirm `name:` uniqueness against the generated index.json.
4. Fork a0-plugins → `plugins/mermaid_diagrams/{index.yaml,thumbnail.png}` → PR.
