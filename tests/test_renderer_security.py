"""L1 component — renderer security contract for untrusted Mermaid source.

Chat diagrams are authored by the LLM, i.e. untrusted input rendered straight
into the webui DOM. The renderer must therefore keep mermaid in 'strict'
securityLevel (labels sanitized, click callbacks / inline handlers stripped).
'loose' would let crafted diagram syntax execute in the webui origin (XSS).
Upstream review: agent0ai/a0-plugins PR #610.
"""
from __future__ import annotations

import re
from pathlib import Path

RENDERER_REL = "extensions/webui/sidebar-end/mermaid-renderer.html"


def test_renderer_runs_mermaid_in_strict_mode(plugin_dir: Path) -> None:
    source = (plugin_dir / RENDERER_REL).read_text(encoding="utf-8")
    match = re.search(r"securityLevel:\s*['\"](\w+)['\"]", source)
    assert match is not None, "mermaid.initialize must set securityLevel explicitly"
    assert match.group(1) == "strict", (
        f"renderer securityLevel is {match.group(1)!r}; must be 'strict' "
        "(diagram source is LLM-authored/untrusted)"
    )
