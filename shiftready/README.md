# Shift Ready

A static web app that checks the real bus schedule for a trip (a shift, an appointment), shows where service disappears at night and on weekends, and writes a ready-to-send request for better service. English and Spanish. Works for any region with a public bus schedule; built for California's 33rd District (San Bernardino area), also run on Cleveland (OH-11) and Miami (FL-24).

## Run it
```bash
python3 -m http.server 8765 --directory shiftready/web      # then open http://localhost:8765
```
Open it through a web server (not by double-clicking the file). `web/` is the whole site: deploy it with GitHub Pages.

## Rebuild the data
```bash
python3 -m venv .venv && .venv/bin/pip install pandas pyshp shapely scikit-learn osmnx geopandas pytest pdfplumber
.venv/bin/python analysis/load_fars.py                        # NHTSA FARS 2019-2023 (zips in data/raw/fars)
.venv/bin/python shiftready/prep/fetch_region.py cle          # GTFS, LODES, tracts, ACS for a region
.venv/bin/python shiftready/prep/osm.py cle                   # road network (for the walking-risk model)
.venv/bin/python shiftready/prep/run_all.py                   # transit, people, places, safety, risk model, region list
```
Add a region: copy `regions/cle.json`, change the agency GTFS URL, state/county FIPS, congressional district, FARS state/county codes and UTM zone.

## Tests
```bash
node shiftready/tests/planner.test.js     # trip planner vs real timetable trips, both directions
node shiftready/tests/crosscheck.test.js  # Python coverage tables vs the JavaScript timetable (must agree)
node shiftready/tests/ui_logic.test.js    # Yes/Partly/No verdict logic on real data
node shiftready/tests/i18n.test.js        # English/Spanish keys and placeholders
.venv/bin/python -m pytest shiftready/tests -q   # data checks
```

## How it works
- `prep/transit.py` GTFS to a compact timetable. `prep/people.py` Census ACS + LODES jobs + bus coverage by hour. `prep/places.py` boundary, job blocks, ZIPs, health sites. `prep/safety.py` deaths near stops. `prep/risk_model.py` walking-risk model tested on later years.
- `web/js/planner.js` connection-scan trip planner (forward and arrive-by). `ui-*.js` screens. `i18n.js` text.

## Limits (also shown in the app)
One bus agency per region; no rail, delays or detours; walking is straight line x 1.3; tract/block centers stand in for homes and jobs; deaths are past fatal crashes (FARS), not risk per person walking; Spanish text not yet reviewed by a native speaker.

## Data
Omnitrans / GCRTA / Miami-Dade Transit GTFS; Census ACS 5-year (via Census Reporter), LODES 2022, TIGER cartographic boundaries; NHTSA FARS 2019-2023; OpenStreetMap (ODbL); CDPH facility list (California). Leaflet, Inter typeface.
