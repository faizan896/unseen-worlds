import gzip
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent

def compact(value):
    return json.dumps(value,separators=(",",":"),allow_nan=False)

def save_gz(path, text):
    with path.open("wb") as dest, gzip.GzipFile(filename="",fileobj=dest,mode="wb",mtime=0) as gz:
        gz.write(text.encode())

def load_gz(path):
    with gzip.open(path,"rt") as f:
        return json.load(f)
