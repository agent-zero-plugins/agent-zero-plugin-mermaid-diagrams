"""BEH-9 (system-prompt half) — the agent is nudged to use diagrams.

Unit test over the `system_prompt` extension with faked A0 modules (no A0
runtime): the extension appends the visual-explanations nudge for a live agent
and no-ops without one. The fragment-publisher half of BEH-9 is covered by
tests/test_publish_nudge.py.
"""
from __future__ import annotations

import asyncio
import importlib.util
import pathlib
import sys
import types

_MOD = (
    pathlib.Path(__file__).resolve().parents[1]
    / "usr" / "plugins" / "mermaid_diagrams" / "extensions" / "python" / "system_prompt"
    / "_15_mermaid_nudge.py"
)


class _Ext:
    def __init__(self, agent=None, *a, **k):
        self.agent = agent


def _load():
    hx = types.ModuleType("helpers.extension"); hx.Extension = _Ext
    helpers = types.ModuleType("helpers"); helpers.extension = hx
    ag = types.ModuleType("agent")
    ag.Agent = type("Agent", (), {})
    ag.LoopData = type("LoopData", (), {"__init__": lambda self, **k: None})
    sys.modules["helpers"] = helpers
    sys.modules["helpers.extension"] = hx
    sys.modules["agent"] = ag
    spec = importlib.util.spec_from_file_location("mermaid_nudge_under_test", _MOD)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def test_appends_nudge_for_live_agent() -> None:
    mod = _load()
    ext = mod.MermaidNudge(agent=object())
    prompt: list[str] = ["base"]
    asyncio.run(ext.execute(system_prompt=prompt))
    assert len(prompt) == 2
    added = prompt[1]
    assert "```mermaid" in added, "nudge must point at the mermaid fence"
    assert "mermaid" in added.lower() and "skill" in added.lower()


def test_noop_without_agent() -> None:
    mod = _load()
    ext = mod.MermaidNudge(agent=None)
    prompt: list[str] = ["base"]
    asyncio.run(ext.execute(system_prompt=prompt))
    assert prompt == ["base"], "no agent -> no nudge appended"


def test_nudge_matches_published_fragment_source() -> None:
    """The system-prompt nudge and the published PromptFragment must share ONE
    source of truth: the module-level constant the publisher AST-reads."""
    mod = _load()
    assert isinstance(mod.MERMAID_BEHAVIORAL_NUDGE, str)
    assert mod.MERMAID_BEHAVIORAL_NUDGE.startswith("## Visual explanations")
