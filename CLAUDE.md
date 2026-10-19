# Instructions for any AI assistant working in this repository

Read this file first, then `docs/HANDOFF.md`. This replaces any earlier plan you may find elsewhere in the repo.

## Who and what
- **Student:** Palash Rakshit, lives in California's 33rd Congressional District (Rep. Pete Aguilar; San Bernardino, Fontana, Rialto, Colton, Highland, Grand Terrace, north Redlands).
- **Contest:** 2026 Congressional App Challenge. **Deadline Monday 2026-10-26, 12:00 pm Eastern.** Target: submit by **Sunday 2026-10-25**.
- **How he talks:** casual, fast, many typos. Read intent through the typos. Short, plain answers. Don't lecture. Don't ask a question you can answer yourself. Say plainly when something is unverified or won't work.

## His goal, his criteria, and who it is for (his words, kept faithful)
**Goal:** find the idea that reaches the **highest overall score** on all his categories, with **at least a 4 in every category** (a secure 4-5), a **real problem with statistical evidence**, **real impact** and a solution that actually solves it. He wants a "5 idea" where possible, but a 4 everywhere is the floor.
**Novel means nobody has made it that way.** Judge novelty by searching for existing versions and say honestly what was and wasn't found. Don't inflate it; if the honest novelty is 3-4, say so and say exactly which parts are new.
**His 8 categories:** District (specific to CA-33), Impact, Novel, Works (by Oct 25), ML/biomed, Nationwide, Mapping, Challenge fit. Requirements for a 4 and a 5 are in `docs/HANDOFF.md` section 2.
**Who it should target:** it must be **helpful and make sense to regular people** (citizens, workers such as night-shift workers, ordinary residents) with a **user-friendly experience**: not just for officials. It does **not** have to be for everyone; it needs a clear target group. A city/official gets a useful brief too, but the everyday person is the main user.
**Not wanted:** heat ideas, alarm or early-warning systems, OffloadWatch, "basic" ideas, and anything that is only an official dashboard.
**Too many words is a complaint:** keep screens short, plain, and friendly. Simple by default.

## The rule that overrides everything (read it, it protects him)
The official 2026 rules (https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf) say:
- the app must be "original and solely created by the contestant. All coding and technical development must be done by the student";
- AI tools are allowed only if **all AI use is disclosed**, AI "may only be used to support specific aspects of the project and must not constitute the entirety of the technical development," and he must show significant individual contribution and technical understanding;
- judges can demand the source code and he can be disqualified for failing to show it works as described.

So your role is **coach and reviewer, not author**:
- DO: explain concepts, show tiny examples (a few lines), review code he wrote and point out bugs, suggest tests, explain error messages, check numbers and claims, help plan, help with data sources, help him write his own video script and answers (his words), find and verify facts with sources.
- DON'T: write the data pipeline, the model, or the app for him; don't paste whole modules; don't "just fix it" by rewriting his files. If he asks you to write the whole thing, tell him once, plainly, that the rules forbid it and that it risks disqualification, then offer the coaching alternative. It's his decision after that, but do not pretend it's fine.
- **Log every use of AI** in `docs/AI_USE_LOG.md` (a template is there). He needs it for the disclosure in his submission.
- He must be able to explain every line of his submitted code. After he writes something, ask him to explain it back in one sentence.

## What already exists in the repo and its status
- `site/`, `pipeline/`, `tests/`, `data/`: **OffloadWatch**, an app about ambulance offload delays. It was written almost entirely by an AI assistant earlier. **It is NOT eligible as his entry.** Keep it only as a reference or archive. Do not copy code from it into his entry unless he rewrites and understands it.
- `docs/research/`: all research so far (rules, past winners, problem candidates with evidence, primary-data findings, screening, decision). Read these.
- `data/research/*.csv`: derived crash records for CA-33 and San Bernardino County (public FARS data), for reference. He should regenerate them himself.

## The decision (as of 2026-10-18)
He rejected: OffloadWatch, heat/bus-stop ideas, alarm/early-warning products. He wants an app that is **useful and understandable to regular people** (it doesn't have to serve everyone), also useful to a city, with a real local problem backed by statistics, aiming for at least 4 of 5 in each of his 8 categories (District, Impact, Novel, Works, ML/biomed, Nationwide, Mapping, Challenge fit).

**Chosen direction:** pedestrian and cyclist safety in CA-33: find where people on foot are most at risk (including places with no death yet), explain why in plain words, and show the proven fix; with a simple resident-facing experience (plain-language map, safer-crossing/route help, Spanish) plus a one-page brief a city can use. Details, scoring, plan and pitfalls: `docs/HANDOFF.md`.

If he changes the idea, keep the rules above and the evidence discipline below.

## Evidence discipline (he cares about this)
- Every number shown in the app or video must come from data he downloaded and checked, with the source and year. Say "at least" for minimums. Never claim "saves lives" or "reduces crashes"; say "expected crashes prevented, from published crash-reduction factors, with a range."
- Never invent a personal story, a quote, a user, a pilot, or a reply from an official. His video story must be something that really happened to him; ask him for it.
- Separate what is verified from what is assumed. Say when a search found nothing instead of implying nothing exists.
- ML must be non-circular, tested on later time periods against a simple baseline, and a negative result must be reported honestly.
- Don't rank hospitals/people as good or bad; don't give medical advice.

## Housekeeping
- Python 3.11+ with pdfplumber, pandas, scikit-learn, shapely, pyshp, pytest (see `README.md`). The old test suite runs with `python -m pytest`.
- Large raw downloads (FARS bundles, shapefiles) are git-ignored; commands to re-fetch are in `docs/HANDOFF.md`.
- Commit messages end with the attribution line the tool provides. Don't push secrets. He should create any needed free API key himself (do not create accounts for him).
- Mac note: he is moving the work to a Mac. Paths in older docs use Windows style; the repo itself is portable.
