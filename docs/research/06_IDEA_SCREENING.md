# Idea screening against the student's criteria (2026-10-18, 8 days to the deadline)

Goal: a CA-33 app the student codes himself, solving a real problem backed by data he verified, scoring at least 4 in each of his 8 categories, finished by Sunday 2026-10-25 (hard deadline Monday 2026-10-26 12:00 ET).

Hard rules: student writes the core code (AI only for disclosed supporting tasks); real local problem with primary-data statistics; no heat, no alarm/warning products, not OffloadWatch; non-circular ML with an honest baseline; free public data; one-sentence problem and one specific user; no medical advice or hospital ranking.

## What the 4 and 5 require (my definitions)
District 4: data inside the CA-33 boundary + named local places; 5: a local decision-maker can act on a fact residents recognize. Impact 4: specific user with a real decision/funding; 5: needs a real outside reply or pilot. Novel 4: a combination I verified no free tool offers; 5: a new finding. Works 4: runs without a server, tested, deployed, 3-minute demo path; 5: 3 outside users tried it. ML/biomed 4: real model tested on later periods against a baseline, explainable, public-health link; 5: second region validation. Nationwide 4: runs on another region by changing one input; 5: three regions. Mapping 4: interactive map with boundary, layers, filters; 5: spatial analysis beyond markers. Fit 4: one-sentence problem, true story, polished mobile UI, Spanish, accessible; 5: local event tie.

## Screen (my estimates, 1-5; novelty judged from my web searches, which are limited)
| Idea | Dist | Imp | Nov | Works | ML | Nat | Map | Fit | Total | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Pedestrian/cyclist systemic risk + proven-fix brief (roads) | 5 | 4 | 3-4 | 4 | 4 | 5 | 5 | 4 | 34 | FARS 217 deaths in CA-33; backtest shows spot hotspots capture 3%. NHAT (free HIN tool) and BikeBetter exist; differentiators below |
| Care-gap / clinic finder | 5 | 4 | 2 | 4 | 3 | 5 | 5 | 4 | 32 | resource finder already won NY-3; PLACES circularity risk |
| Time-aware bus access to clinics | 4 | 4 | 4 | 3 | 3 | 4 | 5 | 4 | 31 | studies exist (Lisbon, Columbus); clinic-hours data not available nationwide |
| Rail crossing / trespass risk | 4 | 3 | 4 | 3 | 3 | 5 | 4 | 3 | 29 | San Bernardino County 3rd nationally for trespasser casualties 2016-2019 (FRA); FRA/Volpe prototypes exist; crossing incidents about 10-20 a year in the county; main Form 57 file has no coordinates (join to crossing inventory) |
| Kindergarten vaccination map + forecast | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 28 | state formats differ |
| AED deserts / placement | 3 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 27 | research and OpenAEDMap exist; OSM AED coverage uneven |
| Street-light gap model | 4 | 3 | 4 | 2 | 3 | 3 | 4 | 3 | 26 | no complete lighting inventory exists: central San Bernardino has 801 mapped lamps and only 11 of 2,979 road segments (0.4%) with a lit tag; Mapillary needs a token and US coverage unverified |
| Overdose / naloxone | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 3 | 26 | sensitive, improving trend |
| Pharmacy deserts | 2 | 3 | 2 | 3 | 2 | 5 | 4 | 3 | 24 | no local count |
| AI/ML outage or heat tools | - | - | - | - | - | - | - | - | out | student rejected |

## Winner: pedestrian/cyclist systemic risk + proven-fix brief
Verified novelty claims (what to say, and only this):
1. A computed local statistic: in San Bernardino County, using only 2019-2021 deaths, the top 10% of 400 m cells captured 3.0% of 2022-2023 deaths; the top 10 roads captured 23.2% (docs/research/04).
2. A model that scores places with no recorded death yet from road features, tested on later years against that baseline, then matches proven fixes with benefit ranges and produces a ranked one-page brief. I found no free tool doing all of that (NHAT draws high-injury networks; FHWA's systemic tool is a spreadsheet).
3. Runs for any US city from national data (FARS + OpenStreetMap), shown on a second city.
4. A documented data gap: no free, complete street-light inventory exists (see lighting numbers above). Report this honestly instead of pretending to model lighting.

What earns each 4 (concrete deliverables)
- District 4-5: CA-33 boundary map, 217 deaths, named roads, city decision-makers.
- Impact 4: one-page brief per city; HSIP/SS4A are the funding paths (verify cycle dates).
- Novel 3-4: claims above.
- Works 4: static site, tested, deployed by 10/24.
- ML 4: temporal holdout vs corridor baseline, feature explanations, report a negative result honestly.
- Nationwide 4: second city loaded by changing one input.
- Mapping 5: all deaths, risk surface, boundary, filters.
- Fit 4: one sentence, true story from the student, Spanish, mobile.

Caps: Impact and Works can only reach 5 with outside actions.
