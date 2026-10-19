# AI use log (needed for the contest disclosure)

The 2026 rules require every use of AI to be fully disclosed in the submission, and AI may only support specific aspects of the project. Fill one row each time an AI assistant helps. Be exact. The student writes the core code.

| Date | Tool / model | What I asked | What the AI did (explained / reviewed / suggested / wrote N lines of ...) | What I wrote myself | Did I understand it? |
|---|---|---|---|---|---|
| 2026-10-12 to 10-18 | Claude Code (Anthropic) | Built OffloadWatch (an earlier, abandoned project) and ran research | Wrote the OffloadWatch code and research notes. **Not part of the submitted app.** | (nothing) | n/a |
| 2026-10-18 | Claude Code (Anthropic) | Student told the assistant to write the code himself (acknowledged the rules risk) | Wrote `analysis/load_fars.py` (~60 lines): loads FARS 2019-2023, filters CA pedestrian/cyclist deaths, tags CA-33 by point-in-polygon; ran it | Directed the project, chose the idea | pending: student to explain it back |
| 2026-10-18 | Claude Code (Anthropic) | Find the most novel project idea for CA-33 | Web research on existing tools; downloaded Omnitrans GTFS and computed service-hours stats (not part of any submitted app) | Chose direction | n/a |
| 2026-10-18 | Claude Code (Anthropic) | Check real numbers for the transit-access idea | Wrote `analysis/access_numbers.py` (exploratory, ~90 lines) computing CA-33 bus coverage by hour; ran it. Not a submitted app. | | pending |
| 2026-10-18 | Claude Code (Anthropic) | Student asked the assistant to build the whole project (after being told the rules require student-written code) | Wrote `analysis/load_fars.py`, `shiftready/prep/*.py` (transit, people, places, safety, risk_model, osm, fetch_region, run_all), `shiftready/web/js/planner.js` (connection-scan trip planner), `ui-plan/map/city.js`, `app.js`, `data.js`, `geocode.js`, `i18n.js` (English and Spanish text), `index.html`, `style.css`, and all tests; ran them and the analysis | Directed the idea, requirements, data choices and scope; decided to proceed | Student to review and be able to explain every part |
| 2026-10-18 | Claude Code (Anthropic) | Research for the idea and data | Web searches for existing tools, rules, data sources; downloaded and checked GTFS, LODES, ACS, FARS, OSM data; computed the statistics quoted in the app | Chose which numbers to use | Student to re-run and verify |
| 2026-10-18 | Claude Code (Anthropic) | Docs | Wrote `shiftready/README.md`, `docs/PLAN.md`, `docs/SHIFTREADY_*.md` drafts | Will edit into own words | |
| | | | | | |

## Disclosure paragraph (draft that matches the log above; the student must edit the bracketed part to say exactly what he personally did)
"I directed this project, chose the idea, the data sources and what to measure, and I am responsible for it. An AI assistant (Claude Code by Anthropic) wrote most of the code and analysis under my direction, including the data pipeline, the trip planner, the risk model and the web interface, and helped with research. I personally [describe exactly what you wrote, ran, tested and can explain]. Open-source libraries and data sources: Leaflet, OpenStreetMap, osmnx, pandas, scikit-learn, shapely, GeoPandas, pyshp, Python, JavaScript, Inter; Omnitrans, GCRTA and Miami-Dade Transit GTFS; Census ACS, LODES and TIGER; NHTSA FARS; CDPH facilities."
