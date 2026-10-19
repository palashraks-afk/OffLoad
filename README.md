> **STOP: read `CLAUDE.md` first.** OffloadWatch (below) is an **abandoned, rejected project** written by an AI assistant. It is **not** the student's contest entry and must not be continued or submitted. **No new project has been chosen yet; the student is still finding one.** Do not build anything until he picks.

# OffloadWatch (abandoned; reference only)

Shows where ambulances get stuck waiting at hospitals ("offload" delays) and how that changed month to month, so residents, officials and EMS crews can see the problem. Built for the Congressional App Challenge, around California's 33rd District (San Bernardino, Fontana, Rialto, Colton, Highland, Grand Terrace, north Redlands).

- **Residents**: type an address, city or ZIP, see nearby hospitals and how crowded ambulance handoffs were, a 911 notice on every screen, nearby community health centers. English and Spanish.
- **Officials**: a one-page printable district report card with lower-bound ambulance-hours and a what-if slider ([sample PDF](docs/sample-report-card-CA-33.pdf)).
- **Analysts**: a next-month outlook tested against baselines, CSV downloads, a methods page.

It is a static site. No server, no accounts, no analytics. Open `site/index.html` directly, or serve the `site/` folder (a GitHub Pages workflow is included).

## What the data can and cannot say (read this first)

- Source: California EMS Authority (EMSA) monthly APOT exceedance reports, **September 2025 to February 2026 data** (the newest report found at build time was posted 2026-03-23).
- EMSA lists **only hospitals whose 90th-percentile offload time was above their local target, with at least 60 handoffs**. A hospital missing from a month met the target, had too few handoffs, or did not report. The report does not say which, so the app shows it as gray **Not listed**, never as doing well. Consequence: every listed hospital is below 90% on target, so the "green" band can never appear for a listed hospital.
- The headline number is a **lower bound**: `hours = 0.10 x N x (P90 - S) / 60` (see `pipeline/metrics.py`; tests reproduce the plan's worked examples, 20.2 / 16.5 / 13.9 / 4.2 hours).
- Offload time measures crowding, not quality of care. The app never ranks hospitals as good or poor and never tells anyone where to go.
- **The forecast does not beat the simple baseline** on the held-out months (ridge MAE 9.0 min vs 6.2 for "same as this month"). The app says so on the Forecast page. With six months of data, seasons and outside drivers (virus, heat) are not modelled.
- District membership uses the Census 119th-Congress boundary. **Redlands Community Hospital and Loma Linda University Medical Center are in CA-23, not CA-33.** Only Community Hospital of San Bernardino, St. Bernardine and Arrowhead (not listed in any report) are inside CA-33. The report card lists hospitals within about 6 miles of the boundary separately.
- Hospital map locations come from the CDPH facility list, matched by name inside the agency's county. Matches that were not clearly the same hospital are left unplaced (see the `unplaced` rows of `data/config/hospital_crosswalk.csv`) rather than guessed.

## What people can do with it

- **Look**: a map with filters (by crowding) and a health-center layer; hospital pages with trends; a statewide view by EMS agency and congressional district; Simple and Pro modes; English and Spanish.
- **Change things**: a scenario tool (set a handoff-time limit and your own cost per ambulance-hour to see ambulance-hours, ambulance-equivalents and dollars), filters and sorting, CSV downloads.
- **Route**: non-emergency drive times and a route line from your search to nearby hospitals (OpenStreetMap routing, only when you tap it), plus a Directions link.
- **Act**: an editable message to a representative or EMS agency that cites the numbers (copy, email, or share; nothing is sent for you). EMSA already tells listed hospitals to carry out an offload-reduction plan, so the message asks how it is working.
- **Stay current**: a scheduled GitHub Action checks for new EMSA reports three times a month, rebuilds, runs the tests, and commits only if they pass; a failure opens an issue instead of changing the published data. The app labels itself out of date when the newest report is more than 45 days old.

See `docs/IMPACT.md` for what this can and cannot honestly claim, and `docs/OUTREACH.md` for send-ready drafts.

## Simple and Pro modes

A switch in the header flips between **Simple** (default: few words, big buttons, "Use my location", bottom tab bar on phones) and **Pro** (full tables, exact figures, lower-bound hours, what-if slider, an Assessment block per hospital and district, compare view, methods, downloads). The choice is saved only in the visitor's browser. A link can force a mode, e.g. `#/district/CA-33?mode=pro` (used for the printable report card).

## Design rules

One typeface (Inter, two weights), one accent color, greys for everything else. Red/amber/green appear only as crowding data colors (always with a shape and a word) and red for the 911 notice. One animation (a short fade when a screen appears, off for reduced-motion). Mobile-first. Every list has a real empty state with a next step.

## Run it

```bash
pip install pdfplumber pandas scikit-learn shapely pyshp pytest
python pipeline/fetch.py     # download PDFs and geo files into data/raw (once)
python pipeline/run.py       # extract -> metrics -> districts -> forecast -> site/data/bundle.js
python -m pytest             # parser, formulas, bands, districts
python -m http.server --directory site 8000
```

To add a month: drop the new EMSA PDF into `data/raw/CA/` and re-run `python pipeline/run.py`. The extractor reads the data month from inside each PDF (EMSA's file names are offset by a month) and handles the three table layouts seen so far. It reports unparsed rows instead of silently dropping them.

## Layout

```
pipeline/   extract.py (PDF->table)  geocode.py (hospital->coordinates)  metrics.py
            build.py (districts, JSON)  forecast.py (baselines + model)  bundle.py  run.py  fetch.py
data/       raw/ (PDFs, source CSVs)  processed/ (JSON, CSV)  config/ (CA.json, hospital_crosswalk.csv)
site/       index.html  app.js  css/  i18n/en.json es.json  vendor/ (Leaflet)  data/ (what the site loads)
tests/      pytest
docs/       SUBMISSION_NOTES.md, sample report card
```

## Credits and notes

Data: California EMS Authority, California Department of Public Health facility list, U.S. Census Bureau boundaries and ZCTA gazetteer. Typeface: Inter (SIL Open Font License), bundled. Map: Leaflet, OpenStreetMap contributors (tiles load only online; markers and the district outline work offline). Street-address lookup uses OpenStreetMap Nominatim from the visitor's browser (disclosed on the Methods page); ZIP and city lookups are bundled.

The Spanish translation has **not** been reviewed by a native speaker yet. This project was built with an AI coding assistant (Claude Code); check the contest rulebook's rules on AI-assisted code.
