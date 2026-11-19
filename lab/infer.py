"""Observers see only release conditions, chosen interventions and measured positions."""
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from math import hypot, log2
from .world import ACTIONS, DIRECTIONS, STRENGTHS, T, World, intervention, position, forecasts

@dataclass(frozen=True)
class Opening:
    scene: tuple
    ends: tuple

def observe(w):
    scene=w.scene()
    return Opening(scene, tuple(position(w,p) for p in scene))

def measure(w, opening, a):
    return position(w,intervention(opening.scene,a)[0])

def residual(p, endpoint):
    return ((endpoint[0]-p.x-T*p.vx)*2/T**2,(endpoint[1]-p.y-T*p.vy)*2/T**2)

def features(op, history):
    ax,ay=residual(op.scene[0],op.ends[0])
    g=hypot(ax,ay)
    # Express the response in units of the opening field, not the world's strength index.
    obs=[0.]*(2*len(ACTIONS))
    for a, endpoint in history:
        dx,dy=residual(intervention(op.scene,a)[0],endpoint)
        obs[2*a:2*a+2]=[1., (ax*dx+ay*dy)/g**2]
    return [ax/g, ay/g, *obs]

@lru_cache(maxsize=256)
def hypotheses(op):
    pool=[]
    for f in range(len(DIRECTIONS)):
        for g in STRENGTHS:
            # All mechanisms coincide on this opening; verify the first before expanding.
            if tuple(position(World(f,0,g,0),p) for p in op.scene)!=op.ends:
                continue
            pool.extend(World(f,m,g,0) for m in range(8))
    return tuple(pool)

@lru_cache(maxsize=8192)
def signatures(op,h):
    return tuple(measure(h,op,a) for a in range(len(ACTIONS)))

def plausible(op,history):
    return tuple(h for h in hypotheses(op) if all(signatures(op,h)[a]==e for a,e in history))

def gains(op, history):
    pool=plausible(op,history)
    def entropy(a):
        sizes=Counter(signatures(op,h)[a] for h in pool)
        return -sum(n/len(pool)*log2(n/len(pool)) for n in sizes.values())
    return [entropy(a) for a in range(len(ACTIONS))]

@lru_cache(maxsize=8192)
def destinations(op,h):
    return tuple(position(h,p) for p in forecasts(op.scene))

def forecast(op,history):
    pool=plausible(op,history)
    sets=[destinations(op,h) for h in pool]
    return [(sum(x)/len(pool),sum(y)/len(pool)) for x,y in (zip(*pts) for pts in zip(*sets))]

def legal(history):
    tried={a for a,_ in history}
    return [a for a in range(len(ACTIONS)) if a not in tried]

def best(scores,history):
    return max(legal(history),key=scores.__getitem__)
