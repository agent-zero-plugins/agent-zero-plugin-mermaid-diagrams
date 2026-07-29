"""L1 component — plugin shape smoke checks via a0_plugin_testkit.

Catches the classes of shipped bug the testkit exists for: typo'd extension
points, dead lifecycle hooks, undeclared imports, fabricated A0 API calls,
missing/broken thumbnail, structurally invalid manifest.
"""
from __future__ import annotations

from pathlib import Path

from a0_plugin_testkit.assertions import (
    assert_no_dead_plugin_hooks,
    assert_no_stray_extension_folders,
    assert_plugin_has_thumbnail,
)
from a0_plugin_testkit.real.a0_api import audit_a0_api_usage, assert_a0_api_usage_ok
from a0_plugin_testkit.real.deps import audit_dependencies, assert_dependencies_declared
from a0_plugin_testkit.real.validator import assert_validator_clean, static_validate


def test_no_typo_extension_points(plugin_dir: Path) -> None:
    assert_no_stray_extension_folders(plugin_dir)


def test_no_dead_hooks(plugin_dir: Path) -> None:
    assert_no_dead_plugin_hooks(plugin_dir)


def test_thumbnail(plugin_dir: Path) -> None:
    assert_plugin_has_thumbnail(plugin_dir)


def test_static_validator(plugin_dir: Path) -> None:
    assert_validator_clean(static_validate(plugin_dir), allow_warnings=False)


def test_dependencies_declared(plugin_dir: Path) -> None:
    assert_dependencies_declared(audit_dependencies(plugin_dir))


def test_a0_api_usage_valid(plugin_dir: Path) -> None:
    assert_a0_api_usage_ok(audit_a0_api_usage(plugin_dir))
