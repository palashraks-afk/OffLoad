# Shift Ready: method note

**Date:** 2026-10-25. **Author:** Palash Rakshit (student, Redlands High School). **App:** https://palashraks-afk.github.io/OffLoad/ **Code, data, tests:** https://github.com/palashraks-afk/OffLoad
Built with an AI assistant (Claude Code, Anthropic) under the author's direction; every use is logged in `docs/AI_USE_LOG.md`.

## The problem
Many shift jobs start or end when buses stop. About 15 of every 100 US workers usually work evenings, nights or other non-daytime hours (Bureau of Labor Statistics, 2024-25). Trip planners answer "how do I get there now?", not "does the bus fit my 10 PM shift, and can I get home?" Managers have no simple way to see which start times their workers can reach.

## What the tool does
For a worker: a yes / partly / no answer for one real shift, the trip, the last bus home, earlier or later times that work, a backup if a bus is missed, a short note for a boss, and a request to the transit agency written from the numbers it finds. For a manager or city: which start and end times a job area's workers can reach and get home from by bus, where service disappears by hour, what a later route would add, and a one-page brief. English and Spanish; no account.

## Method in plain words
1. **Timetables.** Each agency's published GTFS file is merged into one list of trips (five agencies for the main district; ids are prefixed so agencies cannot be confused). Service days are the weekday, Saturday and Sunday patterns the files mark.
2. **Trip search.** A connection-scan planner runs in the browser. "Arrive by" searches run the same scan backward in time. Walks are limited to 800 m at each end; transfers need one minute.
3. **Coverage.** A place counts as near a bus in an hour if a stop within 400 m (about a 5-minute walk) has a departure in that hour. People are weighted by Census ACS tract population; jobs by LEHD LODES 2022 workplace counts.
4. **Both ways.** For a job area, home locations come from LODES. A worker "gets there" if a trip arrives by the start time and "gets home" if a trip leaves at the shift end, each within 2 hours. The recommended window is the best start time plus every connected start time within 80% of its both-ways share.
5. **Road-risk model (night-trip context only).** Logistic regression on road features, trained on pedestrian and cyclist deaths 2019-21 (NHTSA FARS) and tested on 2022-23 against past-death baselines.

## Checks
- The planner was compared with real scheduled trips: random trips are re-found in both directions (138 per run in the main district; the same style of test on the other regions), and the Python and JavaScript coverage code agree on 720 of 720 spot checks.
- Road-risk model, same district: in the top 20% of road length it captured clearly more of the later deaths than the best past-deaths baseline, with an interval above zero; in the top 10% it tied. The test set is small (about 120 to 130 deaths), so these are estimates.
- On a district it never saw, the result is mixed: better at the top 20% of road length between the two California districts, worse or tied at the top 10% in some pairs, and no better than the baseline when trained in Cleveland. The model transfers only partly.
- Exact figures and intervals, with the design fixed before running, are in the app's About page ("How we check ourselves") and in `shiftready/web/data/<region>/risk_report.json` and `risk_external.json`. They are updated when the model is rebuilt, so this note does not repeat them.

## Limits
Timetables only: no delays, detours, strikes or holiday changes (the app links to the agency's live alerts). The main district's numbers cover only the San Bernardino County part of California's 23rd District. Worker home areas are tract-level; per-employer answers need data not available here. No study found shows that better bus service creates jobs; the health facts come from published studies listed in the app's About page with their limits. The Spanish text has not been reviewed by a native speaker. Open tables: `shiftready/web/data/open/` (CC BY 4.0).

## How to cite
Rakshit, P. (2026). *Shift Ready: checking a work shift against the bus and train timetable* [software and method note]. https://palashraks-afk.github.io/OffLoad/ (accessed YYYY-MM-DD).
