# Instructions for any AI assistant working in this repository

Read this file first, then `docs/HANDOFF.md`. This replaces any earlier plan you may find elsewhere in the repo.

## STATUS (updated 2026-10-25): THE PROJECT IS CHOSEN AND BUILT. IT IS **SHIFT READY** (app in `shiftready/`, live at https://palashraks-afk.github.io/ShiftReady/).
- The entry is for **California's 23rd District (CA-23)**: the student's school, Redlands High School, is in CA-23. The app opens on `ca23` by default. `ca33` (his home district), Cleveland, Miami and Sacramento stay in the region switcher as extra regions.
- `ca23` covers the San Bernardino County part of the district only (Omnitrans, Metrolink, Victor Valley Transit, Morongo Basin Transit, Mountain Transit). It is built by the same pipeline as every region; see `docs/ADD_REGIONS.md`.
- Read `shiftready/README.md`, `docs/AI_USE_LOG.md` and `docs/QA_REPORT_2026-10-25.md` before changing anything. Keep the AI-use disclosure exact and never invent the student's personal story or present one region's numbers as another's.
- OffloadWatch (the older project below) is abandoned and ineligible. The sections further down describe the earlier search for a project and are history, not instructions.

## Who and what
- **Student:** Palash Rakshit, lives in California's 33rd Congressional District (Rep. Pete Aguilar; San Bernardino, Fontana, Rialto, Colton, Highland, Grand Terrace, north Redlands).
- **Contest:** 2026 Congressional App Challenge. **Deadline Monday 2026-10-26, 12:00 pm Eastern.** Target: submit by **Sunday 2026-10-25**. Time is short, so work fast and decide quickly.
- **How he talks:** casual, fast, many typos. Read intent through the typos. Short, plain answers. Don't lecture. Don't ask a question you can answer yourself. Say plainly when something is unverified or won't work.

## His goal, his criteria, and who it is for (his words, kept faithful)
**Goal:** find the idea that reaches the **highest overall score** on all his categories, with **at least a 4 in every category** (a secure 4-5), a **real problem with statistical evidence**, **real impact** and a solution that actually solves it. He wants a "5 idea" where possible, but a 4 everywhere is the floor.
**Novel means nobody has made it that way.** Judge novelty by searching for existing versions and say honestly what was and wasn't found. Don't inflate it; if the honest novelty is 3-4, say so and say exactly which parts are new. He asked for a **completely novel** idea.
**His 8 categories:** District (specific to CA-33), Impact, Novel, Works (by Oct 25), ML/biomed, Nationwide, Mapping, Challenge fit. Requirements for a 4 and a 5 are in `docs/HANDOFF.md` section 2.
**Who it should target:** it must be **helpful and make sense to regular people** (citizens, workers such as night-shift workers, ordinary residents) with a **user-friendly experience**: not just for officials. It does **not** have to be for everyone; it needs a clear target group. A city/official may get something useful too, but the everyday person is the main user.
**Not wanted:** heat ideas, alarm or early-warning systems, OffloadWatch, "basic" ideas, and anything that is only an official dashboard.
**Too many words is a complaint:** keep screens short, plain, and friendly. Simple by default.

## How to find the idea (do this, in this order)
1. Read `docs/research/` (rules, past winners, problem candidates with evidence, screening). Do not redo what is already done.
2. Generate a **wide** list (20+) of candidate problems across health, mobility/safety, civic services, education, jobs/workers, language access, housing, food, environment (not heat/alarms), finance/consumer. Prefer problems tied to CA-33 life (San Bernardino/Fontana/Rialto/Colton/Highland/Redlands: warehouses and logistics work, large Spanish-speaking population, rail and freeways, hospitals, schools).
3. Screen each against the **hard rules**: a student can build the core himself in about 7 days; real local problem with statistics from free public data; not circular ML; one-sentence problem and one specific user; no medical advice; not rejected.
4. For the finalists (3-5): (a) **search for existing versions** and list what exists; (b) **verify the data is actually downloadable** and compute at least one primary statistic for CA-33 yourself; (c) check feasibility in the time left; (d) score the 8 categories honestly with the evidence.
5. Present the **top 3** to the student with scores, the one-sentence problem, the specific user, what a regular person would do with the app, the strongest evidence number, and the biggest risk. Let him choose. If none reaches a 4 in every category, say which category fails and why.
6. Only then plan the build (see `docs/HANDOFF.md` sections 10-11 for a plan template; it was written for the pedestrian candidate, adapt it).

