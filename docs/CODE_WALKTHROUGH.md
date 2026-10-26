# Code walkthrough: how Shift Ready works, in the order the data flows

Written for the student who has to explain this project to judges. Read it with the files open next to it.

**What I read.** Commit `e50c579` plus the working tree on the evening of 2026-10-25 (other helpers were still editing `ui-plan.js`, `ui-city.js`, `impact.js` and `app.js` while this was written, so I re-checked their line numbers last). Line numbers are the ones I saw; if a number is a few lines off, search the file for the function name in **bold**. Every number quoted (stops, trips, 102,382 connections) was computed from the files in `shiftready/web/data/ca23/` on that day.

**Honest note on authorship.** The code in this repository was written by an AI assistant (Claude Code) under your direction, as `docs/AI_USE_LOG.md` records. This guide exists so you can understand and explain it. Do not say "I wrote" a file unless you did. Say "the assistant wrote it and I can explain it."

---

## 0. The whole thing in one picture

```
public data (bus timetables, Census jobs and people, crash records, OpenStreetMap roads)
        |  shiftready/prep/*.py   (Python, run once on a computer, "the kitchen")
        v
small JSON files in shiftready/web/data/<region>/   (transit.json, tracts.json, reach.json ...)
        |  loaded by shiftready/web/js/data.js
        v
the website (JavaScript in your browser, "the restaurant"): planner.js finds trips,
ui-plan.js turns them into Yes / Partly / No, ui-map.js draws maps, ui-city.js does the employer view
```

There is no server. The website is a folder of files (`shiftready/web`) that GitHub Pages hands to the browser. All planning happens on the visitor's own device. That is why it is free, needs no account, and still works with a bad signal after the first visit.

A "region" is one place: `ca23` (the entry district, default), `ca33`, `sac`, `cle`, `mia`, `den`, `atl`, `sea`, `bos`. Each has a config file in `shiftready/regions/<id>.json` and a data folder.

---

## Part A. The data pipeline (`shiftready/prep/`)

Run order for one region: **fetch_region, transit, people, places, safety, (osm, risk_model), build_site.** `run_all.py` does it for you.

### A1. `fetch_region.py` (67 lines)
- **One sentence:** downloads everything one region needs and skips files already downloaded.
- **How it works:** (1) reads the region file; (2) downloads the agency's timetable zip (GTFS) from `gtfs_url` and unzips it (`main`, line 39); (3) downloads Census LODES job files for the state (where people work and where they live); (4) downloads Census tract map shapes; (5) downloads Census ACS household data (cars per household) through Census Reporter; (6) uses `curl` with a project-specific user-agent because Census Reporter blocks generic ones (`get`, line 22).
- **What could go wrong:** servers change URLs, rate-limit, or return an error page that is "downloaded" but tiny (the code refuses files below a minimum size).
- **Judge Qs:** *Where does your data come from?* Public agency and federal sources, listed with links on the About page. *Can I re-run it?* Yes, one command per step; the files are not committed because they are large.

### A2. `transit.py` (158 lines)
- **One sentence:** turns the raw timetable zip into one compact file the browser can search (`web/data/<id>/transit.json`).
- **How it works:** (1) reads `routes`, `trips`, `stops`, `stop_times` (`load_feed`, line 86) and puts a prefix on every ID so several agencies can be merged without ID clashes; (2) decides which trips run on weekdays, Saturdays, Sundays: a bitmask (1, 2, 4), from `calendar.txt` (`service_masks`, line 50); (3) for feeds with many overlapping schedules (Seattle, Denver, etc.) picks the most common pattern over the next 42 days (`typical_masks`, line 15); (4) stores each trip whole: list of stops, the first time, and the gaps between stops in tenths of a minute; (5) writes the stops (name, lat, lon), routes (short name, long name, color) and trips; (6) reads fares if the agency published a fare file (`fares`, line 65).
- **What could go wrong:** two agencies using the same ID (prefixes fix this); a feed with only `calendar_dates.txt`; fares that do not apply to other operators (the app says "bus fare only, others extra" when a trip uses another operator).
- **Judge Qs:** *Why store gaps between stops instead of every time?* To keep the file small so the phone loads it quickly. *How did you combine five agencies?* Prefix every ID by agency, then treat all trips as one big timetable; walking transfers within 250 m connect them.

