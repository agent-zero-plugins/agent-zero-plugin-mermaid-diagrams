# Mermaid Diagrams Plugin for Agent Zero

Renders `mermaid` code blocks as interactive SVG diagrams directly in the Agent Zero chat UI.

## Overview

This plugin adds three layers of Mermaid diagram support to Agent Zero:

1. **WebUI Renderer** — A `MutationObserver`-based extension that detects ` ```mermaid ` code blocks in chat messages and renders them as interactive SVG diagrams using [Mermaid.js v11](https://mermaid.js.org/). Includes a full-screen zoom/pan viewer.

2. **Agent Skill** — A comprehensive `SKILL.md` covering 10 diagram types with tested syntax examples, a diagram-type selection guide, and best practices. The agent can load this skill to produce correct Mermaid markup.

3. **Behavioral Nudge** — A `system_prompt` extension that encourages the agent to use visual explanations when appropriate (e.g., when the user says "show me", "visualize", "diagram", or when explaining architectures and workflows).

## Features

- **Mermaid.js v11** rendering via CDN (ESM module)
- **Dark theme** with Catppuccin-inspired palette
- **Interactive SVG** with hover action buttons (toggle source, copy source)
- **Zoom/Pan Viewer** — Click any diagram to open a full-screen modal with:
  - Mouse wheel zoom
  - Click-and-drag pan
  - Toolbar controls (zoom in / zoom out / reset)
  - Escape key and background click to close
- **10 diagram types** documented in the bundled skill:
  - Flowchart, Sequence, Class, State, ER, Gantt, Pie, Mindmap, Timeline, Git Graph
- **Error handling** with inline syntax error display
- **Light/Dark mode** support

## Installation

### Manual Install

1. Copy the `mermaid_diagrams/` directory into your Agent Zero plugins folder:

   ```bash
   cp -r mermaid_diagrams/ /path/to/agent-zero/usr/plugins/mermaid_diagrams/
   ```

2. Enable the plugin:

   ```bash
   touch /path/to/agent-zero/usr/plugins/mermaid_diagrams/.toggle-1
   ```

3. Reload the Agent Zero web UI.

### OCI Install (via env descriptor)

Add to your environment descriptor under `helm.agent.plugins.oci`:

```yaml
- ref: ghcr.io/agent-zero-plugins/mermaid_diagrams:0.1.0
  defaults: omar-github
```

## Plugin Structure

```
mermaid_diagrams/
├── plugin.yaml                          # Plugin manifest
├── __init__.py                          # Python entry point
├── meta.yaml                            # Metadata
├── default_config.yaml                  # Default configuration
├── extensions/
│   ├── python/
│   │   └── system_prompt/
│   │       └── _15_mermaid_nudge.py     # Behavioral nudge extension
│   └── webui/
│       └── sidebar-end/
│           └── mermaid-renderer.html    # WebUI renderer + zoom viewer
├── skills/
│   └── mermaid/
│       └── SKILL.md                     # Agent skill (10 diagram types)
└── webui/
    └── .gitkeep
```

## Configuration

The plugin works out of the box with no configuration required. Default settings are in `default_config.yaml`.

## License

Apache-2.0 — see [LICENSE](LICENSE).
