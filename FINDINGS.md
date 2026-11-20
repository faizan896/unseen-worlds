# What did the small model learn?

The chooser learned a three-question decision tree from imitation. In this catalog, observing two seconds of motion cannot distinguish any of the eight mechanisms in a family. The trained chooser selected three tests that narrowed the set from eight to four to two to one on **every one of 288 held-out worlds**. Its final two tests spent budget but added no evidence. That is a result about *designing experiments*: an exact, catalog-aware decoder still made the forecasts.

## Do observations change which test is worth doing?

**Yes, in this catalog.** After three tests the unchanged 656-parameter chooser identified **288/288** rules and had **0** mean endpoint error. Precommitting to the best triple on the training worlds identified **60/288** with **2.65** units of error. The four unseen forecast tasks, simulator, eligible interventions and closed-catalog predictor are identical. Only test selection changes.

### Prospective: choose on train, freeze, then evaluate

We exhaustively scored all 56 unordered triples of distinct legal actions on each family's 144 training configurations (432 total). The objective was mean Euclidean endpoint error, averaging the four forecasts within each world, then averaging worlds with equal weight. We did **not** optimize the singleton count. Ties at 12 decimal places go to the lexicographically smallest ascending action-index tuple. The final posterior is order-independent because trials reset; for playback we run the selected indices in ascending order. No winning family score was tied.

| Family inferred from opening motion | Frozen tests, in execution order | Training error |
|---|---|---:|
| Drift | Reverse charge → Move north → Launch south | 2.250000 |
| Load | Increase mass → Move east → Launch south | 2.666667 |
| Boundary | Reverse charge → Move east → Move north | 2.816667 |

The policy reads the opening motion to infer its family, commits to the corresponding plan, then ignores every intermediate result **for action selection**. The predictor still uses all three observations.

Each cell below is **mean endpoint error; singleton outcomes / runs**. A singleton means exactly one compatible rule, not merely a correct endpoint. Deterministic policies run once per world. Random uses the original 16 seeds per world: its numerator counts successful world–seed pairs, *not* distinct worlds. Divide by 16 for the mean number of identified worlds per seed (47/216 on layouts and 16.8125/72 on transfer).

| Split / family | Frozen triple | Random | Trained chooser | Information gain |
|---|---:|---:|---:|---:|
| Held-out layouts, all | 2.577778; 45/216 | 5.624715; 752/3456 | 0; 216/216 | 0; 216/216 |
| Drift | 2.250000; 18/72 | 6.030758; 258/1152 | 0; 72/72 | 0; 72/72 |
| Load | 2.666667; 18/72 | 5.288296; 251/1152 | 0; 72/72 | 0; 72/72 |
| Boundary | 2.816667; 9/72 | 5.555093; 243/1152 | 0; 72/72 | 0; 72/72 |
| Transfer, all | 2.866667; 15/72 | 5.914745; 269/1152 | 0; 72/72 | 0; 72/72 |
| Drift | 1.350000; 6/24 | 3.531250; 95/384 | 0; 24/24 | 0; 24/24 |
| Load | 4.000000; 6/24 | 7.874792; 84/384 | 0; 24/24 | 0; 24/24 |
| Boundary | 3.250000; 3/24 | 6.338194; 90/384 | 0; 24/24 | 0; 24/24 |

### Retrospective only: choose with the split's answers

We independently reran the 56-way search per family **on each evaluation split**, with the same error objective and tie-break. Both hindsight searches chose the same named triples as training. This equality is an outcome, not an assumption. The separately fitted results are:

| Split | Drift: error; unique | Load: error; unique | Boundary: error; unique | All: error; unique |
|---|---:|---:|---:|---:|
| Held-out layouts | 2.250000; 18/72 | 2.666667; 18/72 | 2.816667; 9/72 | 2.577778; 45/216 |
| Transfer | 1.350000; 6/24 | 4.000000; 6/24 | 3.250000; 3/24 | 2.866667; 15/72 |

This reproduces the local **60/288** hindsight check. It is not a deployable baseline, nor is 60 the maximum singleton count attainable by optimizing a *different* objective. In fact the frozen plan beats random on mean error but identifies slightly fewer worlds on average. All candidate scores and denominators are in the [search audit](results/triple-search.json).

### A fork you can watch

Open `/?world=b960e56a29&replay=compare&step=1` on the lab host. In this transfer Load world both policies first increase mass. The observed endpoint **(66, 24)** prompts the chooser to **reduce mass** next; in a matched world with the identical opening, the endpoint **(66, 72)** prompts it to **move north** instead. These are recorded decisions from the same checkpoint, not a post-hoc model explanation. The fixed policy moves east second in both worlds.

After test three the chooser has one rule, **Load-sensitive lift / mass ≤ 0.8 / east speed ≥ 10**. The frozen triple retains that rule, **Load-sensitive lift / mass ≤ 0.8**, and **Load-sensitive lift**, leaving **7.6** units of forecast error. The replay advances both policies together and lets you switch which motion is playing. The casebook deliberately picks a high fixed-error example, not an average one.

### Why compare to information gain?

The hand-coded policy represents the *adaptive expert the network imitated*: with a uniform prior over the remaining known laws, it chooses the intervention with the highest expected information gain. It has access to the hypothesis catalog, not the hidden answer. Matching its identification and forecast results tests whether the small network learned to use feedback as effectively as that teacher on these worlds. It does not establish universal optimality, discovery of new laws, or a learned forecasting advantage: the model chooses the tests; the shared predictor averages endpoints over compatible predefined rules.

Reproduce with `python -m scripts.benchmark` followed by `python -m unittest discover -s tests -v`. No retraining is needed (checkpoint SHA-256: `cc7efe351752f6989d352bac08848d08fb53382fe5c0e5f39d10294a9b49eb43`).

## Original five-test study: design and metric

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
