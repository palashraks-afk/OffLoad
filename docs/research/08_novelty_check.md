# Novelty check (searched 2026-10-25; limited, so it cannot prove "nobody has done this")

What exists, from the searches
| Tool or work | What it does | What it does not do |
|---|---|---|
| Google Maps, Transit, Moovit, Citymapper | Trip planning, live arrivals where the agency publishes them | Not shift-aware; no check of the ride home; no health context; no request to the agency |
| Supershift and other shift calendars | Store a work rota | No bus planning |
| Timeshifter, ShiftCoach | Sleep and circadian advice for shift workers | No transit or route data |
| Conveyal, AllTransit (CNT), Replica | Agency and planner tools that measure job access by transit | Not built for a worker deciding about one shift; no worker-facing request |
| Research: Portland State thesis on non-daytime work and transit; Lansing night-shift study (Streetsblog, 2020); MDPI 2026 night-shift commute study | Show that night-shift workers are underserved by transit | Papers and maps, not a tool a worker can use |
| Public health: Brigham and Women's near-crash study (PNAS 2016), NHTSA drowsy-driving pages | Show drowsy driving after night work; suggest alternative transport | No link to a worker's actual bus options |

Honest conclusion: the pieces exist separately. We did not find a public, worker-facing tool that checks a specific shift against the timetable in both directions, adds the health and stop-safety context, shows the employer view, and drafts the request. That is a combination claim, not an invention claim.

Machine learning (correction to an earlier score note): `shiftready/prep/risk_model.py` trains on 2019-2021 pedestrian and cyclist deaths and tests on 2022-2023 against simple baselines (see `risk_report.json`). Result, stated plainly: at the top 10% of road length the model does not clearly beat "past deaths on the same road" (difference 0.02, interval includes zero); at the top 20% it does (+0.24, interval above zero). It is a modest, validated model, not a breakthrough.
