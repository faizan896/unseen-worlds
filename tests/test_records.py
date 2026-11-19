import json
import unittest
from lab.io import compact
from lab.policy import load_model
from lab.evaluate import episode
from server import serve, WORLDS, records, DEFAULT, history, observe
from lab.world import BUDGET

class Records(unittest.TestCase):
    def test_every_recorded_episode_matches_fresh_policy_and_displayed_film(self):
        model=load_model()
        self.assertEqual(set(records()),set(WORLDS))
        for wid,w in WORLDS.items():
            for p in ("learned","random"):
                actual=json.loads(compact(episode(w,p,model,record=True)))
                self.assertEqual(actual,records()[wid][p])
                data=serve('/api/replay',dict(world=[wid],policy=[p]))
                for r,trial in zip(actual['steps'],data['trials'],strict=True):
                    self.assertEqual(r['endpoint'],list(trial['film'][-1][0]))

    def test_blind_human_path(self):
        q={'world':[DEFAULT]}
        base=serve('/api/open',q)
        self.assertEqual(set(base),{'film','scene','world','actions','budget','duration'})
        for i in range(BUDGET):
            result=serve('/api/run',dict(q,action=[str(i)],history=[','.join(map(str,range(i)))]))
            self.assertEqual(result['scene'][1:],base['scene'][1:])
        with self.assertRaises(ValueError):
            serve('/api/run',dict(q,action=['5'],history=['0,1,2,3,4']))
        with self.assertRaises(ValueError):
            serve('/api/run',dict(q,action=['1'],history=['1']))
        tasks=serve('/api/tasks',q)
        self.assertEqual(set(tasks),{'tasks','opening_field'})
        points=[[p['x']+2*p['vx'],p['y']+2*p['vy']] for p in tasks['tasks']]
        outcome=serve('/api/score',dict(q,points=[json.dumps(points)]))
        self.assertGreater(outcome['error'],0)
        result=serve('/api/score',dict(q,points=[json.dumps(outcome['truth'])]))
        self.assertEqual(result['error'],0)
        self.assertNotEqual(outcome['actual'],outcome['other'])
        with self.assertRaises(ValueError):
            serve('/api/score',dict(q,points=['[]']))
