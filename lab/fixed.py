"""Fit an open-loop experimental design. Evaluation has no part in fitting the frozen plan."""
from collections import defaultdict
from itertools import combinations
from statistics import mean

from .infer import forecast, hypotheses, measure, observe, plausible
from .world import ACTIONS, FAMILIES, error, forecasts, position

THREE = 3
TRIPLES = tuple(combinations(range(len(ACTIONS)), THREE))


def opening_family(op):
    families = {h.family for h in hypotheses(op)}
    if len(families) != 1:
        raise ValueError("Opening motion does not identify one family")
    return FAMILIES[families.pop()]


def select_triples(configurations):
    """Return a plan per family and all candidate scores on the supplied selection set."""
    losses = defaultdict(lambda: defaultdict(list))
    singletons = defaultdict(lambda: defaultdict(int))
    for w in configurations:
        op = observe(w)
        family = opening_family(op)
        measurements = [(a, measure(w, op, a)) for a in range(len(ACTIONS))]
        truth = [position(w, p) for p in forecasts(op.scene)]
        for triple in TRIPLES:
            history = [measurements[a] for a in triple]
            losses[family][triple].append(error(forecast(op, history), truth))
            singletons[family][triple] += len(plausible(op, history)) == 1
    plans, search = {}, {}
    for family, candidates in losses.items():
        rows = [dict(actions=t, error=mean(values), unique=singletons[family][t], n=len(values))
                for t, values in candidates.items()]
        plans[family] = min(rows, key=lambda r: (round(r["error"], 12), r["actions"]))["actions"]
        search[family] = rows
    return plans, search
