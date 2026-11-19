# What did the small model learn?

The chooser learned a three-question decision tree from imitation. In this catalog, observing two seconds of motion cannot distinguish any of the eight mechanisms in a family. The trained chooser selected three tests that narrowed the set from eight to four to two to one on **every one of 288 held-out worlds**. Its final two tests spent budget but added no evidence. That is a result about *designing experiments*: an exact, catalog-aware decoder still made the forecasts.

## Design and metric

432 train configurations, 8,640 labeled history prefixes; four teacher/random mixtures per configuration. The 18–24–8 tanh network has 656 trainable parameters. It regresses the eight candidate interventions' information gains (bits) from observations only. At inference we mask spent actions and take the highest score. Teacher and gain baseline use the same uniform prior and eliminate only rules contradicted by observations. The learned chooser does not call either. Even after identification, every active strategy takes five distinct actions so the cost of continuing is visible.

For each budget below, we compute the Euclidean distance from each predicted endpoint to the simulator's endpoint, average over four novel, multi-condition releases, then average over **worlds**. Random is averaged over 16 seeds *within each world* first. Passive repeats its opening score as a no-action control; matching trained and information-gain curves are combined in the tables below. Units are chamber distance, not percent correct. The values below are exhaustive means over these finite grids, not estimates for natural-world physics.

## Held-out layouts

216 configurations, 72 per family. Known family/strength pairs, different initial coordinates (offset 1; training uses 0 and 2). Each matched set includes all eight hidden rules. This split checks consistency under a change of release position, not an unseen mechanism.

| Family | Strategy | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---:|---:|---:|---:|---:|---:|
| All | Passive |12.19|12.19|12.19|12.19|12.19|12.19|
| All | Random |12.19|9.62|7.43|5.62|4.12|2.93|
| All | Trained / gain |12.19|5.37|3.24|0|0|0|
| Drift | Passive |12.38|12.38|12.38|12.38|12.38|12.38|
| Drift | Random |12.38|9.81|7.76|6.03|4.58|3.25|
| Drift | Trained / gain |12.38|5.38|3.50|0|0|0|
| Load | Passive |11.75|11.75|11.75|11.75|11.75|11.75|
| Load | Random |11.75|9.21|7.10|5.29|3.85|2.74|
| Load | Trained / gain |11.75|5.00|3.20|0|0|0|
| Boundary | Passive |12.46|12.46|12.46|12.46|12.46|12.46|
| Boundary | Random |12.46|9.83|7.41|5.56|3.91|2.79|
| Boundary | Trained / gain |12.46|5.74|3.03|0|0|0|

## Unseen combinations

72 configurations, 24 per family. No training world combines Drift with strength 6, Load with 12, or Boundary with 10. Each strength and each mechanism occurs elsewhere in training. The network's features remove absolute field scale by construction. This is a fair transfer test of that invariance, **not** evidence the network learned the invariance or can discover new physics. Different passive errors partly reflect different strengths and forecast setups.

| Family | Strategy | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---:|---:|---:|---:|---:|---:|
| All | Passive |13.14|13.14|13.14|13.14|13.14|13.14|
| All | Random |13.14|10.22|7.86|5.91|4.30|2.85|
| All | Trained / gain |13.14|5.78|3.47|0|0|0|
| Drift | Passive |7.42|7.42|7.42|7.42|7.42|7.42|
| Drift | Random |7.42|5.81|4.59|3.53|2.58|1.66|
| Drift | Trained / gain |7.42|3.23|2.10|0|0|0|
| Load | Passive |17.62|17.62|17.62|17.62|17.62|17.62|
| Load | Random |17.62|13.99|10.63|7.87|5.96|3.98|
| Load | Trained / gain |17.62|7.50|4.80|0|0|0|
| Boundary | Passive |14.38|14.38|14.38|14.38|14.38|14.38|
| Boundary | Random |14.38|10.87|8.37|6.34|4.36|2.90|
| Boundary | Trained / gain |14.38|6.62|3.50|0|0|0|

## Two episodes to inspect

Open **Benchmark → Replay casebook** or append the path below to the lab origin. These are deliberately the extremes of mean error over budgets 1–5 against *one* random seed, not typical-world claims.

- **Learned win** (`/?world=af55b973d0&replay=learned&step=1`): moving A east immediately eliminated four of eight boundary laws. Reversing charge then launching east separated the survivors. Random seed 0 still had four laws and 14.4 units of error after its fifth test.
- **Learned struggle** (`/?world=2a2c7bca16&replay=random&step=1`): a southward launch activated a rare leaf switch unique to the true mechanism. Random's first test eliminated seven laws; the chooser took the safer charge split, retained four, and still had 9.6 units of error. A balanced split maximizes expected information, not information in *every* world.

Missing from this experiment: noisy sensors, hidden forces outside the catalog, ambiguous observations from collisions, and a learned predictor. The model gets structured kinematics, not pixels. A useful next test would add measurement noise and compare a probabilistic decoder shared by all four policies; exact elimination would no longer work.

[Machine-readable results](results/benchmark.json) · [Episode archive](results/episodes.json.gz) · [Reproduction commands](README.md#reproduce-on-cpu)
