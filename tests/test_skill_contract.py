"""BEH-8 — the bundled mermaid skill is discoverable by the agent.

File/front-matter contract over the plugin tree: the skill exists at the
canonical path, has valid YAML front-matter with the fields A0's skill loader
surfaces (name, description, triggers), and teaches the ```mermaid fence.
No A0 runtime needed.
"""
from __future__ import annotations

import pathlib
import re

import yaml

_SKILL = (
    pathlib.Path(__file__).resolve().parents[1]
    / "usr" / "plugins" / "mermaid_diagrams" / "skills" / "mermaid" / "SKILL.md"
)


def _frontmatter() -> dict:
    text = _SKILL.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    assert m, "SKILL.md must start with a YAML front-matter block"
    data = yaml.safe_load(m.group(1))
    assert isinstance(data, dict)
    return data


def test_skill_file_exists() -> None:
    assert _SKILL.is_file(), f"missing bundled skill at {_SKILL}"


def test_frontmatter_has_loader_fields() -> None:
    fm = _frontmatter()
    assert fm.get("name") == "mermaid"
    assert isinstance(fm.get("description"), str) and fm["description"].strip()
    triggers = fm.get("triggers")
    assert isinstance(triggers, list) and len(triggers) >= 3, "skill needs discovery triggers"
    assert "mermaid" in [str(t).lower() for t in triggers]


def test_skill_teaches_the_mermaid_fence() -> None:
    body = _SKILL.read_text(encoding="utf-8")
    assert "```mermaid" in body, "skill must teach the fenced ```mermaid output format"
