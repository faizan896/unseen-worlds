"""Local lab server. Run with python server.py."""
import argparse
import json
from dataclasses import asdict
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from lab.world import *

ROOT = Path(__file__).resolve().parent

def serve(path, query):
    w = World(0, int(query.get("world", ["1"])[0]) % 2, 8, 0)
    scene = w.scene()
    if path == "/api/open":
        return dict(film=film(w,scene), scene=list(map(asdict,scene)), actions=ACTIONS, budget=BUDGET)
    if path == "/api/run":
        s = intervention(scene,int(query["action"][0]))
        return dict(film=film(w,s), scene=list(map(asdict,s)))
    if path == "/api/tasks":
        return list(map(asdict,forecasts(scene)))
    if path == "/api/score":
        truth = [position(w,p) for p in forecasts(scene)]
        return dict(error=error(json.loads(query["points"][0]),truth), truth=truth, law=("Wind","Charge field")[w.mechanism])
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
