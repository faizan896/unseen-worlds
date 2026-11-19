"""Generate imitation examples and train a two-layer gain regressor on CPU."""
import os
os.environ["OPENBLAS_NUM_THREADS"]="1"
os.environ["OMP_NUM_THREADS"]="1"
import random
from dataclasses import asdict
import numpy as np
from lab.io import ROOT, compact, save_gz
from lab.design import worlds
from lab.world import BUDGET
from lab.infer import observe, features, gains, measure, legal, best

SEED=731
def examples():
    rng=random.Random(SEED)
    for w in worlds("train"):
        op=observe(w)
        for noise in (0.,0.35,0.75,1.):
            hist=[]
            for _ in range(BUDGET):
                target=gains(op,hist)
                yield dict(release=[asdict(p) for p in op.scene], ends=op.ends,
                           history=list(hist), x=features(op,hist), target=target)
                a=rng.choice(legal(hist)) if rng.random()<noise else best(target,hist)
                hist.append((a,measure(w,op,a)))

def main():
    rows=list(examples())
    save_gz(ROOT/"data/train.jsonl.gz","".join(compact(r)+"\n" for r in rows))
    x=np.array([r["x"] for r in rows]); y=np.array([r["target"] for r in rows])
    rng=np.random.default_rng(SEED)
    d,h,o=x.shape[1],24,y.shape[1]
    params=[rng.normal(0,0.22,(d,h)),np.zeros(h),rng.normal(0,0.18,(h,o)),np.zeros(o)]
    m=[np.zeros_like(p) for p in params]; v=[a.copy() for a in m]; tick=0
    for epoch in range(90):
        for idx in np.array_split(rng.permutation(len(x)),(len(x)+95)//96):
            a,b=x[idx],y[idx]; w1,b1,w2,b2=params
            hid=np.tanh(a@w1+b1); out=hid@w2+b2
            grad=2*(out-b)/out.size
            delta=(grad@w2.T)*(1-hid**2)
            tick+=1
            for j,g in enumerate([a.T@delta,delta.sum(0),hid.T@grad,grad.sum(0)]):
                m[j]=0.9*m[j]+0.1*g; v[j]=0.999*v[j]+0.001*g*g
                params[j]-=0.003*(m[j]/(1-0.9**tick))/(np.sqrt(v[j]/(1-0.999**tick))+1e-8)
    pred=np.tanh(x@params[0]+params[1])@params[2]+params[3]
    model=dict(architecture=[d,h,o],seed=SEED,epochs=90,examples=len(x),
               parameters=sum(p.size for p in params),train_mse=float(np.mean((pred-y)**2)),
               weights=[params[j].T.tolist() for j in (0,2)],biases=[params[j].tolist() for j in (1,3)])
    (ROOT/"data/chooser.json").write_text(compact(model)+"\n")
    print({k:v for k,v in model.items() if k not in ("weights","biases")})

if __name__=="__main__": main()