### A3. `people.py` (205 lines)
- **One sentence:** counts how many people and jobs are within a short walk of a bus in every hour of the day.
- **How it works:** (1) loads Census tracts inside the district and their population and cars (`load_tracts`, line 31); (2) adds job counts by tract and the warehouse-and-transport jobs (`add_jobs`, line 52); (3) for each hour of each day type, lists the stops with at least one departure in that hour, **ignoring the last stop of each trip** because nobody can board there (`stop_hours`, line 82); (4) a tract counts as "served" if its center is within `WALK_M = 400` m of such a stop (`coverage`, line 112); (5) from LODES home-work pairs, finds where the workers at each big job area live (`sheds`, line 120); (6) writes `tracts.json`, `reach.json`, `sheds.json`.
- **What could go wrong:** a tract center is a stand-in for where people actually live; a big rural tract can look "served" or "unserved" wrongly. The app says so. Rail (Metrolink) is deliberately left out of the headline because the headline says "a bus."
- **Judge Qs:** *How do you get "20% at noon, 0% at 11 PM"?* Share of population in tracts with a bus stop within 400 m that has a departure that hour. *Why 400 m?* About a 5-minute walk; `reach.json` also stores an 800 m sensitivity result so you can see how much the answer depends on that choice.

### A4. `places.py` (67 lines)
- **One sentence:** writes the map outline, ZIP and city centers, job blocks, and the health destinations (hospitals, clinics, dialysis).
- **How it works:** reads the district boundary, reads the job blocks, reads the California health facility list (CDPH), and writes `boundary.json`, `blocks.json`, `places.json`, `pois.json`, `region.json`. `region.json` carries the config the browser needs (name, agency, feed dates, links).
- **What could go wrong:** facility lists differ by state (outside California the health list is empty).
- **Judge Q:** *How does the app know where "Redlands" is offline?* `places.json` holds city and ZIP centers, so ZIPs and city names work without any internet lookup.

### A5. `safety.py` (48 lines)
- **One sentence:** counts people on foot or bike killed near each bus stop, and how many in the dark.
- **How it works:** (1) loads federal crash records (NHTSA FARS 2019-2023) for the region (`deaths`, line 19); (2) marks a death "dark" if the light code is 2, 3 or 6 (`DARK`, line 14); (3) for every stop, counts deaths within 300 m (`RADIUS_M`, line 15), and how many of those were in the dark; (4) writes `deaths.json` and `safety.json`.
- **What could go wrong:** `safety.json` is indexed by stop position. If `transit.json` is rebuilt and stops reorder, `safety.json` must be rebuilt too; a test (`test_safety_aligned_with_stops`) checks they line up.
- **Judge Qs:** *Does this prove the stop is dangerous?* No. It counts past deaths nearby; it says "past deaths," not "risk." *Where do the deaths come from?* NHTSA's FARS files; the Python test checks our counts against a fresh NHTSA download.

### A6. `osm.py` (116 lines)
- **One sentence:** downloads the road network from OpenStreetMap for the road-risk model.
- **How it works:** splits the region into tiles (`fetch`, line 56), downloads each with `curl` and retries (`tile_xml`, line 23), merges them and saves a graph file in `data/raw/osm/` (not committed).
- **What could go wrong:** the public servers refuse or rate-limit (HTTP 429); the project used smaller tiles and a mirror server for CA-23. Some downloaded roads had missing points and were dropped.

