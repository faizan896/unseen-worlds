"""Inference uses only stdlib: the checkpoint is the trained network, not a lookup table."""
import json
from math import tanh
from .io import ROOT
from .infer import features, best

def load_model():
    return json.loads((ROOT/"data/chooser.json").read_text())

def scores(model,op,history):
    x=features(op,history)
    for i,(weights,bias) in enumerate(zip(model["weights"],model["biases"])):
        x=[b+sum(v*w for v,w in zip(x,col)) for col,b in zip(weights,bias)]
        if i==0: x=list(map(tanh,x))
    return x

def choose(model,op,history):
    return best(scores(model,op,history),history)
