# Second road-risk model and calibration check: plan written BEFORE running (2026-10-25)

This file is committed before any new model is run, so the adoption rule cannot be moved after seeing results. Existing results I have already seen: the current road-risk report for CA-23 and CA-33 (`web/data/<id>/risk_report.json`) and the external validation (`risk_external.json`). Nothing below uses the new second model's test numbers, because they do not exist yet.

## What is already true (so the comparison is honest)
`prep/risk_model.py` already compares two candidates on the **training years only** (5-fold cross-validated average precision) and displays whichever wins: a logistic model and an unweighted boosted-trees model (depth 4). Today CA-33 displays the logistic model and **CA-23 displays boosted trees, chosen by a tie** (average precision 0.01979 against 0.01975). The external validation (`risk_external.py`) uses the logistic model in both directions. So "the logistic model" and "the displayed model" are not the same thing for CA-23. The rule below compares against the **displayed model**, and the logistic model is reported next to it.

## Step 1: more roads (data change, not a model choice)
Extend the OpenStreetMap road download for CA-23 with extra boxes covering Cajon Pass, north of Victorville toward Helendale, east of Apple Valley, east of Barstow (Daggett and Yermo), the Yucaipa to Big Bear to Morongo link, and the Landers and Johnson Valley side. Re-run the model for CA-23. Report before and after: deaths matched to a road (before: 246 of 535 county deaths in the model's box), segments, and the headline numbers. If any published number changes, every place that quotes it is updated and the AI log says so. Nothing in the model design changes.

## Step 2: the second model (fixed now)
- **Model M2:** `HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=150, min_samples_leaf=50, l2_regularization=2.0, class_weight="balanced", random_state=0)`. Same 16 road, stop and exposure features plus the six road-type indicators as `risk_model.design()`. Label: a surface-street segment with at least one pedestrian or cyclist death in 2019-2021. Trained on 2019-2021 only. **No tuning of any setting after looking at 2022-2023 results.**
- **Comparator:** the model `risk_model.py` displays for that region at the time of the run (chosen by training-year cross-validation).
- **Test:** the 2022-2023 deaths, same capture metric (share of test deaths on the top 10% and top 20% of road length, averaged over random tie-breaks), paired bootstrap over the test deaths (2,000 resamples) for the difference M2 minus comparator.
- **Adoption rule, per region:** M2 becomes the displayed model for that region **only if both** hold:
  1. at the top 20% of road length, M2 beats the comparator by at least **+3 percentage points** and the 95% interval of the difference is entirely above zero;
  2. at the top 10%, M2's capture is **not lower** than the comparator's (point difference of zero or more).
  Otherwise it is reported as **"tried, not adopted."**
- **Regions:** CA-23 and CA-33. Both are reported whatever the outcome. The decision is per region.
- If adopted for a region, `risk_model.py` is re-run with M2 as the displayed model for that region and every quoted number is updated.
- The result is also shown next to the logistic model's numbers so a reader can see all three.

## Step 3: calibration check (fixed now)
- Use the displayed model trained on 2019-2021. Score every surface segment. Order segments by score and cut them into **ten groups of equal road length** (deciles of the road network, to match the capture metric).
- For each group report: road length, 2022-2023 deaths, deaths per 100 km, and the share of all test deaths.
- Summaries: the Spearman correlation between decile number and deaths per 100 km, and the number of adjacent decile pairs where the rate goes the wrong way.
- **This checks the ranking, not absolute probabilities.** The scores come from a class-balanced model, so they are not probabilities and no claim is made about absolute risk.
- No pass or fail bar; it is shown either way, with a one-sentence reading guide.

## Time box
About 120 minutes. If the extra OSM download fails, Steps 2 and 3 run on the existing road set and that is stated.