### A7. `risk_model.py` (328 lines)
- **One sentence:** learns which roads were more likely to have a person on foot killed, and tests itself on later years.
- **How it works:** (1) each road segment gets features: lanes, speed, length, bridge, intersections, signal, crossing, bus stops nearby, jobs and people nearby, road type (`FEATURES`, line 122), and **no death counts**; (2) the label is "a pedestrian or cyclist death happened here in 2019-2021"; (3) two models compete (a simple logistic regression and boosted trees) and the better one on **cross-validation of the training labels only** is chosen (lines 196-212); (4) it is tested on **2022-2023 deaths it never saw**: what share of those later deaths fall on the top 5%, 10% and 20% of road length (`capture`, line 152), with a bootstrap 95% interval (`boot_ci`, line 164); (5) it compares itself to simple baselines like "past deaths on the same road" (`evaluate`, line 179).
- **Result for CA-23 (132 test deaths):** top 20% of road length: model 86% vs 65% for the best baseline; at the top 10% it is about a tie. The test is small, so these are estimates.
- **What could go wrong:** few deaths means wide error bars; the model covers only the roads that were downloaded.
- **Judge Qs:** *Why trust it?* We fixed the design before looking at results, test on later years, and report where it only ties. *Is this machine learning?* Yes, supervised classification on road features, validated on held-out years. It is a modest model, not a prediction of any person's risk.

### A8. `risk_external.py` (185 lines)
- **One sentence:** checks the same model on a district it never saw (train on one, test on another).
- **How it works:** trains on region A's 2019-2021 deaths, scores region B's roads **without refitting**, and tests on B's 2022-2023 deaths with the same metric and baselines computed inside B (`external`, line 65). Pairs: CA-33 to CA-23, CA-23 to CA-33, Cleveland to CA-23.
- **Result, stated plainly:** it transfers between the two California districts at the top 20% of roads, loses at the top 10% for CA-33 to CA-23, and does not transfer from Ohio. The About page shows all three.
- **Judge Q:** *Did you change the test after seeing results?* The metric and years were fixed first; one label ("beats baseline") was reworded to better/partial/mixed/worse/tie after a first result looked too generous, and the AI log records that.

### A9. `employers.py` (92 lines) and the rest
- **employers.py:** reads California's EDD Major Employers list (size classes like "1,000-4,999," never exact headcounts), finds each address with OpenStreetMap's search, keeps the ones on the bus network, writes `employers.json`. Only the California regions have it.
- **build_site.py (23 lines):** writes `web/data/regions.json`, the list behind the region picker. `ORDER` (line 11) controls the order; **the first entry is the default region.**
- **run_all.py (19 lines):** runs the steps above for each region.
- **check_feed.py (56 lines):** weekly check (GitHub Action `.github/workflows/check-schedule.yml`) that compares the agency's published timetable version with the one in the app and opens an issue if it changed or is ending within 21 days. It never changes the live data by itself.
- **common.py (23 lines):** shared paths and `hms_to_min` (turns "25:10:00" into minutes after midnight; GTFS times can pass 24:00).

---

## Part B. The website (`shiftready/web/`)

### B1. `index.html` and load order
The scripts load in this order (lines 228-239): Leaflet (maps), `i18n.js` (text), `planner.js`, `data.js`, `impact.js`, `geocode.js`, `art.js`, `ui-plan.js`, `ui-map.js`, `ui-reach.js`, `ui-city.js`, `app.js`. Each file adds to one shared object `window.SR`. A Content-Security-Policy meta tag (line 7) lists the only servers the page may contact (its own files, OpenStreetMap search, Open-Meteo weather and air quality), which is a privacy and safety feature.

