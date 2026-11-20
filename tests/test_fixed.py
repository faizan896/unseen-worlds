import json
import unittest
from itertools import combinations
from statistics import mean

from lab.design import worlds
from lab.evaluate import key
from lab.fixed import THREE, TRIPLES, opening_family, select_triples
from lab.infer import observe
from lab.io import ROOT
from lab.world import ACTIONS, FAMILIES
from server import records


class FixedDesign(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.summary = json.loads((ROOT/"results/benchmark.json").read_text())
        cls.search = json.loads((ROOT/"results/triple-search.json").read_text())

    def test_selection_exhaustive_and_frozen_before_evaluation(self):
        self.assertEqual(len(TRIPLES), 56)
        plans, _ = select_triples(worlds("train"))
        self.assertEqual({f:list(t) for f,t in plans.items()}, self.summary["fixed_plans"])
        for split, families in self.search.items():
            selected = self.summary["fixed_plans"] if split=="train" else self.summary["retrospective"][split]["plans"]
            for family, rows in families.items():
                self.assertEqual([tuple(r["actions"]) for r in rows], list(combinations(range(len(ACTIONS)), THREE)))
                best = min(rows, key=lambda r:(round(r["error"],12),r["actions"]))
                self.assertEqual(best["actions"], selected[family])
                self.assertEqual(best["n"], sum(FAMILIES[w.family]==family for w in worlds(split)))
                if split!="train":
                    hindsight = self.summary["retrospective"][split]["groups"][family]
                    self.assertEqual((best["error"],best["unique"]), (hindsight["error"],hindsight["unique"]))

    def test_tied_forecast_error_prefers_lexicographically_first_triple(self):
        # Any triple containing the southward launch isolates this rare Drift leaf.
        leaf = next(w for w in worlds("train") if w.family==0 and w.mechanism==7)
        plans, search = select_triples([leaf])
        rows = search["Drift"]
        optimum = min(round(r["error"],12) for r in rows)
        tied = [r["actions"] for r in rows if round(r["error"],12)==optimum]
        self.assertGreater(len(tied), 1)
        self.assertEqual(plans["Drift"], min(tied))

    def test_actual_actions_and_endpoints_match_reported_budget(self):
        for split in ("test","transfer"):
            for family, row in self.summary["splits"][split].items():
                subset = [w for w in worlds(split) if family in ("All",FAMILIES[w.family])]
                for w in subset:
                    record = records()[key(w)]["fixed"]
                    self.assertEqual([s["action"] for s in record["steps"]],
                                     self.summary["fixed_plans"][opening_family(observe(w))])
                    self.assertEqual(len(record["errors"]), THREE+1)
                for p in ("fixed","learned"):
                    runs = [records()[key(w)][p] for w in subset]
                    stats = row["at_three"][p]
                    self.assertEqual(stats["runs"], len(subset))
                    self.assertEqual(stats["unique"], sum(len(r["steps"][THREE-1]["remaining"])==1 for r in runs))
                    self.assertAlmostEqual(stats["error"], mean(r["errors"][THREE] for r in runs))
                random = row["at_three"]["random"]
                self.assertEqual(random["runs"], len(subset)*self.summary["seeds"])
                self.assertAlmostEqual(random["error"], row["curves"]["random"][THREE], places=6)

    def test_replay_witness_actually_branches_on_observation(self):
        for split in ("test","transfer"):
            by_id = {key(w):w for w in worlds(split)}
            cases = self.summary["examples"][split]["branch"]
            self.assertEqual(set(cases), {"All", *FAMILIES})
            for case in cases.values():
                w, alt = (by_id[case[k]] for k in ("id","alternate"))
                self.assertEqual(observe(w), observe(alt))
                for config, prefix in ((w,""),(alt,"alternate_")):
                    a,b = records()[key(config)]["learned"]["steps"][:2]
                    self.assertEqual(a["action"], case["first"])
                    self.assertEqual(a["endpoint"], case[prefix+"endpoint"])
                    self.assertEqual(b["action"], case[prefix+"next"])
                self.assertNotEqual(case["endpoint"], case["alternate_endpoint"])
                self.assertNotEqual(case["next"], case["alternate_next"])
                self.assertEqual(records()[key(w)]["learned"]["counts"][THREE], 1)
                self.assertGreater(records()[key(w)]["fixed"]["counts"][THREE], 1)
