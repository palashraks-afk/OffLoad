# Pedestrian and cyclist deaths: findings computed from primary federal data

Source: NHTSA FARS national CSV bundles for 2019-2023 (https://static.nhtsa.gov/nhtsa/downloads/FARS/<year>/National/FARS<year>NationalCSV.zip). Fatal crashes only (injuries are not in FARS). Computed 2026-10-12 by joining `accident.csv` and `person.csv` on `ST_CASE`, keeping person type 5 (pedestrian) or 6 (bicyclist) with injury severity 4 (fatal). District membership = point-in-polygon against the Census 119th Congress CA-33 boundary (`cb_2024_us_cd119_500k`). The student should re-run this from scratch and check every number.

Pitfalls found while doing it (useful for the student): file names and folder layout differ by year; 2021-2022 files have a byte-order mark on the first column name; files are latin-1 encoded; `COUNTY` exists in both tables so merge on `ST_CASE`+`STATE`.

## Results
| Measure | Value |
|---|---|
| California pedestrian + cyclist deaths per year 2019-2023 | 1,154 / 1,149 / 1,312 / 1,394 / 1,300 |
| San Bernardino County pedestrian deaths per year 2019-2023 | 81 / 80 / 97 / 106 / 123 |
| San Bernardino County cyclist deaths per year | 7 / 6 / 9 / 20 / 18 |
| San Bernardino County total 2019-2023 | 547 = 8.7% of California's 6,309 (county is about 5.4% of California's population) |
| Approx. 2023 rate per 100,000 (county 141 deaths vs California 1,300), population approximate | about 6.5 vs about 3.3 |
| **Inside CA-33 (2019-2023)** | **217 deaths (191 pedestrians, 26 cyclists); per year 33 / 31 / 38 / 56 / 59** |
| Cities inside CA-33 (FARS city field) | San Bernardino 92, Rialto 27, Colton 22, Redlands 17, Highland 15, Fontana 13 (+23 unincorporated) |
| Worst roads inside CA-33 | I-215 (23), I-10 (19), SR-210 (12), Riverside Ave (9), Baseline St (7), Highland Ave, Cajon Blvd, Waterman Ave |
| Share of deaths in darkness | US 73.0%, California 76.2%, San Bernardino County 85.9%, CA-33 88.0% |
| Share "Dark - Not Lighted" | US 33.8%, California 27.3%, San Bernardino County 37.3%, CA-33 30.9% |
| San Bernardino County by road class | minor arterial 172, principal arterials about 160, interstate 99 |

## Does a hotspot map predict where the next deaths happen? (San Bernardino County backtest)
Train on 2019-2021 deaths (280), test on 2022-2023 deaths (267).
- 400 m grid cells: the top 10% of cells by past deaths captured **3.0%** of the later deaths; only **11.6%** of later deaths happened in a cell that already had a death.
- Road corridors: the top 10 roads by past deaths captured **23.2%** of later deaths, the top 40 captured **38.6%**. About 30% of later deaths were on interstates or state routes.
- Reading: spot-level hotspots are weak predictors; corridor-level history is moderate. This is the statistical reason a systemic (road-feature) model is worth testing, and it gives the baseline any model must beat. Caveats: one county, one split, simple grid.

## Related facts (other sources)
- FHWA Proven Safety Countermeasures: intersection lighting can reduce nighttime pedestrian injury crashes up to about 42%; crosswalk visibility enhancements up to 40%; pedestrian hybrid beacons 55-69% (sources differ); rectangular rapid flashing beacons up to 47%; medians and refuge islands up to 56%; leading pedestrian intervals up to 13% (conservative). "Up to" values from specific studies; use the CMF Clearinghouse for planning.
- San Bernardino city: over 1,000 streetlights out in 2024 from copper theft (NBC LA); $1.5 million plus a $250,000 DOE grant to upgrade about 500 lights; 96 new lights installed in two north-side neighborhoods (Dec 2024).
- Funding: Caltrans HSIP Cycle 13 about $370 million (application deadline reportedly Sept 14, 2026, so likely closed; check), applications must use the HSIP Analyzer benefit-cost ratio; Cycle 12 had 330 applications requesting $398.8 million. SS4A: Colton and Rialto received action plan grants (FY22); Fontana received $19.8 million for Foothill Blvd (FY23). Verify amounts against official DOT lists.
- Existing tools (novelty check): Volpe/Santos Family Foundation National High-Injury Network Analysis Tool (NHAT, free, nationwide), FHWA Systemic Safety Project Selection Tool, commercial Roadway Insights, SCAG HIN. Past Challenge winners in this lane: BikeBetter (OR-1 2022, bicycle crash heatmap + routes), Student Safe Way (CA-47 2024), RoadWatch (NJ-6 2025), Safe-Driver (MI-6 2023).
