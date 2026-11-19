"""Local lab server. Run with python server.py."""
import argparse
import json
import math
import secrets
from dataclasses import asdict
from functools import partial, lru_cache
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from lab.design import worlds
from lab.evaluate import key
from lab.infer import observe, plausible, measure, residual
from lab.io import load_gz
from lab.world import (World, ACTIONS, BUDGET, T, FAMILIES, intervention, forecasts,
                       position, film, error, law)

ROOT = Path(__file__).resolve().parent

WORLDS={key(w):w for split in ("test","transfer") for w in worlds(split)}
DEFAULT=key(World(0,4,8,1,1))

@lru_cache
def records():
    return load_gz(ROOT/"results/episodes.json.gz")

def trial(w,scene):
    return dict(film=film(w,scene),scene=list(map(asdict,scene)))

def history(w,op,actions):
    if len(actions)>BUDGET or len(set(actions))!=len(actions) or any(a not in range(len(ACTIONS)) for a in actions):
        raise ValueError("Illegal experiment history")
    return [(a,measure(w,op,a)) for a in actions]

def serve(path, query):
    get=lambda k,default="":query.get(k,[default])[0]
    if path=="/api/benchmark":
        return json.loads((ROOT/"results/benchmark.json").read_text())
    wid=get("world",DEFAULT)
    if wid=="new": wid=secrets.choice(tuple(WORLDS))
    w=WORLDS[wid]; s=w.scene(); op=observe(w)
    if path=="/api/open":
        return dict(**trial(w,s),world=wid, budget=BUDGET, actions=ACTIONS, duration=T)
    actions=[int(a) for a in get("history").split(",") if a]
    if path=="/api/run":
        a=int(get("action"))
        history(w,op,actions+[a])
        return trial(w,intervention(s,a))
    if path=="/api/tasks":
        return dict(tasks=list(map(asdict,forecasts(s))),opening_field=residual(s[0],op.ends[0]))
    if path=="/api/score":
        obs=history(w,op,actions)
        pred=json.loads(get("points"))
        truth=[position(w,p) for p in forecasts(s)]
        if (not isinstance(pred,list) or len(pred)!=len(truth) or
            not all(isinstance(pt,list) and len(pt)==2 and all(type(n) in (int,float) and math.isfinite(n)
                        and abs(n)<1e5 for n in pt) for pt in pred)):
            raise ValueError("Invalid forecasts")
        twin=World(w.family,w.mechanism^4,w.strength,w.layout,w.offset)
        witness=next(a for a in actions+list(range(len(ACTIONS))) if measure(w,op,a)!=measure(twin,op,a))
        return dict(error=error(pred,truth),truth=truth,law=law(w),family=FAMILIES[w.family],
                    remaining=len(plausible(op,obs)),twin=law(twin)["name"],witness=witness,
                    actual=measure(w,op,witness),other=measure(twin,op,witness))
    if path=="/api/replay":
        strategy=get("policy","learned")
        rec=records()[wid][strategy]
        return dict(**rec,law=law(w),family=FAMILIES[w.family],
                    trials=[trial(w,intervention(s,x["action"])) for x in rec["steps"]])
    raise ValueError("Unknown endpoint")

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urlsplit(self.path)
        if not url.path.startswith("/api/"):
            return super().do_GET()
        try:
            data = json.dumps(serve(url.path,parse_qs(url.query)), allow_nan=False).encode()
        except (ValueError,IndexError, KeyError, TypeError):
            return self.send_error(400, "Invalid lab request")
        self.send_response(200)
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(data)))
        self.end_headers()
        self.wfile.write(data)

if __name__ == "__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--host", default="127.0.0.1")
    args=p.parse_args()
    ThreadingHTTPServer((args.host,args.port),partial(Handler,directory=str(ROOT/"web"))).serve_forever()