## The rule that overrides everything (read it, it protects him)
The official 2026 rules (https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf) say:
- the app must be "original and solely created by the contestant. All coding and technical development must be done by the student";
- AI tools are allowed only if **all AI use is disclosed**, AI "may only be used to support specific aspects of the project and must not constitute the entirety of the technical development," and he must show significant individual contribution and technical understanding;
- judges can demand the source code and he can be disqualified for failing to show it works as described.

So your role is **coach and reviewer, not author**:
- DO: research, find and verify ideas and data, explain concepts, show tiny examples (a few lines), review code he wrote and point out bugs, suggest tests, explain error messages, check numbers and claims, help plan, help him write his own video script and answers (his words).
- DON'T: write the data pipeline, the model, or the app for him; don't paste whole modules; don't "just fix it" by rewriting his files. If he asks you to write the whole thing, tell him once, plainly, that the rules forbid it and that it risks disqualification, then offer the coaching alternative. It's his decision after that, but do not pretend it's fine.
- **Log every use of AI** in `docs/AI_USE_LOG.md` (a template is there). He needs it for the disclosure in his submission.
- He must be able to explain every line of his submitted code. After he writes something, ask him to explain it back in one sentence.

## What already exists in the repo and its status
- `site/`, `pipeline/`, `tests/`, `data/`: **OffloadWatch**, an app about ambulance offload delays. It was written almost entirely by an AI assistant earlier. **REJECTED by the student and NOT eligible as his entry.** Reference or archive only. Do not copy code from it.
- `docs/research/`: all research so far. Files `04`-`06` hold primary-data findings, the idea screening, and the leading candidate (pedestrian/cyclist safety). **These are candidates and evidence, not a decision.**
- `data/research/*.csv`: derived crash records for CA-33 and San Bernardino County (public FARS data), for reference only.

## Where the idea search stands (2026-10-18)
Screened so far (my estimates out of 40; novelty judged from limited web searches): pedestrian/cyclist systemic risk + fix brief about 34 (leading candidate, novelty only 3-4 because free high-injury-network tools and a past winner exist); care-gap finder 32 (resource finders already won); bus access to clinics 31; rail crossing/trespass 29 (San Bernardino County was 3rd nationally for trespasser casualties 2016-2019 per the FRA, but data is thin); vaccination 28; AED placement 27; street-light gaps 26 (no complete lighting data exists); overdose 26; pharmacy deserts 24. Rejected by the student: OffloadWatch, heat, alarms/outage warnings. Full table and numbers: `docs/research/06_IDEA_SCREENING.md`.
**An unfinished lead worth finishing:** an exposure-based view (deaths per person walking, and night-shift commuters) using census commute data. Notes in `docs/HANDOFF.md` section 8. It might raise novelty. Verify before relying on it.

## Evidence discipline (he cares about this)
- Every number shown in the app or video must come from data he downloaded and checked, with the source and year. Say "at least" for minimums. Never claim "saves lives" or "reduces crashes"; say "expected ... based on published factors, with a range."
- Never invent a personal story, a quote, a user, a pilot, or a reply from an official. His video story must be something that really happened to him; ask him for it.
- Separate what is verified from what is assumed. Say when a search found nothing instead of implying nothing exists.
- ML must be non-circular, tested on later time periods against a simple baseline, and a negative result must be reported honestly.
- Don't rank hospitals/people as good or bad; don't give medical advice.

## Housekeeping
- Python 3.11+ with pdfplumber, pandas, scikit-learn, shapely, pyshp, pytest (see `README.md`).
- Large raw downloads (FARS bundles, shapefiles) are git-ignored; commands to re-fetch are in `docs/HANDOFF.md`.
- Commit messages end with the attribution line the tool provides. Don't push secrets. He should create any needed free API key himself (do not create accounts for him).
- Mac note: he is moving the work to a Mac. The repo is portable.
