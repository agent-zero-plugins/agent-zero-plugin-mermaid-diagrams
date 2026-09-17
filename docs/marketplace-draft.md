# Marketplace draft — a0-plugins index submission (DO NOT SUBMIT YET)

Prepared assets for the Plugin Index PR (`agent0ai/a0-plugins`). The PR itself is
a final step coordinated by the parent context, **after** the repo is flipped
public (index CI reads the remote repo's root `plugin.yaml` — unreachable while
private).

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
```

No `screenshots:` list — the field is optional, and rendered diagrams already
live in the README the hub modal shows. Keeps the card to thumbnail +
description.

Validation vs index CI rules:

| Rule                                     | Status               |
| ---------------------------------------- | -------------------- |
| title ≤ 50 chars                         | 16 chars ✓           |
| description ≤ 500 chars                  | ~470 chars ✓         |
| index.yaml ≤ 2000 chars                  | ~0.8k ✓              |
| tags ≤ 5, from TAGS.md                   | 4 ✓                  |
| screenshots                              | omitted (optional) ✓ |
| remote plugin.yaml `name` matches folder | `mermaid_diagrams` ✓ |
| LICENSE at repo root                     | Apache-2.0 ✓         |

## Thumbnail

Copy `webui/thumbnail.png` (256×256 square,
~1.5 KB — under the 20 KB index cap) to `plugins/mermaid_diagrams/thumbnail.png`
in the index PR.

## Pre-flight checklist for the parent context

1. Flip repo public (index CI must read the remote root `plugin.yaml`).
2. Confirm `name:` uniqueness against the generated index.json.
3. Fork a0-plugins → `plugins/mermaid_diagrams/{index.yaml,thumbnail.png}` → PR.
