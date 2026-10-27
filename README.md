# Shift Ready

**The bus stops before the shift ends. Plan around it. Then fix it.**

A free web app (English and Spanish, works on phones) that checks the real bus and train schedule for a shift or an appointment, shows where service disappears at night and on weekends, and writes a ready-to-send request for better service.

Built by **Palash Rakshit**, Redlands High School, for the **2026 Congressional App Challenge**, California's 23rd District (CA-23).

- **Live app:** https://palashraks-afk.github.io/ShiftReady/
- **How the app works and how to run it:** [`shiftready/README.md`](shiftready/README.md)
- **How AI was used (disclosure log):** [`docs/AI_USE_LOG.md`](docs/AI_USE_LOG.md)
- **All documents, grouped:** [`docs/README.md`](docs/README.md)
- **Research and evidence:** [`docs/research/`](docs/research/)

> *For AI assistants:* read [`CLAUDE.md`](CLAUDE.md) first.

## What it does
- **Plan:** enter where you start, where you work, and when your shift starts and ends. The app checks the real timetable and says Yes, Partly or No for the ride there and the ride home, with the last bus and the closest times that work.
- **Map:** shows hour by hour where bus service disappears.
- **Employers:** shows managers which shift start times their workers can reach.
- **Act:** writes a note to a boss and a request to the transit agency. Nothing is sent for you.
- **Places:** works in twelve places: CA-23 (the default), CA-33, Cleveland, Miami, Sacramento, Denver, Atlanta, Seattle, Boston, Philadelphia, Chicago and Houston.

## Privacy and security
No accounts, no analytics and no tracking. Nothing is sent to a server we run. Saved places stay in the user's browser. The weather card sends the start point, rounded to about 1 km, to Open-Meteo, and a typed street address goes to OpenStreetMap Nominatim. The page has a Content Security Policy that limits scripts and connections.

## Run it
```bash
python3 -m http.server 8765 --directory shiftready/web     # open http://localhost:8765
node shiftready/tests/planner.test.js                       # more tests are listed in shiftready/README.md
```

## What is in this repository

| Folder | What it is |
|---|---|
| `shiftready/` | **The Shift Ready app.** `web/` is the whole site (deployed to GitHub Pages), `prep/` builds the data, `regions/` configures each place, `tests/` checks it. |
| `docs/` | Documents, grouped in [`docs/README.md`](docs/README.md): submission, practice, research, build notes and archive. |
| `analysis/` | Scripts that load public crash (FARS) data. Shared by the app's data pipeline. |
| `data/` | Public data and results. Shared by the app's pipeline; also holds files from the archived OffloadWatch project. |
| `.github/workflows/` | `pages.yml` tests and deploys the app. `check-schedule.yml` checks weekly for a new bus timetable. |
| `site/`, `pipeline/`, `tests/` | **Archived.** The earlier OffloadWatch project. Not part of this entry. See [`docs/archive/OFFLOADWATCH.md`](docs/archive/OFFLOADWATCH.md). |

## Data sources
Public bus and train timetables (GTFS), Census ACS and LODES, NHTSA FARS crash data 2019-2023, OpenStreetMap, the CDPH facility list, and Open-Meteo. Limits and methods are on the app's About page and in [`docs/METHOD_NOTE.md`](docs/METHOD_NOTE.md).
