# Handoff: everything decided and learned so far (as of 2026-10-18)

Read `CLAUDE.md` first (role and rules). This file is the full context.

## 0. STATUS UPDATE (2026-10-25): the project is chosen and built: Shift Ready, entered in CA-23
Everything below this section was written during the search for a project (2026-10-18) and is kept as research. The current app is `shiftready/`; the entry is for California's 23rd District (the student's school district); CA-33, Cleveland, Miami and Sacramento remain as extra regions. See `CLAUDE.md` and `docs/ADD_REGIONS.md`.

## 1. Status
- Deadline: Mon 2026-10-26 12:00 pm ET. Plan to submit Sun 2026-10-25. From 2026-10-18 that is 8 days.
- The student rejected the first project (OffloadWatch, AI-written, ineligible), heat ideas, and alarm/warning products.
- Leading candidate (NOT chosen): pedestrian and cyclist safety in CA-33, usable by regular people, with a one-page brief for a city. He does not need the app to serve everyone; he needs it to make sense to ordinary people.
- Not yet decided: the project itself, the app's name, his true personal story, his district/eligibility confirmation, team (solo or up to 4).

## 2. His 8 scoring categories (what a 4 and a 5 need)
| Category | A 4 needs | A 5 needs |
|---|---|---|
| District | Data inside the CA-33 boundary + named local places | A local decision-maker can act on a fact residents recognize |
| Impact | A specific user with a real decision or funding | A real reply or pilot from an outside party (cannot be guaranteed) |
| Novel | A combination verified absent as a free tool | A new finding |
| Works | Runs without a server, tested, deployed, a 3-minute demo path | 3 outside people tried it |
| ML / biomed | Real model tested on later periods against a baseline, explainable, public-health link | Plus a second region |
| Nationwide | Runs on another region by changing one input, shown on one | Three regions |
| Mapping | Interactive map with boundary, layers, filters | Spatial analysis beyond markers (routing, risk surface) |
| Challenge fit | One-sentence problem, true story, polished mobile UI, Spanish, accessible | Local event tie |
Realistic goal: 4 in each (32 or more of 40). Impact and Works reach 5 only with outside actions.
The contest's own criteria: idea (creativity, originality), implementation (UX, design), demonstrated coding excellence (his own), and a working app.

## 3. The one-sentence problem for the LEADING CANDIDATE (the video requires one sentence for whichever project he picks)
"In San Bernardino County 547 people walking or biking were killed from 2019 to 2023 (217 inside CA-33, rising from 33 to 59 a year), and neither residents nor cities can easily see where the next death is most likely or which proven fix to fund first."

## 4. Verified numbers (computed from primary data; he must re-run and confirm)
Source: NHTSA FARS 2019-2023, fatal crashes only. See `docs/research/04_FARS_PEDESTRIAN_FINDINGS.md` for full tables.
- California pedestrian+cyclist deaths per year: 1,154 / 1,149 / 1,312 / 1,394 / 1,300 (2019-2023).
- San Bernardino County: 547 deaths = 8.7% of California's 6,309 (the county is about 5.4% of the state population); pedestrians 81/80/97/106/123 per year.
- Inside CA-33 (Census 119th Congress boundary): **217 deaths** (191 pedestrians, 26 cyclists); per year 33/31/38/56/59. By city: San Bernardino 92, Rialto 27, Colton 22, Redlands 17, Highland 15, Fontana 13, unincorporated 23. Worst roads: I-215, I-10, SR-210, Riverside Ave, Baseline St, Highland Ave, Cajon Blvd, Waterman Ave. About 25-30% of deaths are on interstates/state routes: treat freeways as a separate category from surface streets.
- Darkness: 88.0% of CA-33 deaths in the dark vs 73.0% US, 76.2% California. "Dark - Not Lighted": 30.9% CA-33, 37.3% county, 33.8% US. Reading: lights alone are not the answer; many deaths occur on lit streets.
- **Backtest (San Bernardino County, train 2019-2021, test 2022-2023):** the top 10% of 400 m cells by past deaths capture only **3.0%** of later deaths; only 11.6% of later deaths occurred in a cell that already had a death. Top 10 road names capture 23.2%, top 40 capture 38.6%. This is the statistical justification for a model that scores places without a previous death, and it is the baseline to beat.
- Funding context (verify dates and amounts): Caltrans HSIP Cycle 13 about $370M, deadline reportedly 2026-09-14 (likely closed); Cycle 12 had 330 applications requesting $398.8M; applications need a benefit-cost ratio. SS4A: Colton and Rialto got action plan grants (FY22); Fontana got $19.8M for Foothill Blvd (FY23). San Bernardino city had over 1,000 streetlights out in 2024 (copper theft) with $1.5M + $250k to upgrade about 500.
- FHWA crash-reduction values ("up to", from specific studies; get exact CMF IDs from the FHWA CMF Clearinghouse before quoting): intersection lighting up to 42% fewer nighttime pedestrian injury crashes; crosswalk visibility up to 40%; pedestrian hybrid beacon 55-69% (sources differ); RRFB up to 47%; refuge islands up to 56%; leading pedestrian interval up to 13%.

