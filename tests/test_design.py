import itertools
import unittest
from lab.world import *
from lab.design import worlds
from lab.infer import *

class Design(unittest.TestCase):
    def test_all_pairs_identical_then_distinguishable(self):
        for f,g,l,k in itertools.product(range(3),STRENGTHS,range(3),range(3)):
            ws=[World(f,m,g,l,k) for m in range(8)]
            s=ws[0].scene()
            self.assertTrue(all(film(w,s)==film(ws[0],s) for w in ws))
            op=observe(ws[0])
            self.assertEqual(8,len({signatures(op,w) for w in ws}))
            self.assertEqual(1,len({measure(w,op,7) for w in ws}))

    def test_third_probe_depends_on_first_two_outcomes(self):
        for f in range(3):
            third=set()
            for m in range(8):
                w=World(f,m,8,1); op=observe(w); history=[]
                for size in (8,4,2):
                    self.assertEqual(size,len(plausible(op,history)))
                    a=best(gains(op,history),history)
                    if size==2: third.add(a)
                    history.append((a,measure(w,op,a)))
                self.assertEqual(1,len(plausible(op,history)))
            self.assertEqual(4,len(third))

    def test_splits_and_novel_tasks(self):
        train,test,transfer=(set(worlds(k)) for k in ('train','test','transfer'))
        self.assertFalse(train & test or train & transfer or test & transfer)
        keys=lambda ws:{(w.family,w.strength) for w in ws}
        self.assertTrue(keys(test)<=keys(train))
        self.assertFalse(keys(train)&keys(transfer))
        for w in train|test|transfer:
            s=w.scene()
            self.assertFalse(set(forecasts(s)) & {intervention(s,a)[0] for a in range(len(ACTIONS))})
            for a in range(len(ACTIONS)):
                changed=intervention(s,a)
                self.assertEqual(1,sum(v!=getattr(changed[0],k) for k,v in vars(s[0]).items()))
                self.assertEqual(s[1:],changed[1:])
            self.assertEqual(s,w.scene())

    def test_features_and_teacher_do_not_read_hidden_world(self):
        a,b=World(0,0,8,0),World(0,4,8,0)
        for action in (1,7):
            ops=[observe(w) for w in (a,b)]
            histories=[[(action,measure(w,op,action))] for w,op in zip((a,b),ops)]
            self.assertEqual(features(ops[0],histories[0]),features(ops[1],histories[1]))
            self.assertEqual(gains(ops[0],histories[0]),gains(ops[1],histories[1]))
