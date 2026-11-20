import json
from collections import defaultdict
from statistics import mean
from lab.design import worlds
from lab.evaluate import key, episode
from lab.fixed import THREE, select_triples
from lab.infer import observe
from lab.io import ROOT, compact, save_gz
from lab.policy import load_model
from lab.world import FAMILIES, BUDGET

SEEDS=16
STRATEGIES=("passive","random","learned","gain")

def rollup(rows):
    return dict(error=mean(row["error"] for row in rows),
                unique=sum(row["unique"] for row in rows), runs=sum(row["runs"] for row in rows))

def branching_cases(configurations, records):
    matched=defaultdict(list)
    for w in configurations:
        matched[observe(w)].append(w)
    choices=defaultdict(list)
    for group in matched.values():
        for w in group:
            rec=records[key(w)]
            if rec["fixed"]["counts"][THREE]==1 or rec["learned"]["counts"][THREE]!=1:
                continue
            first,second=rec["learned"]["steps"][:2]
            for other in group:
                alt,next_alt=records[key(other)]["learned"]["steps"][:2]
                if (first["action"]==alt["action"] and first["endpoint"]!=alt["endpoint"]
                        and second["action"]!=next_alt["action"]):
                    case=dict(id=key(w), alternate=key(other), first=first["action"],
                              endpoint=first["endpoint"], next=second["action"],
                              alternate_endpoint=alt["endpoint"], alternate_next=next_alt["action"])
                    for name in ("All", FAMILIES[w.family]):
                        choices[name].append((rec["fixed"]["errors"][THREE],case))
                    break
    return {name:max(cases,key=lambda p:(p[0],p[1]["id"]))[1] for name,cases in choices.items()}

def main():
    model=load_model(); records={}; summary=dict(budget=BUDGET,seeds=SEEDS,splits={},examples={})
    frozen,train_search=select_triples(worlds("train"))
    summary.update(fixed_plans=frozen,retrospective={},three_budget=THREE)
    search={"train":train_search}
    for split in ("test","transfer"):
        by=defaultdict(lambda:defaultdict(list)); comparisons=[]
        at_three=defaultdict(lambda:defaultdict(list))
        for w in worlds(split):
            rec={}; curves={}
            for strategy in (*STRATEGIES,"fixed"):
                runs=[episode(w,strategy,model,s,record=(s==0 and strategy in ("learned","random","fixed")),
                              fixed_plans=frozen)
                      for s in range(SEEDS if strategy=="random" else 1)]
                curves[strategy]=list(map(mean,zip(*(r["errors"] for r in runs))))
                if strategy in ("learned","random","fixed"): rec[strategy]=runs[0]
                for group in ("All",FAMILIES[w.family]):
                    if strategy!="fixed": by[group][strategy].append(curves[strategy])
                    if strategy!="passive":
                        at_three[group][strategy].append(dict(error=curves[strategy][THREE],
                            unique=sum(r["counts"][THREE]==1 for r in runs), runs=len(runs)))
            records[key(w)]=rec
            comparisons.append((mean(rec["random"]["errors"][1:])-mean(rec["learned"]["errors"][1:]),key(w)))
        summary["splits"][split]={g:dict(n=len(group["passive"]),
            at_three={s:rollup(rows) for s,rows in at_three[g].items()},
            curves={s:[round(mean(v),6) for v in zip(*group[s])] for s in STRATEGIES}) for g,group in by.items()}
        summary["examples"][split]={label:dict(id=value[1],difference=value[0]) for label,value in
            [("win",max(comparisons)),("struggle",min(comparisons))]}
        summary["examples"][split]["branch"]=branching_cases(worlds(split),records)
    # Only the retrospective diagnostic may fit to the evaluation outcomes.
    for split in ("test","transfer"):
        retro,search[split]=select_triples(worlds(split))
        selected={f:next(r for r in rows if r["actions"]==retro[f]) for f,rows in search[split].items()}
        n=sum(r["n"] for r in selected.values())
        groups={f:dict(error=r["error"],unique=r["unique"],runs=r["n"]) for f,r in selected.items()}
        groups["All"]=dict(error=sum(r["n"]*r["error"] for r in selected.values())/n,
                           unique=sum(r["unique"] for r in selected.values()),runs=n)
        summary["retrospective"][split]=dict(plans=retro,groups=groups)
        print(split,json.dumps(summary["splits"][split]["All"]["at_three"]), "retrospective",groups["All"])
    (ROOT/"results/triple-search.json").write_text(json.dumps(search,indent=2)+"\n")
    (ROOT/"results/benchmark.json").write_text(json.dumps(summary,indent=2)+"\n")
    save_gz(ROOT/"results/episodes.json.gz",compact(records))

if __name__=="__main__": main()