### B2. `data.js` (163 lines)
- **One sentence:** loads a region's JSON files, expands trips, and holds small helpers.
- **How it works:** (1) the region comes from `?r=` in the web address and defaults to `ca23` (line 5); (2) `SR.load` (line 36) fetches the required files (transit, tracts, reach, sheds, blocks, boundary, places, pois) and the optional ones (safety, risk files, employers...) and tolerates optional ones being absent (a 404 there is normal); (3) it expands each trip from "first time plus gaps" into a list of times (lines 42-46); (4) builds the planner network: `new Planner.Network(...)` (line 47); (5) helpers such as `SR.hm` (minutes to "10:30 PM", line 54), `SR.routeName` (uses the first word of the long name when a route has no short name, line 68), `SR.activeStops` (which stops have a departure each hour, line 81), `SR.employerAccess` (hours a bus runs near an employer, line 153).
- **What could go wrong:** a missing required file stops the app; the optional list must stay accurate.
- **Judge Q:** *Why JSON files and not a database?* A static site is free, fast, private, and works offline once cached.

### B3. `planner.js` (251 lines): the heart of the project
- **One sentence:** finds the best bus-and-walk trip using the real timetable, in the browser.
- **The idea, called "connection scan":** a *connection* is one hop of one bus between two neighboring stops: "leave stop X at time A, reach stop Y at time B." A trip with 94 stops is 93 connections. The planner sorts **all** connections by departure time and walks through them once, remembering for every stop "the earliest time I can be here" and for every bus trip "have I got on it yet?"
- **Constants (lines 10-14):** walking 80 m/minute; street distance is straight-line times 1.3 (`DETOUR`), because there is no street network in the browser; 1 minute to change buses; stops within 250 m count as the same place for transfers; `DAY_BIT` weekday=1, Saturday=2, Sunday=4.
- **How a trip is found, step by step (`plan`, line 166; `scan`, line 97):**
  1. Find the stops within 800 m of the start point (`near`, line 42; a grid of 0.01-degree cells makes this fast).
  2. Give each of those stops an arrival time = depart time + walking time (line 172).
  3. Walk through the sorted connections starting at the first one at or after the start time (binary search, lines 117-118).
  4. For each connection: if I have not yet boarded this bus trip and I can be at its stop in time (`arr[d] + need <= depT`, line 124, where `need` is 1 minute if I just got off another bus), **boarded**. If I am on the trip and this connection gets to a stop earlier than any way I knew, record it (lines 126-129) and also let me walk from there to nearby stops (`relax`, line 105).
  5. Stop after 6 hours of search (`t0 + 360`, line 174).
  6. Look at the stops near the destination, add the final walk, and pick the one with the earliest total time (lines 176-181).
  7. Rebuild the legs backwards from the "how I got here" notes (`legsFrom`, line 134), then add the first and last walks (lines 188-199).
- **Worked example from the real CA-23 data (computed 2026-10-25):** "Redlands to Loma Linda University Medical Center, be there by 6:00 AM." The app asks for arrival by 5:50 (10 minutes of slack, `MIN_SLACK` in `ui-plan.js` line 10). Result: walk 374 m (about 4.7 min) to *Redlands Boulevard @ 7th Street*; board **Route 19** at 5:13, ride 16 stops, get off at *Barton @ Anderson* at 5:26; walk 110 m (about 1.4 min); arrive 5:27. So you must leave at about 5:09. Behind the scenes, the weekday timetable for CA-23 has 5,713 trips, 3,705 stops, 85 routes and 102,382 connections. Route 19's trip starts at Yucaipa Transit Center at 4:52 (its first connection row: departs stop 527 at minute 292, arrives stop 528 at minute 292.5). The scan reaches the Redlands Boulevard connection, sees you can be at the stop by 5:13, "boards," and records the best arrival at each later stop until Barton @ Anderson.
- **"Arrive by" runs time backwards (`connections`, line 67; `plan`, lines 168-174, 183-187):** the same scan is run on a mirrored timetable in which times are negative and each hop goes the other way (lines 79-80). Starting from the destination at "minus the deadline," it finds the **latest** time you can leave. Then (lines 205-209) a normal forward search from that time is run to get the most direct version of the trip.
- **Past-midnight trips (line 76):** every hop is also added shifted back by 1,440 minutes, so a bus that started yesterday and runs after midnight appears at the right time today.
- **Why the tie-break on line 86-87 matters (zero-dwell stops):** some trips have two consecutive stops at the same minute (for example times 841, 843, 843, 844). If hops with the same time are processed in the wrong order, a stop can be "reached" before the hop that gets you there is looked at, and a real trip is missed. This showed up as one failing case in a random test on Sacramento's data. The fix sorts equal times by position along the trip (`seq`, forward and reversed).
- **What could go wrong:** walking time is an estimate (no street network); it uses the published timetable, not live positions; very short trips (start and end within 800 m) are reported as "walk it" by `ui-plan.js` (`why.walk_only`).
- **Judge Qs:** *Why not Google's API?* It does not know shift end times, the ride home, or the last bus; and running it in the browser keeps people's trips private. *How do you know it is right?* `tests/planner.test.js` compares it with real scheduled trips (below). *What is the complexity?* One pass over about 100,000 sorted connections, so it runs in milliseconds.

