"""Enumerated, balanced matched sets. Splits are made before collecting any traces."""
from .world import World, STRENGTHS, FAMILIES

def worlds(split):
    for f in range(len(FAMILIES)):
        for j,g in enumerate(STRENGTHS):
            transfer=(f+j)%4==0
            if transfer != (split=="transfer"):
                continue
            for layout in range(3):
                for offset in ((0,2) if split=="train" else (1,)):
                    for m in range(8):
                        yield World(f,m,g,layout,offset)