## 5. Novelty claims that are safe to make (and only these)
1. The computed local backtest statistic above.
2. A model that scores places with no recorded death yet from road features, tested on later years against the past-deaths baseline, then maps each high-risk place to a proven fix with an expected-crashes-prevented range and a ranked one-page brief. I found no free tool doing all of that. Existing: NHAT (Volpe, free national high-injury-network maps), FHWA Systemic Safety Project Selection Tool (spreadsheet), commercial Roadway Insights, SCAG HIN; past Challenge winners in this lane: BikeBetter (OR-1 2022), Student Safe Way (CA-47 2024), RoadWatch (NJ-6 2025), Safe-Driver (MI-6 2023).
3. Works for any US city (FARS + OpenStreetMap are national), shown on a second city.
4. A documented data gap: no free, complete street-light inventory exists. I measured central San Bernardino in OpenStreetMap: 801 mapped lamps, and only 11 of 2,979 road segments (0.4%) carry a `lit` tag. So lighting cannot be a model feature; say that honestly. Mapillary detections need a token and US coverage is unverified.
Novelty is realistically 3-4, not 5. Do not oversell.

## 6. What the resident-facing app should do (user-friendly, regular people)
Design lessons from earlier work (the student's own advice): one typeface, one accent color, greys elsewhere; real empty states; one animation (a fade); mobile-first; plain words, few words; Spanish; accessible (keyboard, screen reader, color never the only signal).
Suggested MVP (cut from the bottom):
1. **Map of every death** in CA-33 (2019-2023) with district outline, filters (walking/biking, day/night, road type), plain legend.
2. **"How risky is my street/crossing?"** type an address or tap the map: a plain-language score and the top reasons (for example "fast four-lane road, no signal, many past deaths nearby").
3. **Safer walk help:** pick start/end and see a walking route that avoids the highest-risk crossings (routing via OpenStreetMap routing server; show it as information, not a guarantee). Night-shift workers (warehouses are a big local employer) are a specific user: let them pick the time of day.
4. **Spanish toggle.**
5. **City brief (one printable page):** ranked high-risk places with the matched fix and expected-crashes-prevented range, plus the method and limits.
6. Stretch: second city loaded; "report a hazard" that opens a prefilled message to the city (no server).
Do NOT build: alarms, warnings, anything that says a place is "safe". Say "lower risk" and "higher risk", with limits.

## 7. ML plan (non-circular, honest)
- Unit: road segments or intersections from OpenStreetMap (osmnx) in the study area.
- Label: whether a pedestrian/cyclist death occurred there in the test years (2022-2023), from FARS coordinates snapped to the nearest segment.
- Features that exist nationally: road class, number of lanes, speed limit (`maxspeed`, patchy), signals, marked crossings, intersection density, bus stops, nearby schools/commercial land use (OSM), freeway vs surface. NOT lighting (data gap). Optional exposure proxies from census (section 8).
- Split by time: train on 2019-2021 deaths, test on 2022-2023. Never random.
- Baselines: (a) past deaths on the same road/corridor; (b) past deaths in the same 400 m cell. Report top-k capture (what share of later deaths fall in the top 5/10/20% of ranked places) and PR-AUC; add calibration if time.
- Explain: simple model first (logistic regression), then gradient boosting only if it helps; show coefficients/feature importance in plain words.
- If the model does not beat the corridor baseline, say so on screen. That is acceptable.
- Second city: repeat with another Californian city (FARS covers all states) to show it generalizes.

## 8. Exposure idea (started, not finished)
Deaths per person walking differ from raw death counts. Plan: for each census tract in CA-33, deaths 2019-2023 divided by commuters who walk, bike, or take the bus, and the share of workers who leave home 12:00-4:59 a.m. or 4:00-11:59 p.m. (night/evening shifts). Hypothesis: night-shift tracts see more night deaths; the per-walker rate shows where walking is deadliest per person.
- ACS variables: B08301_011E (bus), B08301_018E (bicycle), B08301_019E (walked), B08301_001E (total commuters); B08011_001E (total), B08011_002E (leave 12:00-4:59 a.m.), B08011_015E (leave 4:00-11:59 p.m.); B01003_001E (population).
- The official Census API now requires a free key (the student signs up at https://api.census.gov/data/key_signup.html himself). Without a key, Census Reporter works if you send a project-specific User-Agent: `https://api.censusreporter.org/1.0/data/show/latest?table_ids=B08301,B08011,B01003&geo_ids=140|05000US06071` (returned 466 tract rows, release ACS 2024 5-year). A generic User-Agent is blocked.
- Tract shapes: https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_06_tract_500k.zip (join to deaths by point-in-polygon).
- Caveat: ACS gives commute mode only for commuters; it undercounts non-work walking. Say so.

## 9. Data sources and fetch notes
- FARS: `https://static.nhtsa.gov/nhtsa/downloads/FARS/<year>/National/FARS<year>NationalCSV.zip` (2019-2023; about 30 MB each). Pitfalls: folder/filename layout differs by year (`accident.csv` vs `FARS2022NationalCSV/accident.csv`); 2021-2022 first column has a byte-order mark; files are latin-1; `COUNTY` exists in both tables so merge on `ST_CASE`+`STATE`; person type 5 = pedestrian, 6 = bicyclist; injury severity 4 = fatal; San Bernardino County = state 6, county 71. The NHTSA CrashAPI blocks scripts; use the zip files.
- CA-33 boundary: Census 119th Congress cartographic boundary `https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_cd119_500k.zip` (state FIPS 06, district 33). Note the 2025 California redistricting only affects 2026 elections onward; use the 119th boundary for current representation.
- OpenStreetMap: the public Overpass server rate-limits (HTTP 429). Use `osmnx` for small areas or a Geofabrik California extract; be gentle.
- Routing: `https://routing.openstreetmap.de/routed-car/route/v1/driving/...` (car). Foot/bike profiles exist at `routed-foot` and `routed-bike`; the car profile is the reliable one. ZIP centers can sit off-road and give odd results.
- Funding and fixes: FHWA Proven Safety Countermeasures and CMF Clearinghouse; Caltrans HSIP page; USDOT SS4A. Verify every date and amount yourself.
- Other candidate data (not chosen): FRA rail incident data (data.transportation.gov; San Bernardino County ranked 3rd nationally for trespasser casualties 2016-2019 per the FRA), HHS emPOWER (power-dependent equipment), CDC PLACES, CDPH kindergarten vaccination reports. See `docs/research/03_PROBLEM_CANDIDATES.md` and `06_IDEA_SCREENING.md`.

## 10. Eight-day plan TEMPLATE (written for the pedestrian candidate; adapt it to whatever he chooses; the student writes the code; the assistant coaches)
- **Day 1 (Sun 10/18):** download FARS 2019-2023; filter to California pedestrian/cyclist deaths; find CA-33 with the boundary; draw his first map. Re-compute the 217 and the yearly counts himself.
- **Day 2 (Mon 10/19):** reproduce the 3% backtest; load OSM road features for San Bernardino and Colton/Rialto.
- **Day 3 (Tue 10/20):** snap deaths to segments; build the baseline; first model; honest comparison.
- **Day 4 (Wed 10/21):** finish the model and explanations; second city run.
- **Day 5 (Thu 10/22):** fix matching and the brief; start the resident UI (map, "how risky is my street", plain words).
- **Day 6 (Fri 10/23):** safer-walk routing, Spanish, accessibility, mobile polish. Freeze features at night.
- **Day 7 (Sat 10/24):** test with 3 people, fix the top problems, deploy (GitHub Pages), record the video, write the answers, save a draft submission.
- **Day 8 (Sun 10/25):** final check of the live link and video, submit. Monday morning is buffer only.
Cut order if behind: second city, hazard report, routing, Spanish polish, brief (keep map + risk score + honest model result).

## 11. Submission checklist (from the rules)
- Register on the student portal; eligibility quiz; parent/guardian contact; 9-digit ZIP and district for home and school. Enter in one district only (home or school). Confirm CA-33 is participating.
- Demonstration video, **1-3 minutes**, public on YouTube or Vimeo, containing: participant names, app name, the purpose in **one sentence**, the target audience, the tools and languages used, and the app working. Over-length videos may be penalized.
- Written answers (similar to: what problem and for whom, how it was built and with what tools, what was hardest, what you learned, how it could grow). Keep claims modest and match the app.
- **AI disclosure** from `docs/AI_USE_LOG.md`; list of libraries and data sources.
- Judges may ask for source access: keep the repo ready and be able to explain every part.

## 12. What not to claim
- "Reduces crashes / saves lives / reduces delays." Use "expected crashes prevented, based on published factors, with a range."
- "No tool exists." Say what is new (section 5).
- Anything about lighting being modeled. It is not.
- Statistics he did not compute or verify. Death counts are not risk per walker unless he computes exposure.
- A personal story he did not live.

## 13. Open questions only the student can answer
1. His true personal reason (the opening of the video).
2. Which district he enters (home vs school; confirm participation).
3. Solo or team.
4. App name.
5. Spanish reviewer (a trusted native speaker).

## 14. Housekeeping from the earlier work
- OffloadWatch code is in `site/` and `pipeline/` (26 tests pass; `python pipeline/run.py` rebuilds; GitHub Pages workflow exists but Pages was never enabled). It is reference only.
- A scheduled data-update workflow for OffloadWatch exists (`.github/workflows/update-data.yml`); consider disabling it so it does not open issues for a project that is not being submitted.
- The earlier session's large temporary downloads were deleted; re-fetch with the commands above.