### B4. `ui-plan.js` (644 lines): from trip to Yes / Partly / No
- **One sentence:** takes the form, runs the planner for the trip and the ride home, and decides what to tell the person.
- **Rules and numbers (lines 9-11):** `MAX_WALK_OK = 1200` m of walking; `MIN_SLACK = 10` minutes to spare; `MAX_TRIP = 90` minutes door to door.
- **How it works:**
  1. `planMain` (line 274): for "be there by T," it first asks for a bus that arrives 10 minutes early. If none exists, it accepts one that arrives on time but marks it "tight."
  2. `compute` (line 282): runs `planMain`; computes the **backup bus** (the next trip leaving 0.5 minutes after the first bus, line 288); if the person wants the ride home, plans from work to home from the shift end time (a shift that ends earlier on the clock than it starts is assumed to finish the next morning, lines 291-296), and the **last bus** that gets home before 6 AM next day (line 300); then builds the verdict and, if not a clean Yes, finds alternatives.
  3. `verdict` (line 307): "No" if no trip, or the first bus is more than 90 minutes after you want to leave. Otherwise "Partly" if any of: tight, more than 90 minutes early, more than 1,200 m of walking, more than 90 minutes door to door, 3 or more bus boardings, no ride home, or a long walk home. Otherwise "Yes." Every reason is shown in words.
  4. `findAlternatives` (line 335): tries 15, 30, ... 240 minutes earlier and later and shows the nearest ones that give a clean result (and a ride home, if wanted).
  5. `render` (line 458): shows the verdict, the weather row, the trip line (leave, arrive), the map, the legs, the "if you miss it" backup, the ride home, alternatives, the hour-by-hour strip (`stripData`, line 559), cost, help and health sections, and the buttons.
  6. `bossText` (line 540): writes a short, factual note from the plan: the bus you can catch and when you arrive, the bus home (or that none exists), or the closest time that works. It only uses numbers the plan computed.
- **What could go wrong:** thresholds are judgment calls, written down in one place so anyone can change them; verdicts depend on the published timetable, not delays.
- **Judge Qs:** *Why those thresholds?* They are simple, adjustable choices (about 15 minutes of walking, an hour and a half of travel, no more than two transfers); the reasons are always shown so a person can disagree. *What if the bus is late?* The app says it cannot see delays, shows the next bus, and links to the agency's live alerts.

### B5. `ui-map.js` (443 lines)
- **One sentence:** draws the district map and the small trip map.
- **How it works:** (1) `SR.initMap` (line 28) builds the large map once, with the district outline, stop dots and shapes; only stops in or near the district are drawn so far-away train stops do not zoom the map out to Los Angeles; (2) `update` (line 177) is called when the hour slider moves: it restyles existing shapes instead of rebuilding them (stops on or off, neighborhoods teal / amber "had a bus at noon, none now" / dashed red "never"), which keeps "play the day" smooth; (3) `drawTrip` (line 350) draws one plan: each bus leg in its route color with a white outline, dashed walks, numbered boarding pins, A and B pins, and the ride home as a dashed layer; (4) `SR.renderTripMap` (line 385) puts that in the small map inside the Plan result and still works with no map pictures (the lines need no tiles); (5) `SR.showPlanOnMap` (line 409) shows the same trip on the large map; (6) popups list the next departures (`nextDeparts`, line 331).
- **What could go wrong:** map tiles come from OpenStreetMap and may fail offline (the app says so and keeps drawing lines).
- **Judge Q:** *How does it stay fast with thousands of stops?* Layers are created once and only restyled; canvas drawing is used.

