"""Deterministic, noninteracting probes. A field is sampled at release and held for two seconds."""
from dataclasses import dataclass, replace
from math import hypot

T = 2
BUDGET = 5
FAMILIES = ("Drift", "Load", "Boundary")
DIRECTIONS = ((1, 0), (0, 1), (0.8, -0.6))
STRENGTHS = (6, 8, 10, 12)
PROBES = ("A", "B", "C")

@dataclass(frozen=True)
class Probe:
    x: float
    y: float
    vx: float = 0
    vy: float = 0
    mass: float = 1
    q: float = 1

@dataclass(frozen=True)
class World:
    family: int
    mechanism: int
    strength: int
    layout: int
    offset: int = 0

    def scene(self):
        d, k = self.layout * 3, self.offset
        return (Probe(45+d+k, 49-d+k, 7, 2), Probe(88-d+k, 93+k, 4, -2),
                Probe(125+k, 59+d, -2, 3))

# The controlled probe is always A. B and C are untreated references.
ACTIONS = (
    ("Reverse charge", "q", -1), ("Increase mass", "mass", 2),
    ("Launch east", "vx", 12), ("Move east", "x", 161),
    ("Move north", "y", 29), ("Reduce mass", "mass", 0.5),
    ("Launch south", "vy", 11), ("Launch west", "vx", -7),
)
def intervention(scene, action):
    _, attr, value = ACTIONS[action]
    return (replace(scene[0], **{attr:value}), *scene[1:])

# Each row is a decision tree: primary switch, two branch switches,
# four leaf switches. The law fixes one path; sensors never read the hidden bits.
TREES = ((0,1,2,3,4,5,6), (1,4,5,0,6,3,2), (3,0,6,2,5,1,4))
TRIGGERS = ("negative charge", "mass ≥ 1.5", "east speed ≥ 10", "x ≥ 155",
            "y ≤ 35", "mass ≤ 0.8", "south speed ≥ 9")
BASE_NAMES = (("Uniform wind","Charge field"), ("Uniform gravity","Load-sensitive lift"),
              ("Uniform diagonal field","Boundary reversal"))

def branches(w):
    r, b, c = w.mechanism >> 2, (w.mechanism >> 1) & 1, w.mechanism & 1
    tree = TREES[w.family]
    return r,b,c,tree[0],tree[1+r],tree[3+2*r+b]

def law(w):
    r,b,c,primary,second,leaf=branches(w)
    name=BASE_NAMES[w.family][r]
    if b: name += " / " + TRIGGERS[second]
    if c: name += " / " + TRIGGERS[leaf]
    clauses=[f"Baseline acceleration: {w.strength} units/s² along the opening track."]
    if r: clauses.append(f"Subtract 2× baseline for {TRIGGERS[primary]}.")
    if b: clauses.append(f"Subtract 0.6× baseline for {TRIGGERS[second]}.")
    if c: clauses.append(f"Subtract 0.8× baseline for {TRIGGERS[leaf]}.")
    if not (r or b or c): clauses.append("No starting condition changes that field.")
    return dict(name=name, explanation=" ".join(clauses))

def acceleration(w, p):
    flags=(p.q<0, p.mass>=1.5, p.vx>=10, p.x>=155, p.y<=35, p.mass<=0.8, p.vy>=9)
    r,b,c,g,h,j=branches(w)
    factor = 1 - 2*r*flags[g] - 0.6*b*flags[h] - 0.8*c*flags[j]
    return tuple(w.strength * d * factor for d in DIRECTIONS[w.family])

def position(w, p, t=T):
    ax, ay = acceleration(w, p)
    return (round(p.x+p.vx*t+ax*t*t/2, 5), round(p.y+p.vy*t+ay*t*t/2, 5))

def film(w, scene):
    return [[position(w, p, i*T/20) for p in scene] for i in range(21)]

def forecasts(scene):
    # Novel values and combinations, never legal single-change experiments.
    return tuple(replace(scene[i%3], **kw) for i, kw in enumerate((
        dict(q=-2, mass=3, x=168, vx=-3), dict(mass=0.65, vx=14, y=25),
        dict(q=-3, vy=13, y=22), dict(mass=2.5, vx=15, x=169, vy=10))))

def error(predicted, actual):
    return sum(hypot(x-u, y-v) for (x,y),(u,v) in zip(predicted, actual, strict=True))/len(actual)
