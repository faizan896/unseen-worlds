import json
from collections import defaultdict
from statistics import mean
from lab.design import worlds
from lab.evaluate import key, episode
from lab.io import ROOT, compact, save_gz
from lab.policy import load_model
from lab.world import FAMILIES, BUDGET

SEEDS=16
STRATEGIES=("passive","random","learned","gain")
def main():
    model=load_model(); records={}; summary=dict(budget=BUDGET,seeds=SEEDS,splits={},examples={})
    for split in ("test","transfer"):
        by=defaultdict(lambda:defaultdict(list)); comparisons=[]
        for w in worlds(split):
            rec={}; curves={}
            for strategy in STRATEGIES:
                runs=[episode(w,strategy,model,s,record=(s==0 and strategy in ("learned","random")))
                      for s in range(SEEDS if strategy=="random" else 1)]
                curves[strategy]=list(map(mean,zip(*(r["errors"] for r in runs))))
                if strategy in ("learned","random"): rec[strategy]=runs[0]
                for group in ("All",FAMILIES[w.family]): by[group][strategy].append(curves[strategy])
            records[key(w)]=rec
            comparisons.append((mean(rec["random"]["errors"][1:])-mean(rec["learned"]["errors"][1:]),key(w)))
        summary["splits"][split]={g:dict(n=len(group["passive"]),
            curves={s:[round(mean(v),6) for v in zip(*group[s])] for s in STRATEGIES}) for g,group in by.items()}
        summary["examples"][split]={label:dict(id=value[1],difference=value[0]) for label,value in
            [("win",max(comparisons)),("struggle",min(comparisons))]}
        print(split,json.dumps(summary["splits"][split]["All"]))
    (ROOT/"results/benchmark.json").write_text(json.dumps(summary,indent=2)+"\n")
    save_gz(ROOT/"results/episodes.json.gz",compact(records))

if __name__=="__main__": main()
