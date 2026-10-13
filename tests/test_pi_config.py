"""Exercise the Pi chezmoi source in isolated homes without executing secret lookups.

Run with: python3 -m unittest discover -s tests
"""

import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest


REPO = Path(__file__).resolve().parents[1]
SHARED = json.loads((REPO / "home/.chezmoitemplates/pi-settings.json").read_text())


class PiConfigTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.home = root / "home"
        self.home.mkdir()
        self.agent = self.home / ".pi/agent"
        self.agent.mkdir(parents=True)
        self.command = [
            "chezmoi", "--source", str(REPO), "--destination", str(self.home),
            "--config", str(root / "absent-config.toml"),
            "--persistent-state", str(root / "state.boltdb"),
            "--override-data", json.dumps({"machineName": "test", "chezmoi": {"os": "linux"}}),
        ]

    def run_chezmoi(self, *args):
        return subprocess.run(self.command + list(args), check=True, capture_output=True, text=True)

    def read_settings(self):
        return json.loads((self.agent / "settings.json").read_text())

    def test_existing_local_fields_survive_and_shared_fields_update(self):
        local = {"theme": "light", "lastChangelogVersion": "local-version",
                 "defaultModel": "old-model", "futureLocalPreference": {"enabled": True}}
        (self.agent / "settings.json").write_text(json.dumps(local))
        self.run_chezmoi("apply")
        actual = self.read_settings()
        for key, value in SHARED.items():
            self.assertEqual(actual[key], value)
        for key in ("theme", "lastChangelogVersion", "futureLocalPreference"):
            self.assertEqual(actual[key], local[key])
        self.assertEqual(self.run_chezmoi("diff", "--no-pager").stdout, "")

    def test_fresh_home_contains_only_declared_config_and_real_skills(self):
        self.run_chezmoi("apply")
        self.assertEqual(self.read_settings(), SHARED)
        self.assertNotIn("theme", SHARED)
        self.assertNotIn("lastChangelogVersion", SHARED)
        skills = list((self.home / ".agents/skills").glob("*/SKILL.md"))
        self.assertEqual(len(skills), 27)
        self.assertFalse(any(p.is_symlink() for p in (self.home / ".agents").rglob("*")))
        self.assertEqual(len(list((self.agent / "agents").glob("*.md"))), 5)
        for name in ("auth.json", "codex-accounts.json", "trust.json", "sessions", "npm", "git", "APPEND_SYSTEM.md"):
            self.assertFalse((self.agent / name).exists(), name)
        models = json.loads((self.agent / "models.json").read_text())
        for provider in models["providers"].values():
            self.assertTrue(provider["apiKey"].startswith("!rbw get --field notes "))
        self.assertEqual((self.agent / "models.json").stat().st_mode & 0o777, 0o600)
        expected_agents = {
            "standard": "gpt-6.1-sol", "deep": "gpt-6.1-sol", "critic": "gpt-6.1-sol",
            "quick": "gpt-6-luna", "scout": "gpt-6-luna",
        }
        available = {m["id"] for m in models["providers"]["xyne-box"]["models"]}
        for name, model in expected_agents.items():
            text = (self.agent / "agents" / (name + ".md")).read_text()
            self.assertEqual(re.search(r"^model: (.+)$", text, re.MULTILINE).group(1), "xyne-box/" + model)
            self.assertIn(model, available)

    def test_local_theme_changes_and_credentials_are_not_overwritten(self):
        auth = self.agent / "auth.json"
        auth.write_text('{"test": "local-only"}\n')
        (self.agent / "settings.json").write_text('{"theme":"dark"}')
        self.run_chezmoi("apply")
        updated = self.read_settings()
        updated["theme"] = "light"
        updated["lastChangelogVersion"] = "updated-locally"
        (self.agent / "settings.json").write_text(json.dumps(updated))
        self.run_chezmoi("apply")
        self.assertEqual(self.read_settings()["theme"], "light")
        self.assertEqual(self.read_settings()["lastChangelogVersion"], "updated-locally")
        self.assertEqual(auth.read_text(), '{"test": "local-only"}\n')

    def test_invalid_local_json_is_not_silently_replaced(self):
        settings = self.agent / "settings.json"
        settings.write_text("invalid-json")
        result = subprocess.run(self.command + ["apply", str(settings)], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(settings.read_text(), "invalid-json")


if __name__ == "__main__":
    unittest.main()
