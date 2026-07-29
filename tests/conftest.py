"""Shared fixtures for the mermaid_diagrams test suite."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Tests exec plugin modules straight from the plugin tree (SourceFileLoader).
# Without this, the loader writes __pycache__ INTO usr/plugins/, which the
# static validator rightly flags as a packaging hazard.
sys.dont_write_bytecode = True


@pytest.fixture(scope="session")
def plugin_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "usr" / "plugins" / "mermaid_diagrams"
