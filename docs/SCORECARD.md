# Self-grade against the 9 criteria (2026-10-25, entry district CA-23)

Scores are my estimates, 1-5, with the evidence. They are not judges' scores. A criterion is only raised when something verifiable changed.

| Criterion | Score | Evidence | What caps it |
|---|---|---|---|
| District (CA-23) | 4 | Default region is CA-23; population 729,052 and jobs 172,039 (San Bernardino County part); five agencies merged (Omnitrans, Metrolink, Victor Valley, Morongo Basin, Mountain Transit); CA-23 road-risk layers; 201 pedestrian/cyclist deaths inside CA-23 (FARS 2019-2023) | Inyo County part and desert stretches not covered; Victor Valley's timetable ends 2026-11-28 |
| Impact | 3.5 | Sourced problem (BLS, county indicators, Urban Institute, PNAS); per-trip verdict, plan B, message to boss, request to the agency, employer view, vanpool, cost | No real users and no measured outcome yet; needs 3-5 real worker or manager tests |
| Novel | 3.5-4 | docs/research/10: no free worker-facing tool found that combines both-direction shift check, health and stop-safety context, employer view and request letter | Close neighbors exist (Shift Atlanta, Denver Reddit analysis, equity dashboards); search was limited |
| Works | 4 | Live site checked; 8 node suites incl. 110 region checks, 18 Python tests, random real-trip checks in 8 regions; English and Spanish | No live delays; Spanish not native-reviewed; no real-phone, Safari, screen-reader or GPS tests |
| ML / biomed | 3.5 | Road-risk model with fixed design (train 2019-21, test 2022-23): CA-23 top 20% of road length captures 87% of later deaths vs 68% for the best baseline (+21 points, interval +12 to +30); tie at top 10%; cited health facts (PNAS, CDC, AAA) | Small test set (122 deaths); model covers only the populated parts of CA-23; not a clinical model |
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
