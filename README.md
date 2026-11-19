# The Unseen Worlds Experiment

**Can a small model figure out the rules of an unfamiliar world by choosing its own experiments?** In this noiseless, closed catalog, a 656-parameter intervention chooser plus an exact predictor solved all 288 held-out worlds by test three. The network chooses experiments; it does **not** invent equations or predict trajectories unaided. See [the study report](FINDINGS.md) for the curves, family counts and a counterexample where random wins.

## Run the laboratory

From this directory, with Python 3.10 or newer:

```sh
python server.py --port 8000
```

Open **http://127.0.0.1:8000**. No dependencies, API keys, database or model downloads are needed to play. The browser opens on a live two-second chamber. Change one condition on probe A, inspect endpoints and inferred accelerations in the notebook, then forecast four unfamiliar launches. You can use fewer than five tests. Each forecast slider specifies a signed multiple of the observed opening acceleration; linear initial velocity still contributes to displacement. Submit to see your mean distance, the law, a matched twin, and a step-through policy replay.

For a session preview behind an authenticated proxy, use `python server.py --host 0.0.0.0 --port 8000`. For local play, keep the default loopback binding.

**Benchmark** selects held-out or transfer worlds and reports all six budgets by family. Its casebook opens the strongest win and loss relative to random seed 0; toggle the strategy at the same budget. “Copy replay link” preserves the world, policy and step on the host where the lab runs. A new world draws from either evaluation split. Use the field guide for coordinates and controls.

## Reproduce on CPU

```sh
python -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-train.txt  # NumPy is only needed to train
python -m scripts.train                       # regenerates both data and checkpoint
python -m scripts.benchmark                   # regenerates summaries and recorded episodes
python -m unittest discover -s tests -v
```

Run from the repo root. On Windows, activate with `.venv\Scripts\activate`. Training uses a fixed seed and single-threaded BLAS; last-bit weights may vary by Python/NumPy/BLAS build. Training here used Python 3.10 and NumPy 2.2.6; inference and benchmarking use only the standard library. Restart the server after regenerating records.

| Artifact | Contents |
|---|---|
| [Training examples](data/train.jsonl.gz) | 8,640 JSON lines: release conditions, opening endpoints, ordered action/endpoint history, network input and teacher target. Read with `gzip -dc data/train.jsonl.gz \| head -1`. |
| [Checkpoint](data/chooser.json) | Real weights, biases, architecture, training seed and loss. Rows of each weight array correspond to output neurons. |
| [Training script](scripts/train.py) | Generates examples, trains an 18 → 24 tanh → 8 MLP with Adam for 90 epochs. |
| [Benchmark](results/benchmark.json) | Means for every strategy, budget, split and family plus selected case IDs. |
| [Episode archive](results/episodes.json.gz) | Learned and seed-0 random actions, measured endpoints, ruled-out names, predictor outputs and errors for every evaluated world. |

## What the instruments measure

Each object follows `p(t) = p₀ + v₀t + at²/2`. A deterministic field reads its release state once, then remains constant; there are no contacts, boundary collisions, or per-frame switches. In all three families, each matched set has eight mechanisms with indistinguishable passive films. Drift has a uniform wind vs a charge-sign field; Load has uniform gravity vs a heavy-load reversal; Boundary has a uniform diagonal field vs a position-triggered reversal. Secondary and leaf switches add conditional changes. Opening conditions activate none. One legal probe changes one scalar, from a fresh immutable scene; the two untreated objects provide references. The opening direction identifies the family, not its mechanism.

The evaluator starts from **all** family/strength possibilities, keeps those consistent with the opening, and eliminates mechanisms only from observed interventions. Exact endpoint matching is sufficient because the initial state and elapsed time are known and acceleration is constant. The teacher ranks legal tests by the entropy of their possible outcomes under a uniform prior on surviving rules. It never receives the current true rule. The learned policy sees only an opening unit vector and, for each public intervention, a used flag and signed acceleration response relative to the opening. Flags distinguish an unperformed test from a zero response. It has no world ID, seed, family label, truth, candidate posterior or forecast answers. All strategies use the **same mean endpoint over compatible hypotheses**. This is not a comparison between four forecast models.

## Change the experiment

| Change | Start here |
|---|---|
| Add a law or release-state switch | [lab/world.py](lab/world.py): `acceleration`, `TREES`, descriptions, and legal `ACTIONS`. Update the catalog enumeration in [lab/infer.py](lab/infer.py) and [lab/design.py](lab/design.py) if adding mechanisms or strength levels. |
| Change the maximum budget | `BUDGET` in [lab/world.py](lab/world.py); keep it ≤ the number of distinct interventions. Regenerate examples, model and records; update five-test copy. |
| Try another model | Replace the fit in [scripts/train.py](scripts/train.py) and inference in [lab/policy.py](lab/policy.py). Keep `choose(model, opening, history)` and the forecast head fixed. |
| Change held-out configurations or tasks | [lab/design.py](lab/design.py) for splits, `forecasts` in [lab/world.py](lab/world.py) for novel releases. |
| Change policies, score or replay export | [lab/evaluate.py](lab/evaluate.py), [scripts/benchmark.py](scripts/benchmark.py), and [server.py](server.py). |

The browser replays recorded policy decisions; the server reconstructs each film with the very same simulator. Tests compare every saved step to fresh inference and its displayed final frame. Human forecasts are blind in the ordinary play flow; this is a transparent local research toy, not a tamper-resistant exam.
