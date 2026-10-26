# Add your city to Shift Ready (step by step)

This guide is for a student or a volunteer who has never touched the data pipeline. It takes about 30 to 60 minutes of work plus download time (the first state you add also downloads one big jobs file). Do it on a branch, so the live site keeps working:

```bash
git checkout -b add-mycity
```

You need: Python 3.11, Node.js, `pip install pandas shapely pyshp geopandas scikit-learn pytest`, and an internet connection. You do **not** need an API key for most cities.

## 0. Pick a place and find its numbers
Shift Ready works one **congressional district** at a time (that is what the contest and the Census files use), served by one main bus agency, plus optional extra feeds (rail, small agencies).

| Thing to find | Where | Example (Denver) |
|---|---|---|
| District | https://www.house.gov/representatives/find-your-representative, or look up your ZIP | Colorado's 1st |
| State FIPS (2 digits) | https://www.census.gov/library/reference/code-lists/ansi.html | `08` |
| County FIPS (3 digits) | same page | Denver County `031` |
| District number (2 digits) | the district list | `01` |
| Bus timetable (GTFS zip) | the agency's "developers" or "open data" page, or the catalog at https://mobilitydatabase.org (search the agency; the file `https://files.mobilitydatabase.org/feeds_v2.csv` lists direct download links) | `https://www.rtd-denver.com/files/gtfs/google_transit.zip` |
| Map projection number (UTM) | EPSG 326 + zone number; zone from longitude (`int((lon+180)/6)+1`) | Denver -105 degrees is zone 13, so `32613` |

Check the timetable link first: it must download without logging in, be a zip, and contain `stops.txt`, `stop_times.txt`, `trips.txt`, `routes.txt` and `calendar.txt`. If the agency also runs trains, find that feed too.

## 1. Write the region file
Copy a similar one: `shiftready/regions/den.json` (a non-California city) and change it:

```json
{
  "id": "den",                      // short lowercase id, becomes the data folder name
  "name": "Denver (Colorado's 1st District)",
  "short": "CO-1",                  // shown on the page: "people in CO-1 ..."
  "agency": "RTD",                  // main bus agency
  "gtfs_url": "...zip",             // timetable download
  "gtfs_dir": "data/raw/gtfs/den",  // where it is unpacked (not committed)
  "boundary": {"type": "cd119", "state_fips": "08", "cd": "01"},
  "state_fips": "08",
  "county_fips": ["031"],           // counties the district sits in (Census tracts and crash data use this)
  "lodes_state": "co",              // two letters, lowercase (Census jobs file)
  "fars_state": 8,                  // state number for the crash data (same as state_fips as a number)
  "fars_counties": [31],            // county numbers as plain numbers
  "utm": 32613,                     // map projection (metres), see above
  "center": [39.7392, -104.9903],   // map centre: latitude, longitude
  "zoom": 11,
  "label": "Denver, CO",            // what the region picker shows
  "typical_service": true           // see "Common errors"; use it when the feed lists many one-day schedules
}
```
Optional fields: `gtfs_extra` (more feeds merged in: each needs `dir`, `url`, `prefix` (like `"rl_"`, so IDs never clash), `name`, and `mode: "rail"` for trains), `agencies` (the label for several agencies), `alerts_url` and `track_url` (the agency's live pages), `scope` and `scope_es` (use these when your numbers cover only part of the district), `facilities` (California only).

## 2. Download everything
```bash
python -I shiftready/prep/fetch_region.py den
```
It downloads the timetable (and extra feeds), the Census jobs files for your state (LODES, large the first time), tract shapes, and household data. If it stops, run it again; it skips what it already has.

## 3. Build the data (in this order)
```bash
python -I shiftready/prep/transit.py den    # timetable -> web/data/den/transit.json
python -I shiftready/prep/people.py den     # who lives and works near a bus, hour by hour
python -I shiftready/prep/places.py den     # cities, ZIPs, job blocks
python -I shiftready/prep/safety.py den     # past pedestrian/cyclist deaths near each stop
```
The crash file `data/processed/ped_bike_deaths_us.csv` must exist (build it with `analysis/load_fars.py`; it needs the FARS yearly zips in `data/raw/fars/<year>/`).
The road-risk model (`prep/risk_model.py`) is optional and needs OpenStreetMap roads (`osmnx`); skip it for a first version, the app hides those layers when they are absent.

## 4. Add the region to the app
1. `shiftready/prep/build_site.py`: add the id to `ORDER` (the first one is the default region).
2. `shiftready/prep/run_all.py`: add the id to the default list.
3. Run `python -I shiftready/prep/build_site.py`.
4. In `shiftready/web/js/app.js`, the sources list names each agency (look for "SacRT schedule"): add one line for yours.

## 5. Check it (do not skip this)
- `node shiftready/tests/regions.test.js` passes, and so do the others: `for t in planner crosscheck ui_logic locate i18n pwa impact regions risk_external; do node shiftready/tests/$t.test.js; done` and `python -m pytest shiftready/tests -q`.
- Random-trip check: copy `shiftready/tests/planner.test.js` to a temporary file, change the data path from `ca33` to your id, run it, delete the copy. It compares the planner against real scheduled trips, forward and backward.
- Look at the numbers: run `python -I shiftready/prep/people.py den` and read its printout. People near a bus at noon should be much larger than at 11 PM. Compare to the agency's own "service hours" page: if the last bus really leaves at 10 PM, 11 PM must be near zero.
- Open the app (`python -m http.server --directory shiftready/web 8792`, then http://localhost:8792/?r=den). Try a plan, the Map and Employers tabs, English and Spanish, and a 375-pixel-wide window.
- Check the file size: `web/data/den/transit.json` over about 15 MB makes phones slow.

## 6. Commit
```bash
git add shiftready/regions/den.json shiftready/web/data/den shiftready/web/data/regions.json shiftready/prep shiftready/web/js
git commit -m "Add Denver"
```
Bump the `CACHE` name in `shiftready/web/sw.js` so phones fetch the new files.

## Common errors seen in this project
| Symptom | Cause and fix |
|---|---|
| `FileNotFoundError ... acs_<id>.json` | the Census Reporter file was not downloaded; run `fetch_region.py` again. The script uses a project-specific user agent because generic ones are blocked |
| Thousands of tiny schedules, huge `transit.json`, strange weekday counts | the feed lists one-day or week-by-week services; set `"typical_service": true` |
| A stop from one agency shows up as another's | two feeds reuse the same ID numbers; give each extra feed its own `prefix` |
| Map zooms out to another city | an extra feed (such as a commuter rail line) has stops far away; the map draws only stops in or near the district, but check `scope` |
| Crash `KeyError` reading fares | the agency's fare file has another layout; the reader returns no fares and the cost card hides itself |
| Download "too small" | the link needs a login or changed; find the current link on the agency page |
| Overpass HTTP 429 (road-risk step) | the free map server is rate limiting; use small areas, sleep between requests, or a mirror |
| FARS file errors | files have a hidden byte-order mark, a different layout each year and Latin-1 text; `analysis/load_fars.py` handles it |
| `no_service` for trips under about 800 m | start and end are within walking distance; the page tells the user to walk |
| Numbers look too good | check that `boundary.cd` is the district you meant and that tracts are not the whole county |
