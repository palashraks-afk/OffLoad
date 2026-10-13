# Candidate real problems for CA-33 (San Bernardino County), with evidence quality

Evidence quality is marked: **strong** (official data), **medium** (reputable secondary source), **weak** (unsourced or law-firm page). Nothing here was verified with primary data unless it says "computed".

## 1. Not enough primary care doctors (care access)
- Inland Empire: 42 primary care physicians per 100,000 people vs 60 for California (CHCF via CalMatters, 2025). Medium. https://calmatters.org/health/2025/06/inland-empire-teaching-hospital/
- About 229 vs 358 total physicians per 100,000 (CHCF via HSJ Chronicle, 2026). Medium. https://hsjchronicle.com/inland-empire-healthcare-medi-cal-doctor-shortage-2026/
- ~1.37 million people in Riverside and San Bernardino counties live in a primary care shortage area (CHCF 2020). Medium. https://www.chcf.org/wp-content/uploads/2020/07/ShortchangedHealthWorkforceGapsRiversideSanBernardino.pdf
- Data: HRSA shortage areas (https://data.hrsa.gov/tools/shortage-area/hpsa-find), CDC PLACES tract-level (https://catalog.data.gov/dataset/places-census-tract-data-gis-friendly-format-2025-release-4c3af). Caution: do not train on PLACES's own modeled estimates (circular).
- Crowded lane: a resource finder (Healthbridge US) already won NY-3.

## 2. Pedestrian and cyclist deaths
- San Bernardino County ranked 2nd in California for pedestrian + cyclist deaths 2020-2024 (564; 2024 preliminary), per SF Chronicle analysis. Medium. https://www.sfchronicle.com/projects/2026/pedestrian-fatalities-sf-california/
- 121 pedestrian deaths in 2023 (law-firm page citing SWITRS). Weak. Verify with TIMS/FARS.
- OTS county profile (2022): 677 pedestrians killed and injured. https://www.ots.ca.gov/rankings/san-bernardino-county-2022
- Data: NHTSA FARS (national, every fatal crash with coordinates), UC Berkeley TIMS/SWITRS (California, includes injuries), OpenStreetMap roads.

## 3. Kindergarten vaccination slipping
- San Bernardino County: 90.9% with all required immunizations in 2024-25, vs 92.1% in 2022-23. Strong (CDPH reports). https://www.cdph.ca.gov/Programs/CID/DCDC/CDPH%20Document%20Library/Immunization/2024-25KindergartenSummaryReport.pdf
- Statewide MMR 96.1% (2024-25). County MMR-only figure and the number of schools under 95% not confirmed.
- School-level data published by CDPH; other states differ in format (weak nationwide).

## 4. Fentanyl overdoses
- County fentanyl deaths 6 (2016) -> 436 (2023) -> 278 (2024) (county indicators site); 14 teens since 2021; overdose rate 19.8 per 100,000 (2023). Medium. https://indicators.sbcounty.gov/wellness/substance-abuse/
- Sensitive; clinician review needed; trend is improving.

## 5. Pharmacy deserts (weak locally)
- 17.7% of Americans live in pharmacy deserts (JAMA 2025). Rite Aid closed all stores by Oct 2025. No San Bernardino County closure count found.

## 6. People dependent on electric medical equipment (power outages)
- Computed from the HHS emPOWER Historical Dataset (Oct 2026): San Bernardino County 17,283 Medicare beneficiaries rely on power-dependent devices (5,656 home oxygen, 836 facility dialysis), 49.7 per 1,000 beneficiaries vs 34.8 California and 43.7 US. About 3,900 in 15 ZIPs whose centers fall inside CA-33 (approximate). Counts cover Medicare beneficiaries only (undercount). Data: https://empowerprogram.hhs.gov/2026_HHSemPOWERMapHistoricalDataset.xlsx
- Outages of 8+ hours were associated with more cardiovascular and respiratory hospitalizations among 23 million Medicare beneficiaries (2018 case-crossover). Strong. https://pubmed.ncbi.nlm.nih.gov/41818642/
- Outage history: DOE EAGLE-I county data, 15-minute, 2014-2025 (https://smc-datachallenge.ornl.gov/eagle/).
- The student rejected an alarm/early-warning product, so this is parked.

## 7. Heat (rejected by the student)
- Bus-stop heat research exists (Houston, Austin, UCLA, a 2025 Cal Poly Pomona thesis on southwest San Bernardino County). Rejected as a direction.

## 8. Ambulance offload delays (OffloadWatch, already built by AI; not eligible as the student's work)
- Feb 2026: statewide at least 3,636 ambulance-hours lost; Community Hospital of San Bernardino 90th percentile 47 min vs 25 min target. County dashboards already exist (San Diego, Orange, Alameda, Sacramento). Forecast did not beat the baseline.

## Other local facts found
- Perchlorate contamination in the Rialto-Colton groundwater basin; new treatment partnership announced Sept 2025 (no usable statistic found).
- County health officer issued an extreme-heat advisory in March 2026.
- Child food insecurity 17.3% in San Bernardino County (CA 16.9%, US 19.2%) per Feeding America via Kidsdata (2023). Not worse than the US.