### B6. `ui-reach.js` (139 lines)
- **One sentence:** from one spot, shows how far you can get by bus in 30, 45, 60 or 90 minutes at an hour you pick.
- **How:** calls `Planner.earliestArrivals` (planner.js line 214), which runs the same scan from the spot and returns the earliest time you can be at every stop, then shades the reachable stops and counts reachable jobs.

### B7. `ui-city.js` (558 lines): the Employers tab
- **One sentence:** answers "which shift start times can your workers reach by bus?" and what to do about it.
- **How:** (1) `fitCompute` (line 63) takes a job area and, for every start time from 3:00 AM to 11:30 PM in 30-minute steps, runs `Planner.latestDepartures` from the workplace backwards and counts what share of the workers who live in the county (from the Census home-work file) can get there (`canReachFrom`, planner.js line 229); (2) `renderDecision` (line 110) shows the best start time and early / afternoon / night results; (3) `renderActions` (line 257) lists concrete actions tied to those numbers; (4) `whatIf` (line 378) estimates how many more people, jobs and warehouse jobs would be near a bus if a route ran later, hour by hour, and `impact.js` turns the vehicle-hours into a yearly cost; (5) `kmeans` (line 77, used by `renderVan`, line 484) clusters where workers live into four pickup zones for a vanpool; (6) `printBrief` (line 502) makes the one-page brief for an agency.
- **What could go wrong:** answers are per job area (the Census tract nearest an employer), not per employer; the what-if cost model is Omnitrans' (about $141 per vehicle-hour from the FTA National Transit Database, 2022).
- **Judge Q:** *Is the cost estimate an official number?* No; it is a transparent estimate with its source and year shown.

### B8. `impact.js` (205 lines)
- **One sentence:** adds weather, health facts, the cost line, a live-check card and holiday notes.
- **How:** `loadConditions` (line 160) asks Open-Meteo (a free service, no key) for feels-like temperature, UV and air quality **at the stop where you board and the hour you board**, rounding the location to about 1 km; categories follow published bands (NWS heat, EPA air, WHO UV: `heatCategory` line 20, `aqiCategory` 28, `uvCategory` 36). `healthHtml` (line 69) shows sleep, drowsy-driving and injury facts only for night or non-Yes trips. `liveHtml` (line 125) links the agency's live alerts and warns when the timetable is ending (`feedStatus`, line 86) or a federal holiday is near (`holidayNote`, line 120). `costLine` (line 149) turns vehicle-hours into dollars per year.
- **What could go wrong:** the forecast may be unavailable (the app then says so); health numbers are from cited studies and must keep their sources and limits.
- **Judge Q:** *Do you collect users' locations?* No account, no analytics; the weather request carries only a rounded coordinate.

### B9. `i18n.js` (798 lines) and `app.js` (359 lines)
- **i18n.js:** one big object `window.SR.STR = { en: {...}, es: {...} }` (line 3). `SR.t("why.walk", {m: 1500})` (`app.js` line 9) looks up the key in the current language, falls back to English, and fills `{m}`. The Spanish has not been reviewed by a native speaker.
- **app.js:** `SR.showTab` (line 32) switches tabs; the About page is built from `problemHtml` (45), `evidenceHtml` (79), `dataHtml` (94), `checksHtml` (117), `renderAbout` (121); `fillFindings` (205) and `modelHtml` (227), `externalHtml` (267) show the model results; `SR.setLang` (line 302) switches language and redraws; `start` (line 323) loads the region and registers the service worker.
- **Judge Q:** *How do you keep English and Spanish in sync?* `tests/i18n.test.js` fails if any key used in code is missing in either language or placeholders differ.

