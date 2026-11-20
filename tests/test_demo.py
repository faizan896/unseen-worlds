import json
import re
import unittest

from scripts.export_demo import exported_demo
from server import serve


class PortfolioDemo(unittest.TestCase):
    def test_export_contains_both_sides_of_the_archived_fork(self):
        page = exported_demo()
        self.assertNotRegex(page, r"@@[A-Z]+@@")
        payload = json.loads(re.search(r'<script type="application/json" id="recordings">(.*?)</script>', page)[1])
        worlds = payload["worlds"]
        self.assertIn(payload["primary"], worlds)
        self.assertEqual(len(worlds), 2)
        for wid, data in worlds.items():
            fork = data["witness"]
            self.assertEqual(data["base"]["world"], wid)
            self.assertEqual(worlds[fork["alternate"]]["witness"]["alternate"], wid)
            for policy, episode in data["episodes"].items():
                fresh = serve("/api/replay", {"world": [wid], "policy": [policy]})
                self.assertEqual(episode["steps"], fresh["steps"])
            next_action = data["episodes"]["learned"]["steps"][1]["action"]
            self.assertEqual(fork["next"], next_action)
            self.assertNotEqual(fork["alternate_next"], next_action)
