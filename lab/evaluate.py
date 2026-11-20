"""Shared, closed-catalog prediction head. Only the environment measures the true world."""
import random
import hashlib
from .world import BUDGET, error, position, forecasts, law
from .infer import observe, plausible, forecast, measure, legal, gains, best
from .policy import choose
from .fixed import opening_family

def key(w):
    return hashlib.sha256(repr(w).encode()).hexdigest()[:10]

def episode(w, strategy, model=None, seed=0, record=False, *, fixed_plans=None):
    rng=random.Random(f"{key(w)}:{seed}")  # RNG only for random policy; not an observation.
    op=observe(w); hist=[]
    answers=[position(w,p) for p in forecasts(op.scene)]
    plan=fixed_plans[opening_family(op)] if strategy=="fixed" else None
    errors=[error(forecast(op,hist),answers)]; steps=[]; counts=[len(plausible(op,hist))]
    for index in range(len(plan) if plan is not None else BUDGET):
        if strategy=="passive":
            errors.append(errors[0]); counts.append(counts[0]); continue
        if strategy=="random": a=rng.choice(legal(hist))
        elif strategy=="gain": a=best(gains(op,hist),hist)
        elif strategy=="learned": a=choose(model,op,hist)
        elif strategy=="fixed": a=plan[index]
        else: raise ValueError(strategy)
        before=plausible(op,hist)
        endpoint=measure(w,op,a); hist.append((a,endpoint))
        pred=forecast(op,hist); errors.append(error(pred,answers))
        after=plausible(op,hist); counts.append(len(after))
        if record:
            steps.append(dict(action=a,endpoint=endpoint,before=len(before),after=len(after),
                              excluded=[law(h)["name"] for h in before if h not in after],
                              remaining=[law(h)["name"] for h in after],
                              predictions=pred))
    return dict(errors=errors,steps=steps,counts=counts)