### B10. `geocode.js` (117 lines)
Turns what a person types into a point. ZIPs and city names come from `places.json` (offline); street addresses use OpenStreetMap's Nominatim from the visitor's browser (disclosed on About). `SR.pickNearest` (line 9) chooses, among several matches, the one closest to the region so a namesake in another city is not chosen. `SR.regionCheck` (line 92) tells people when their location is outside the current region and suggests another.

### B11. `sw.js` (24 lines): the service worker
Stores the app's files when first opened so a checked trip can be rechecked offline. Code files are fetched fresh when online so updates show immediately; data files use the stored copy first; map pictures are never stored. `CACHE` (line 4) is a version name; **bump it whenever shipped files change** or visitors may keep old files. `tests/pwa.test.js` checks every file in the list exists.

---

## Part C. The tests (what each proves)

| Test | What it proves | How to run |
|---|---|---|
| `tests/planner.test.js` (56 lines) | The planner never does worse than just riding a real scheduled trip, forward and backward, on hundreds of random real trips; no service at 2 AM; a far-away start is reported; latest-departure sanity. | `node shiftready/tests/planner.test.js` |
| `tests/crosscheck.test.js` (19) | Two independent implementations agree: the Python coverage tables vs the JavaScript planner (at least 99% of 720 checks). | `node shiftready/tests/crosscheck.test.js` |
| `tests/ui_logic.test.js` (36) | The verdict logic on real data: daytime plan has at least 10 minutes of slack; 2 AM is not a Yes; ride home is computed for the next morning after a night shift; alternatives are real plans. | `node shiftready/tests/ui_logic.test.js` |
| `tests/locate.test.js` (65) | "Use my location" in every outcome, using a stand-in for the browser's geolocation. | `node shiftready/tests/locate.test.js` |
| `tests/i18n.test.js` (27) | Every text key exists in English and Spanish with matching placeholders. | `node shiftready/tests/i18n.test.js` |
| `tests/pwa.test.js` (27) | The site is installable and deployable: files, manifest, icons, service-worker list. | `node shiftready/tests/pwa.test.js` |
| `tests/impact.test.js` (18) | Heat, air quality and UV bands, day matching, cost math, feed-expiry logic. | `node shiftready/tests/impact.test.js` |
| `tests/regions.test.js` (23) | Every region in the picker has its data; the default is first. | `node shiftready/tests/regions.test.js` |
| `tests/risk_external.test.js` (28) | The external-validation files have the right shape and sane numbers. | `node shiftready/tests/risk_external.test.js` |
| `tests/test_data.py` (98) | Built data matches the sources: timetable vs the original GTFS, FARS counts vs an NHTSA download, headline numbers stable, safety file aligned with stops. | `python -m pytest shiftready/tests -q` |

All of them run automatically on every push (`.github/workflows/pages.yml`), and the site is only published if they pass.

**Judge Q:** *Show me a test.* Open `tests/planner.test.js`, go to the "300 random real trips" block, and explain: pick a real bus trip, ask the planner for the same journey, require that it arrives no later than the bus itself; both directions.

---

## Part D. Five things you can say about the code in your own words
1. "Everything runs in your browser: no server, no account, nothing about your trip leaves your phone except the optional address lookup and the rounded weather lookup."
2. "A timetable is just thousands of hops between stops. I sort them by time and scan once, remembering the earliest I can be at each stop. 'Arrive by' is the same scan run backwards in time."
3. "The verdict is a short list of rules with numbers written in one place, and the app always shows which rule fired."
4. "Every number has a test or a source: the planner is checked against real trips, the coverage numbers against an independent Python calculation, the crash counts against the federal download."
5. "The model is modest and I report where it only ties. I checked it on years and a district it never saw."
