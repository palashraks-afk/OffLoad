# Self-grade against the 9 criteria (2026-10-25, entry district CA-23)

Scores are my estimates, 1-5, with the evidence. They are not judges' scores. A criterion is only raised when something verifiable changed.

| Criterion | Score | Evidence | What caps it |
|---|---|---|---|
| District (CA-23) | 4 | Default region is CA-23; population 729,052 and jobs 172,039 (San Bernardino County part); five agencies merged (Omnitrans, Metrolink, Victor Valley, Morongo Basin, Mountain Transit); CA-23 road-risk layers; 201 pedestrian/cyclist deaths inside CA-23 (FARS 2019-2023) | Inyo County part and desert stretches not covered; Victor Valley's timetable ends 2026-11-28 |
| Impact | 3.5 | Sourced problem (BLS, county indicators, Urban Institute, PNAS); per-trip verdict, plan B, message to boss, request to the agency, employer view, vanpool, cost | No real users and no measured outcome yet; needs 3-5 real worker or manager tests |
| Novel | 3.5-4 | docs/research/10: no free worker-facing tool found that combines both-direction shift check, health and stop-safety context, employer view and request letter | Close neighbors exist (Shift Atlanta, Denver Reddit analysis, equity dashboards); search was limited |
| Works | 4 | Live site checked; 8 node suites incl. 110 region checks, 18 Python tests, random real-trip checks in 8 regions; English and Spanish | No live delays; Spanish not native-reviewed; no real-phone, Safari, screen-reader or GPS tests |
| ML / biomed | 3.5 | Road-risk model with fixed design (train 2019-21, test 2022-23): CA-23 top 20% of road length captures 87% of later deaths vs 68% for the best baseline (+21 points, interval +12 to +30); tie at top 10%. NEW external validation (prep/risk_external.py, design fixed beforehand): trained on one district, tested on a district it never saw. CA-33 to CA-23: 75% vs 68% at top 20% (+10, interval +2 to +19) but worse at top 10% (52% vs 64%, -11, interval -20 to -2): mixed. CA-23 to CA-33: 83% vs 59% at top 20% (+26, interval +17 to +35), tie at top 10%. Cleveland to CA-23: worse at top 10%, tie at top 20%. Cited health facts (PNAS, CDC, AAA) | Rigor went up, the score did not: the model transfers at the top 20% between the two California districts but is not better than same-district past deaths at the top 10%, and did not transfer from Ohio. Small test sets (122-127 deaths); model covers only populated parts of CA-23 |
| Nationwide | 4 | 9 regions in 8 states (CA x3, OH, FL, CO, GA, WA, MA), no API keys, one pipeline | New cities lack risk layers, hospital and employer lists and fares; DC blocked on a key |
| Mapping | 4 | Route map, hour slider, coverage layers, risk corridors, reach map, pick-on-map; map now draws only in-district stops | Not tested on real devices |
| Challenge fit | 3 | Free, no account, bilingual, built around one district; AI use fully disclosed in docs/AI_USE_LOG.md | Contest rules say AI cannot be the whole entry; the student must state what he wrote himself. Only he can fix this |
| Looks hand-made | 4 | Verdict is the loudest element; supporting facts are plain sections with rules, warnings use a left bar, answers sit in panels with a colored top edge, actions have their own area; hero is one large number with a 24-hour ruler marking 11 PM; shapes and icons are drawn (no glyph or emoji dependence); one spacing scale; contrast checked 4.5:1 or better in both themes at 375 px | Many other pages (About, Employers) still use the earlier card style; the product is still a form plus a result, like any planner |

## What would honestly move the rest above 4
1. Impact: show the app to 3-5 shift workers or a manager, write down what they said, put it in the video. (Student)
2. Challenge fit: a short, true statement of what the student wrote and decided, and what the AI wrote. (Student)
3. ML / biomed: more test years (2024 FARS when released) and the missing desert roads. (Later)
4. Novel: finish the unchecked parts of docs/research/10 (job-site commute filters, gig-shift apps).
5. Looks: vary card styles, a custom hero. (Optional)

## Update, evening of 2026-10-25 (after the map, Employers and About work; live site v35 checked)
| Criterion | Score | Why it moved or did not |
|---|---|---|
| District (CA-23) | 4 | Unchanged. Employers tab now scoped to the San Bernardino County part of CA-23, with in-district job areas |
| Impact | 3.5-4 | Employers tab now answers one decision and offers five actions and a printable brief; still no real users |
| Novel | 3.5 | Research found commute-time features on job sites and Google's job search, so "no commute tools exist" is false; the shift-end, ride-home, request-letter combination is still not found |
| Works | 4 | All tabs, trip map, weather, boss note, 9 regions load on the live site with no console errors; no live delays |
| ML / biomed | 3.5 | External validation mixed (docs/research and About); evidence page now lists verified facts with limits |
| Nationwide | 4 | Unchanged |
| Mapping | 4-4.5 | Trip map now inside the Plan result; Map tab has prompt, legend, lost-since-noon layer, spoken slider |
| Challenge fit | 3 | Student states he wrote some original code and used AI to polish it and for research; his pre-AI code is not in this repo's history and must be located and committed to be checkable |
| Looks hand-made | 4-4.5 | About and Employers rebuilt with different layouts by purpose; Plan result redesigned earlier |
